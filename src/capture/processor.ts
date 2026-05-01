import {App, FileManager, MetadataCache, Notice, TFile, TFolder, Vault} from "obsidian";
import {generateFilename, generateTimestamp, isIncubated, makeUniqueFilename} from "../utils/dates";
import {getArchiveDestination, safePath} from "../utils/paths";
import {generateFleetingNoteContent} from "./template";
import {AgentLuhmannSettings} from "../settings";
import {AiApiClient} from "../api/client";
import {CaptureResponse} from "../api/types";
import {getAiStatus, setAiStatus} from "./ai-status";
import {AiFirstPassModal} from "./ai-first-pass-modal";

export interface NoteStatus {
	status: string | null;
	capturedAt: string | null;
	surpriseScore: number | null;
}

export class CaptureProcessor {
	app: App;
	vault: Vault;
	fileManager: FileManager;
	metadataCache: MetadataCache;
	settings: AgentLuhmannSettings;
	client: AiApiClient;
	debugLog: (...args: unknown[]) => void;

	constructor(app: App, vault: Vault, fileManager: FileManager, metadataCache: MetadataCache, settings: AgentLuhmannSettings, client: AiApiClient) {
		this.app = app;
		this.vault = vault;
		this.fileManager = fileManager;
		this.metadataCache = metadataCache;
		this.settings = settings;
		this.client = client;
		this.debugLog = settings.enableDebugLogging ? console.log : () => {};
	}

	async createFleetingNote(content: string): Promise<TFile | null> {
		const inboxPath = safePath(this.settings.inboxPath);
		const folder = this.vault.getAbstractFileByPath(inboxPath);
		if (!folder || !(folder instanceof TFolder)) {
			new Notice("Inbox folder does not exist. Check settings.");
			return null;
		}

		const timestamp = generateTimestamp();
		const baseName = generateFilename();
		const fullPath = makeUniqueFilename(
			(name: string) => !!this.vault.getAbstractFileByPath(`${inboxPath}/${name}`),
			baseName
		);

		const noteContent = generateFleetingNoteContent(content, timestamp);
		const filePath = `${inboxPath}/${fullPath}`;
		const file = await this.vault.create(filePath, noteContent);
		new Notice("Fleeting note captured");
		this.debugLog("Created fleeting note:", filePath);

		if (this.settings.aiEnabled && this.settings.autoAiFirstPass && this.client.isConfigured()) {
			this.triggerAiFirstPass(file);
		} else if (this.settings.aiEnabled && this.settings.autoAiFirstPass && !this.client.isConfigured()) {
			new Notice("AI first pass skipped — configure API URL and sign in first");
		}

		return file;
	}

	async triggerAiFirstPass(file: TFile): Promise<void> {
		try {
			await setAiStatus(this.fileManager, file, "pending");
			new Notice("AI first pass started...");

			const rawContent = await this.vault.read(file);
			const body = rawContent.replace(/^---[\s\S]*?---\n*/, "").trim();

			const result = await this.client.capture(body);

			if (result) {
				await setAiStatus(this.fileManager, file, "done", result.similarityScore, "cloudflare");
				new Notice("AI first pass complete");
				this.debugLog("AI first pass complete for:", file.path);
			} else {
				await setAiStatus(this.fileManager, file, "failed");
				new Notice("AI first pass failed — check API URL and sign-in status");
			}
		} catch {
			await setAiStatus(this.fileManager, file, "failed");
			new Notice("AI first pass failed — check API URL and sign-in status");
		}
	}

	async openAiFirstPassModal(file: TFile): Promise<void> {
		const rawContent = await this.vault.read(file);
		const body = rawContent.replace(/^---[\s\S]*?---\n*/, "").trim();

		const result = await this.client.capture(body);
		if (!result) {
			new Notice("Failed to get AI first pass result");
			return;
		}

		new AiFirstPassModal(
			this.app,
			file,
			body,
			result,
			this.client,
			async (decision, rewrittenContent) => {
				await this.applyAiDecision(file, decision, rewrittenContent, result);
			}
		).open();
	}

	async applyAiDecision(file: TFile, decision: string, rewrittenContent: string, captureResponse: CaptureResponse): Promise<void> {
		if (decision === "keep") {
			await this.vault.process(file, (data) => {
				const body = data.replace(/^---[\s\S]*?---\n*/, "").trim();
				const fmMatch = data.match(/^---[\s\S]*?---\n*/);
				const fm = fmMatch ? fmMatch[0] : "";
				return `${fm}${body}\n\n## AI first pass\n\n${rewrittenContent}\n`;
			});
			await setAiStatus(this.fileManager, file, "done", captureResponse.similarityScore, "cloudflare");
			new Notice("AI rewrite appended to note");
		} else if (decision === "replace") {
			await this.vault.process(file, (data) => {
				const fmMatch = data.match(/^---[\s\S]*?---\n*/);
				const fm = fmMatch ? fmMatch[0] : "";
				return `${fm}${rewrittenContent}\n`;
			});
			await setAiStatus(this.fileManager, file, "done", captureResponse.similarityScore, "cloudflare");
			new Notice("Note replaced with AI rewrite");
		} else if (decision === "remove") {
			await setAiStatus(this.fileManager, file, "removed");
			new Notice("AI rewrite discarded");
		}
	}

	async promoteToZettel(file: TFile): Promise<void> {
		const status = this.getNoteStatus(file);
		if (status.status !== "needs-processing" && status.status !== "captured") {
			new Notice("Note must be in 'needs-processing' or 'captured' status to promote");
			return;
		}

		await this.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter.status = "zettel";
		});

		const zettelsPath = safePath(this.settings.zettelsPath);
		const existingFolder = this.vault.getAbstractFileByPath(zettelsPath);
		if (!existingFolder) {
			await this.vault.createFolder(zettelsPath);
		}

		const destPath = `${zettelsPath}/${file.name}`;
		await this.fileManager.renameFile(file, destPath);
		this.debugLog("Promoted to zettel:", destPath);

		if (this.client.isConfigured()) {
			try {
				const movedFile = this.vault.getAbstractFileByPath(destPath);
				if (movedFile instanceof TFile) {
					const rawContent = await this.vault.read(movedFile);
					const body = rawContent.replace(/^---[\s\S]*?---\n*/, "").trim();
					await this.client.syncNotes({
						notes: [{id: movedFile.path, path: movedFile.path, content: body}],
					});
				}
			} catch {
				this.debugLog("Failed to sync zettel to vector store:", destPath);
			}
		}

		new Notice("Promoted to zettel");
	}

	async demoteFromZettel(file: TFile): Promise<void> {
		await this.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter.status = "archived";
		});

		if (this.client.isConfigured()) {
			try {
				await this.client.deleteNote(file.path);
			} catch {
				this.debugLog("Failed to delete from vector store:", file.path);
			}
		}

		await this.archiveNote(file);
		new Notice("Demoted and archived");
	}

	getNoteStatus(file: TFile): NoteStatus {
		const cache = this.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter;
		return {
			status: typeof fm?.status === "string" ? fm.status : null,
			capturedAt: typeof fm?.captured_at === "string" ? fm.captured_at : null,
			surpriseScore: typeof fm?.surprise_score === "number" ? fm.surprise_score : null,
		};
	}

	isNoteIncubated(file: TFile): boolean {
		const {capturedAt} = this.getNoteStatus(file);
		if (!capturedAt) {
			return true;
		}
		return isIncubated(capturedAt, this.settings.incubationHours);
	}

	getNotesNeedingReview(): TFile[] {
		const inboxPath = safePath(this.settings.inboxPath);
		const folder = this.vault.getAbstractFileByPath(inboxPath);
		if (!folder || !(folder instanceof TFolder)) {
			return [];
		}

		const result: TFile[] = [];
		for (const child of folder.children) {
			if (child instanceof TFile && child.extension === "md") {
				const status = this.getNoteStatus(child);
				if (status.status === "captured" && this.isNoteIncubated(child)) {
					result.push(child);
				}
			}
		}
		return result;
	}

	async applySurpriseRating(file: TFile, score: number): Promise<void> {
		const {surpriseThreshold} = this.settings;
		const shouldArchive = score <= surpriseThreshold;

		await this.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter.surprise_score = score;
			frontmatter.status = shouldArchive ? "archived" : "needs-processing";
			if (shouldArchive) {
				const existingTags = frontmatter.tags || [];
				if (!Array.isArray(existingTags)) {
					frontmatter.tags = ["low-surprise"];
				} else if (!existingTags.includes("low-surprise")) {
					existingTags.push("low-surprise");
				}
			} else {
				const existingTags = frontmatter.tags || [];
				if (Array.isArray(existingTags) && !existingTags.includes("process")) {
					existingTags.push("process");
				}
			}
		});

		if (shouldArchive) {
			await this.archiveNote(file);
			new Notice(`Note archived (surprise ${score})`);
		} else {
			new Notice(`Note marked for processing (surprise ${score})`);
		}
	}

	async archiveNote(file: TFile): Promise<void> {
		const destPath = getArchiveDestination(file.path, this.settings.inboxPath, this.settings.archivePath);
		const archiveFolder = safePath(this.settings.archivePath);
		const existingFolder = this.vault.getAbstractFileByPath(archiveFolder);
		if (!existingFolder) {
			await this.vault.createFolder(archiveFolder);
		}
		await this.fileManager.renameFile(file, destPath);
		this.debugLog("Archived note to:", destPath);
	}
}

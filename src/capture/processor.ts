import {FileManager, MetadataCache, Notice, TFile, TFolder, Vault} from "obsidian";
import {generateFilename, generateTimestamp, isIncubated, makeUniqueFilename} from "../utils/dates";
import {getArchiveDestination, safePath} from "../utils/paths";
import {generateFleetingNoteContent} from "./template";
import {AgentLuhmannSettings} from "../settings";

export interface NoteStatus {
	status: string | null;
	capturedAt: string | null;
	surpriseScore: number | null;
}

export class CaptureProcessor {
	vault: Vault;
	fileManager: FileManager;
	metadataCache: MetadataCache;
	settings: AgentLuhmannSettings;
	debugLog: (...args: unknown[]) => void;

	constructor(vault: Vault, fileManager: FileManager, metadataCache: MetadataCache, settings: AgentLuhmannSettings) {
		this.vault = vault;
		this.fileManager = fileManager;
		this.metadataCache = metadataCache;
		this.settings = settings;
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
		return file;
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
		const {surpriseThreshold, archivePath, inboxPath} = this.settings;
		const shouldArchive = score <= surpriseThreshold;

		// Update frontmatter first
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
		// Ensure archive folder exists
		const archiveFolder = safePath(this.settings.archivePath);
		const existingFolder = this.vault.getAbstractFileByPath(archiveFolder);
		if (!existingFolder) {
			await this.vault.createFolder(archiveFolder);
		}
		await this.fileManager.renameFile(file, destPath);
		this.debugLog("Archived note to:", destPath);
	}
}

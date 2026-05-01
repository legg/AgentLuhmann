import {App, FuzzySuggestModal, Notice, TFile} from "obsidian";
import {CaptureProcessor} from "./processor";
import {CaptureModal} from "./capture-modal";
import {SurpriseRatingModal} from "./surprise-modal";
import {AiFirstPassModal} from "./ai-first-pass-modal";
import {isInInbox} from "../utils/paths";
import {AuthModal} from "../ui/auth-modal";
import AgentLuhmannPlugin from "../main";
import {syncVectorStore} from "../vector-store/sync";
import {getAiStatus} from "./ai-status";
import {CaptureResponse} from "../api/types";

/**
 * Opens the AI first pass modal if AI data is available (from frontmatter or fresh API call),
 * followed by the surprise rating modal. Falls back to surprise rating only if AI is unavailable.
 */
async function openReviewFlow(app: App, plugin: AgentLuhmannPlugin, processor: CaptureProcessor, file: TFile): Promise<void> {
	const cache = app.metadataCache.getFileCache(file);
	const aiStatus = getAiStatus(cache);

	const openSurpriseModal = (similarityScore: number | null) => {
		new SurpriseRatingModal(app, file, async (score) => {
			await processor.applySurpriseRating(file, score);
		}, similarityScore).open();
	};

	const openAiModal = (body: string, result: CaptureResponse) => {
		new AiFirstPassModal(
			app,
			file,
			body,
			result,
			processor.client,
			async (decision, rewrittenContent) => {
				await processor.applyAiDecision(file, decision, rewrittenContent, result);
				openSurpriseModal(result.similarityScore);
			}
		).open();
	};

	if (plugin.settings.aiEnabled && processor.client.isConfigured()) {
		const rawContent = await app.vault.read(file);
		const body = rawContent.replace(/^---[\s\S]*?---\n*/, "").trim();

		if (aiStatus.firstPass === "done" && aiStatus.aiRewrittenContent) {
			// Use stored AI data — no API call
			const storedResult: CaptureResponse = {
				rewrittenContent: aiStatus.aiRewrittenContent ?? "",
				title: aiStatus.aiTitle ?? "",
				keywords: aiStatus.aiKeywords ?? [],
				similarityScore: aiStatus.similarityScore ?? 0,
				similarNotes: [],
			};
			openAiModal(body, storedResult);
			return;
		}

		// Fetch fresh AI result
		try {
			const result = await processor.client.capture(body);
			if (result) {
				openAiModal(body, result);
				return;
			}
		} catch {
			// fall through to surprise modal
		}
	}

	openSurpriseModal(aiStatus.similarityScore);
}

class InboxNoteSuggestModal extends FuzzySuggestModal<TFile> {
	plugin: AgentLuhmannPlugin;
	processor: CaptureProcessor;

	constructor(app: App, plugin: AgentLuhmannPlugin, processor: CaptureProcessor) {
		super(app);
		this.plugin = plugin;
		this.processor = processor;
		this.setPlaceholder("Select an inbox note to rate...");
		this.setInstructions([
			{command: "↑↓", purpose: "to navigate"},
			{command: "↵", purpose: "to select"},
			{command: "esc", purpose: "to dismiss"},
		]);
	}

	getItems(): TFile[] {
		return this.processor.getNotesNeedingReview();
	}

	getItemText(item: TFile): string {
		return item.basename;
	}

	onChooseItem(item: TFile): void {
		openReviewFlow(this.app, this.plugin, this.processor, item);
	}
}

export function registerCaptureCommands(plugin: AgentLuhmannPlugin, processor: CaptureProcessor): void {
	plugin.addCommand({
		id: "capture-fleeting-note",
		name: "Capture fleeting note",
		callback: () => {
			new CaptureModal(plugin.app, processor).open();
		},
	});

	plugin.addCommand({
		id: "process-inbox",
		name: "Process inbox",
		callback: () => {
			const notes = processor.getNotesNeedingReview();
			if (notes.length === 0) {
				new Notice("No notes need review right now.");
				return;
			}
			new InboxNoteSuggestModal(plugin.app, plugin, processor).open();
		},
	});

	plugin.addCommand({
		id: "rate-surprise-current",
		name: "Rate surprise for current note",
		checkCallback: (checking: boolean) => {
			const activeFile = plugin.app.workspace.getActiveFile();
			if (!activeFile) {
				return false;
			}
			if (!isInInbox(activeFile.path, processor.settings.inboxPath)) {
				return false;
			}
			if (!processor.isNoteIncubated(activeFile)) {
				return false;
			}
			const status = processor.getNoteStatus(activeFile);
			if (status.status !== "captured") {
				return false;
			}
			if (!checking) {
				openReviewFlow(plugin.app, plugin, processor, activeFile);
			}
			return true;
		},
	});

	plugin.addCommand({
		id: "sign-in-ai",
		name: "Sign in to AI",
		callback: () => {
			plugin.openAuthModal();
		},
	});

	plugin.addCommand({
		id: "sign-out-ai",
		name: "Sign out of AI",
		callback: () => {
			plugin.settings.authToken = "";
			plugin.settings.isAuthenticated = false;
			plugin.settings.userEmail = "";
			plugin.saveSettings();
			new Notice("Signed out of AI");
		},
	});

	plugin.addCommand({
		id: "sync-vector-store",
		name: "Sync vector store",
		callback: () => {
			syncVectorStore(plugin.app.vault, plugin.app.metadataCache, processor.client, plugin.settings.zettelsPath);
		},
	});

	plugin.addCommand({
		id: "promote-to-zettel",
		name: "Promote to zettel",
		checkCallback: (checking: boolean) => {
			const activeFile = plugin.app.workspace.getActiveFile();
			if (!activeFile) {
				return false;
			}
			const status = processor.getNoteStatus(activeFile);
			if (status.status !== "needs-processing" && status.status !== "captured") {
				return false;
			}
			if (!checking) {
				processor.promoteToZettel(activeFile);
			}
			return true;
		},
	});

	plugin.addCommand({
		id: "force-ai-first-pass",
		name: "Force AI first pass",
		checkCallback: (checking: boolean) => {
			const activeFile = plugin.app.workspace.getActiveFile();
			if (!activeFile) {
				return false;
			}
			if (!processor.client.isConfigured()) {
				return false;
			}
			if (!checking) {
				processor.triggerAiFirstPass(activeFile);
			}
			return true;
		},
	});

	plugin.addCommand({
		id: "open-auth-modal",
		name: "Sign in",
		callback: () => {
			new AuthModal(plugin.app, plugin).open();
		},
	});
}

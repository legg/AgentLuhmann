import {App, FuzzySuggestModal, Notice, Plugin, TFile} from "obsidian";
import {CaptureProcessor} from "./processor";
import {CaptureModal} from "./capture-modal";
import {SurpriseRatingModal} from "./surprise-modal";
import {isInInbox} from "../utils/paths";
import {AuthModal} from "../ui/auth-modal";
import AgentLuhmannPlugin from "../main";
import {syncVectorStore} from "../vector-store/sync";
import {getAiStatus} from "./ai-status";

class InboxNoteSuggestModal extends FuzzySuggestModal<TFile> {
	processor: CaptureProcessor;

	constructor(app: App, processor: CaptureProcessor) {
		super(app);
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
		new SurpriseRatingModal(this.app, item, async (score) => {
			await this.processor.applySurpriseRating(item, score);
		}).open();
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
			new InboxNoteSuggestModal(plugin.app, processor).open();
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
				new SurpriseRatingModal(plugin.app, activeFile, async (score) => {
					await processor.applySurpriseRating(activeFile, score);
				}).open();
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
}

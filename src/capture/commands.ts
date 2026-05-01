import {App, FuzzySuggestModal, Notice, Plugin, TFile} from "obsidian";
import {CaptureProcessor} from "./processor";
import {CaptureModal} from "./capture-modal";
import {SurpriseRatingModal} from "./surprise-modal";
import {isInInbox} from "../utils/paths";

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

export function registerCaptureCommands(plugin: Plugin, processor: CaptureProcessor): void {
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
}

import {Plugin, TFile} from "obsidian";
import {CaptureProcessor} from "./processor";
import {SurpriseRatingModal} from "./surprise-modal";
import {isInInbox} from "../utils/paths";

export function registerCaptureEvents(plugin: Plugin, processor: CaptureProcessor, autoPromptOnOpen: boolean): void {
	plugin.registerEvent(
		plugin.app.workspace.on("file-open", (file: TFile | null) => {
			if (!file) {
				return;
			}
			if (!autoPromptOnOpen) {
				return;
			}
			if (!isInInbox(file.path, processor.settings.inboxPath)) {
				return;
			}
			if (!processor.isNoteIncubated(file)) {
				return;
			}
			const status = processor.getNoteStatus(file);
			if (status.status !== "captured") {
				return;
			}

			// Small delay to avoid interfering with Obsidian's own file-open UI
			activeWindow.setTimeout(() => {
				new SurpriseRatingModal(plugin.app, file, async (score) => {
					await processor.applySurpriseRating(file, score);
				}).open();
			}, 300);
		})
	);
}

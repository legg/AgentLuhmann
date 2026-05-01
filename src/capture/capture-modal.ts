import {App, Modal, Notice} from "obsidian";
import {CaptureProcessor} from "./processor";

export class CaptureModal extends Modal {
	processor: CaptureProcessor;
	textarea: HTMLTextAreaElement | null = null;

	constructor(app: App, processor: CaptureProcessor) {
		super(app);
		this.processor = processor;
	}

	onOpen(): void {
		const {contentEl} = this;
		contentEl.addClass("agent-luhmann-capture-modal");

		contentEl.createEl("h2", {text: "Capture fleeting note"});

		this.textarea = contentEl.createEl("textarea", {
			attr: {
				"aria-label": "Note content",
				placeholder: "Type your fleeting thought here...",
				rows: "5",
			},
		});

		const buttonContainer = contentEl.createDiv({cls: "modal-button-container"});

		const cancelButton = buttonContainer.createEl("button", {
			text: "Cancel",
			attr: {"aria-label": "Cancel capture"},
		});
		cancelButton.addEventListener("click", () => {
			this.close();
		});

		const submitButton = buttonContainer.createEl("button", {
			text: "Capture note",
			cls: "mod-cta",
			attr: {"aria-label": "Capture note"},
		});
		submitButton.addEventListener("click", async () => {
			const content = this.textarea?.value.trim() || "";
			if (!content) {
				new Notice("Note content is empty");
				return;
			}
			await this.processor.createFleetingNote(content);
			this.close();
		});

		// Focus textarea on open
		this.textarea.focus();
	}

	onClose(): void {
		const {contentEl} = this;
		contentEl.empty();
		contentEl.removeClass("agent-luhmann-capture-modal");
	}
}

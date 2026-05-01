import {App, Modal, Notice, TFile} from "obsidian";
import {CaptureResponse} from "../api/types";
import {AiApiClient} from "../api/client";

type AiDecision = "keep" | "replace" | "remove";

export class AiFirstPassModal extends Modal {
	file: TFile;
	originalContent: string;
	captureResponse: CaptureResponse;
	client: AiApiClient;
	onDecision: (decision: AiDecision, rewrittenContent: string) => void;

	constructor(
		app: App,
		file: TFile,
		originalContent: string,
		captureResponse: CaptureResponse,
		client: AiApiClient,
		onDecision: (decision: AiDecision, rewrittenContent: string) => void,
	) {
		super(app);
		this.file = file;
		this.originalContent = originalContent;
		this.captureResponse = captureResponse;
		this.client = client;
		this.onDecision = onDecision;
	}

	onOpen(): void {
		const {contentEl} = this;
		contentEl.addClass("agent-luhmann-ai-modal");
		contentEl.empty();
		this.renderContent();
	}

	renderContent(): void {
		const {contentEl} = this;
		contentEl.empty();

		contentEl.createEl("h2", {text: "AI first pass"});

		const infoEl = contentEl.createDiv({cls: "ai-info"});
		infoEl.createEl("span", {
			text: `Similarity score: ${(this.captureResponse.similarityScore * 100).toFixed(1)}%`,
			cls: "ai-badge done",
		});

		if (this.captureResponse.similarNotes.length > 0) {
			const similarEl = infoEl.createDiv({cls: "ai-similar-notes"});
			similarEl.createEl("strong", {text: "Similar notes:"});
			const list = similarEl.createEl("ul");
			for (const note of this.captureResponse.similarNotes.slice(0, 5)) {
				const li = list.createEl("li");
				li.createSpan({text: `${note.path} (${(note.score * 100).toFixed(1)}%)`});
			}
		}

		if (this.captureResponse.keywords.length > 0) {
			const keywordsEl = contentEl.createDiv({cls: "ai-keywords"});
			keywordsEl.createEl("strong", {text: "Suggested keywords: "});
			keywordsEl.createSpan({text: this.captureResponse.keywords.join(", ")});
		}

		if (this.captureResponse.title) {
			const titleEl = contentEl.createDiv({cls: "ai-title"});
			titleEl.createEl("strong", {text: "Suggested title: "});
			titleEl.createSpan({text: this.captureResponse.title});
		}

		const diffContainer = contentEl.createDiv({cls: "ai-diff-container"});
		const originalCol = diffContainer.createDiv({cls: "ai-diff-column"});
		originalCol.createEl("h3", {text: "Original"});
		originalCol.createEl("pre", {text: this.originalContent, cls: "ai-diff-content"});

		const rewrittenCol = diffContainer.createDiv({cls: "ai-diff-column"});
		rewrittenCol.createEl("h3", {text: "AI rewrite"});
		rewrittenCol.createEl("pre", {text: this.captureResponse.rewrittenContent, cls: "ai-diff-content"});

		const buttonContainer = contentEl.createDiv({cls: "ai-action-buttons"});

		const keepButton = buttonContainer.createEl("button", {
			text: "Keep both",
			attr: {"aria-label": "Keep original and AI rewrite"},
		});
		keepButton.addEventListener("click", () => {
			this.onDecision("keep", this.captureResponse.rewrittenContent);
			this.close();
		});

		const replaceButton = buttonContainer.createEl("button", {
			text: "Replace",
			cls: "mod-cta",
			attr: {"aria-label": "Replace original with AI rewrite"},
		});
		replaceButton.addEventListener("click", () => {
			this.onDecision("replace", this.captureResponse.rewrittenContent);
			this.close();
		});

		const removeButton = buttonContainer.createEl("button", {
			text: "Remove AI",
			attr: {"aria-label": "Discard AI rewrite"},
		});
		removeButton.addEventListener("click", () => {
			this.onDecision("remove", "");
			this.close();
		});

		const retryButton = buttonContainer.createEl("button", {
			text: "Retry",
			attr: {"aria-label": "Retry AI first pass"},
		});
		retryButton.addEventListener("click", async () => {
			retryButton.disabled = true;
			retryButton.setText("Retrying...");
			const result = await this.client.capture(this.originalContent);
			if (result) {
				this.captureResponse = result;
				this.renderContent();
			} else {
				new Notice("Retry failed");
				retryButton.disabled = false;
				retryButton.setText("Retry");
			}
		});
	}

	onClose(): void {
		const {contentEl} = this;
		contentEl.empty();
		contentEl.removeClass("agent-luhmann-ai-modal");
	}
}

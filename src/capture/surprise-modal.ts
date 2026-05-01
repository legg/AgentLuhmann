import {App, Modal, Notice, TFile} from "obsidian";

export class SurpriseRatingModal extends Modal {
	file: TFile;
	onSubmit: (score: number) => Promise<void>;
	selectedScore: number | null = null;
	confirmButton: HTMLButtonElement | null = null;

	constructor(app: App, file: TFile, onSubmit: (score: number) => Promise<void>) {
		super(app);
		this.file = file;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const {contentEl} = this;
		contentEl.addClass("agent-luhmann-surprise-modal");

		contentEl.createEl("h2", {text: "Rate surprise"});

		contentEl.createEl("p", {
			text: "Does this note shift your understanding?",
			cls: "surprise-prompt",
		});

		// Note preview
		const previewEl = contentEl.createDiv({cls: "preview"});
		this.loadPreview(previewEl);

		// Rating buttons
		const ratingContainer = contentEl.createDiv({cls: "rating-buttons"});
		for (let i = 1; i <= 5; i++) {
			const btn = ratingContainer.createEl("button", {
				text: i.toString(),
				attr: {
					"aria-label": `Rate surprise ${i}`,
					"data-score": i.toString(),
				},
			});
			btn.addEventListener("click", () => {
				this.selectedScore = i;
				this.updateButtonStyles(ratingContainer);
				if (this.confirmButton) {
					this.confirmButton.disabled = false;
				}
			});
		}

		// Labels
		const labelsContainer = contentEl.createDiv({cls: "rating-labels"});
		labelsContainer.createSpan({text: "low"});
		labelsContainer.createSpan({text: "high", cls: "rating-label-right"});

		// Buttons
		const buttonContainer = contentEl.createDiv({cls: "modal-button-container"});

		const skipButton = buttonContainer.createEl("button", {
			text: "Skip",
			attr: {"aria-label": "Skip rating"},
		});
		skipButton.addEventListener("click", () => {
			this.close();
		});

		this.confirmButton = buttonContainer.createEl("button", {
			text: "Confirm",
			cls: "mod-cta",
			attr: {"aria-label": "Confirm rating"},
		});
		this.confirmButton.disabled = true;
		this.confirmButton.addEventListener("click", async () => {
			if (this.selectedScore === null) {
				new Notice("Please select a surprise rating");
				return;
			}
			await this.onSubmit(this.selectedScore);
			this.close();
		});
	}

	async loadPreview(el: HTMLElement): Promise<void> {
		try {
			const content = await this.app.vault.read(this.file);
			// Strip frontmatter for preview
			const body = content.replace(/^---[\s\S]*?---\n*/, "").trim();
			const preview = body.length > 500 ? body.slice(0, 500) + "..." : body;
			el.setText(preview || "(empty note)");
		} catch {
			el.setText("(could not load note)");
		}
	}

	updateButtonStyles(container: HTMLElement): void {
		const buttons = container.querySelectorAll("button");
		buttons.forEach(btn => {
			const score = parseInt(btn.getAttribute("data-score") || "0", 10);
			if (score === this.selectedScore) {
				btn.addClass("selected");
			} else {
				btn.removeClass("selected");
			}
		});
	}

	onClose(): void {
		const {contentEl} = this;
		contentEl.empty();
		contentEl.removeClass("agent-luhmann-surprise-modal");
	}
}

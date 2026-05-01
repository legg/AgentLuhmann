import {Notice, Plugin, TFile} from "obsidian";
import {CaptureProcessor} from "./processor";
import {SurpriseRatingModal} from "./surprise-modal";
import {AiFirstPassModal} from "./ai-first-pass-modal";
import {isInInbox} from "../utils/paths";
import {getAiStatus} from "./ai-status";
import AgentLuhmannPlugin from "../main";

export function registerCaptureEvents(plugin: AgentLuhmannPlugin, processor: CaptureProcessor, autoPromptOnOpen: boolean): void {
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

			if (plugin.settings.aiEnabled && processor.client.isConfigured()) {
				const cache = plugin.app.metadataCache.getFileCache(file);
				const aiStatus = getAiStatus(cache);

				if (aiStatus.firstPass === null || aiStatus.firstPass === "failed") {
					activeWindow.setTimeout(async () => {
						try {
							const rawContent = await plugin.app.vault.read(file);
							const body = rawContent.replace(/^---[\s\S]*?---\n*/, "").trim();
							const result = await processor.client.capture(body);

							if (!result) {
								new SurpriseRatingModal(plugin.app, file, async (score) => {
									await processor.applySurpriseRating(file, score);
								}).open();
								return;
							}

							new AiFirstPassModal(
								plugin.app,
								file,
								body,
								result,
								processor.client,
								async (decision, rewrittenContent) => {
									await processor.applyAiDecision(file, decision, rewrittenContent, result);
									new SurpriseRatingModal(plugin.app, file, async (score) => {
										await processor.applySurpriseRating(file, score);
									}).open();
								}
							).open();
						} catch {
							new SurpriseRatingModal(plugin.app, file, async (score) => {
								await processor.applySurpriseRating(file, score);
							}).open();
						}
					}, 300);
					return;
				}

				if (aiStatus.firstPass === "pending") {
					new Notice("AI first pass still processing...");
					return;
				}
			}

			activeWindow.setTimeout(() => {
				new SurpriseRatingModal(plugin.app, file, async (score) => {
					await processor.applySurpriseRating(file, score);
				}).open();
			}, 300);
		})
	);
}

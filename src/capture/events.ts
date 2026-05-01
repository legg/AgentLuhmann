import {Notice, TFile} from "obsidian";
import {CaptureProcessor} from "./processor";
import {SurpriseRatingModal} from "./surprise-modal";
import {AiFirstPassModal} from "./ai-first-pass-modal";
import {isInInbox} from "../utils/paths";
import {getAiStatus} from "./ai-status";
import {CaptureResponse} from "../api/types";
import AgentLuhmannPlugin from "../main";

export function registerCaptureEvents(plugin: AgentLuhmannPlugin, processor: CaptureProcessor): void {
	plugin.registerEvent(
		plugin.app.workspace.on("file-open", (file: TFile | null) => {
			if (!file) {
				return;
			}
			if (!plugin.settings.autoPromptOnOpen) {
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

				if (aiStatus.firstPass === "pending") {
					new Notice("AI first pass still processing...");
					return;
				}

				if (aiStatus.firstPass === "done" && aiStatus.aiRewrittenContent) {
					// AI data already stored — show modal from frontmatter, no API call needed
					activeWindow.setTimeout(async () => {
						const rawContent = await plugin.app.vault.read(file);
						const body = rawContent.replace(/^---[\s\S]*?---\n*/, "").trim();
						const storedResult: CaptureResponse = {
							rewrittenContent: aiStatus.aiRewrittenContent ?? "",
							title: aiStatus.aiTitle ?? "",
							keywords: aiStatus.aiKeywords ?? [],
							similarityScore: aiStatus.similarityScore ?? 0,
							similarNotes: [],
						};
						new AiFirstPassModal(
							plugin.app,
							file,
							body,
							storedResult,
							processor.client,
							async (decision, rewrittenContent) => {
								await processor.applyAiDecision(file, decision, rewrittenContent, storedResult);
								new SurpriseRatingModal(plugin.app, file, async (score) => {
									await processor.applySurpriseRating(file, score);
								}, storedResult.similarityScore).open();
							}
						).open();
					}, 300);
					return;
				}

				// ai_first_pass is null, "failed", or "done" but no stored content — call API
				activeWindow.setTimeout(async () => {
					try {
						const rawContent = await plugin.app.vault.read(file);
						const body = rawContent.replace(/^---[\s\S]*?---\n*/, "").trim();
						const result = await processor.client.capture(body);

						if (!result) {
							new SurpriseRatingModal(plugin.app, file, async (score) => {
								await processor.applySurpriseRating(file, score);
							}, aiStatus.similarityScore).open();
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
								}, result.similarityScore).open();
							}
						).open();
					} catch {
						new SurpriseRatingModal(plugin.app, file, async (score) => {
							await processor.applySurpriseRating(file, score);
						}, aiStatus.similarityScore).open();
					}
				}, 300);
				return;
			}

			// AI not enabled — just open the surprise rating modal
			activeWindow.setTimeout(() => {
				new SurpriseRatingModal(plugin.app, file, async (score) => {
					await processor.applySurpriseRating(file, score);
				}).open();
			}, 300);
		})
	);
}

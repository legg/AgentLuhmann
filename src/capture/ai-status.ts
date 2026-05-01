import {FileManager, TFile} from "obsidian";

export interface AiStatus {
	firstPass: string | null;
	similarityScore: number | null;
	model: string | null;
}

export function getAiStatus(cache: { frontmatter?: Record<string, unknown> } | null): AiStatus {
	const fm = cache?.frontmatter;
	return {
		firstPass: typeof fm?.ai_first_pass === "string" ? fm.ai_first_pass : null,
		similarityScore: typeof fm?.ai_similarity_score === "number" ? fm.ai_similarity_score : null,
		model: typeof fm?.ai_model === "string" ? fm.ai_model : null,
	};
}

export async function setAiStatus(
	fileManager: FileManager,
	file: TFile,
	firstPass: string,
	similarityScore?: number,
	model?: string,
): Promise<void> {
	await fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter.ai_first_pass = firstPass;
		if (similarityScore !== undefined) {
			frontmatter.ai_similarity_score = similarityScore;
		}
		if (model !== undefined) {
			frontmatter.ai_model = model;
		}
	});
}

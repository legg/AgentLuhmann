import {FileManager, TFile} from "obsidian";

export interface AiStatus {
	firstPass: string | null;
	similarityScore: number | null;
	model: string | null;
	aiTitle: string | null;
	aiKeywords: string[] | null;
	aiRewrittenContent: string | null;
}

export function getAiStatus(cache: { frontmatter?: Record<string, unknown> } | null): AiStatus {
	const fm = cache?.frontmatter;
	const keywords = fm?.ai_keywords;
	return {
		firstPass: typeof fm?.ai_first_pass === "string" ? fm.ai_first_pass : null,
		similarityScore: typeof fm?.ai_similarity_score === "number" ? fm.ai_similarity_score : null,
		model: typeof fm?.ai_model === "string" ? fm.ai_model : null,
		aiTitle: typeof fm?.ai_title === "string" ? fm.ai_title : null,
		aiKeywords: Array.isArray(keywords) ? keywords as string[] : null,
		aiRewrittenContent: typeof fm?.ai_rewritten_content === "string" ? fm.ai_rewritten_content : null,
	};
}

export async function setAiStatus(
	fileManager: FileManager,
	file: TFile,
	firstPass: string,
	similarityScore?: number,
	model?: string,
	aiTitle?: string,
	aiKeywords?: string[],
	aiRewrittenContent?: string,
): Promise<void> {
	await fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter.ai_first_pass = firstPass;
		if (similarityScore !== undefined) {
			frontmatter.ai_similarity_score = similarityScore;
		}
		if (model !== undefined) {
			frontmatter.ai_model = model;
		}
		if (aiTitle !== undefined) {
			frontmatter.ai_title = aiTitle;
		}
		if (aiKeywords !== undefined) {
			frontmatter.ai_keywords = aiKeywords;
		}
		if (aiRewrittenContent !== undefined) {
			frontmatter.ai_rewritten_content = aiRewrittenContent;
		}
	});
}

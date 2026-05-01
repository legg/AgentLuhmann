import {normalizePath, Vault} from "obsidian";

export function generateFleetingNoteContent(body: string, timestamp: string): string {
	return `---\ntype: fleeting\nstatus: captured\ncaptured_at: "${timestamp}"\nsurprise_score: null\ntags:\n  - zk-spark\n---\n\n${body}\n`;
}

export async function ensureTemplateExists(vault: Vault, templatesPath: string): Promise<void> {
	const templatePath = normalizePath(`${templatesPath}/fleeting-note.md`);
	if (!vault.getAbstractFileByPath(templatePath)) {
		await vault.create(templatePath, generateFleetingNoteContent("", new Date().toISOString()));
	}
}

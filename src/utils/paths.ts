import {normalizePath, TFolder, Vault} from "obsidian";

export function safePath(userPath: string): string {
	return normalizePath(userPath.trim());
}

export async function ensureFolderExists(vault: Vault, path: string): Promise<void> {
	const normalized = safePath(path);
	const existing = vault.getAbstractFileByPath(normalized);
	if (!existing) {
		await vault.createFolder(normalized);
	}
}

export function isInInbox(filePath: string, inboxPath: string): boolean {
	const normalizedInbox = safePath(inboxPath);
	return filePath.startsWith(normalizedInbox + "/");
}

export function isInArchive(filePath: string, archivePath: string): boolean {
	const normalizedArchive = safePath(archivePath);
	return filePath.startsWith(normalizedArchive + "/");
}

export function getArchiveDestination(filePath: string, inboxPath: string, archivePath: string): string {
	const normalizedInbox = safePath(inboxPath);
	const normalizedArchive = safePath(archivePath);
	const fileName = filePath.substring(normalizedInbox.length + 1);
	return normalizePath(`${normalizedArchive}/${fileName}`);
}

export function validatePathOverlap(inboxPath: string, archivePath: string): boolean {
	const n1 = safePath(inboxPath);
	const n2 = safePath(archivePath);
	return n1 !== n2 && !n1.startsWith(n2 + "/") && !n2.startsWith(n1 + "/");
}

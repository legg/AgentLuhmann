import {MetadataCache, Notice, TFile, TFolder, Vault} from "obsidian";
import {AiApiClient} from "../api/client";
import {VectorStoreSyncNote} from "../api/types";
import {safePath} from "../utils/paths";

export async function syncVectorStore(vault: Vault, metadataCache: MetadataCache, client: AiApiClient, zettelsPath: string): Promise<void> {
	if (!client.isConfigured()) {
		new Notice("Sign in to use AI features");
		return;
	}

	const normalizedPath = safePath(zettelsPath);
	const folder = vault.getAbstractFileByPath(normalizedPath);
	if (!folder || !(folder instanceof TFolder)) {
		new Notice("Zettels folder does not exist");
		return;
	}

	const notes: VectorStoreSyncNote[] = [];
	for (const child of folder.children) {
		if (child instanceof TFile && child.extension === "md") {
			const cache = metadataCache.getFileCache(child);
			const fm = cache?.frontmatter;
			if (fm?.status === "zettel") {
				const rawContent = await vault.read(child);
				const body = rawContent.replace(/^---[\s\S]*?---\n*/, "").trim();
				notes.push({id: child.path, path: child.path, content: body});
			}
		}
	}

	if (notes.length === 0) {
		new Notice("No zettels to sync");
		return;
	}

	const result = await client.syncNotes({notes});
	if (result) {
		new Notice(`Vector store synced: ${result.synced} notes synced, ${result.removed} removed`);
	} else {
		new Notice("Vector store sync failed");
	}
}

import fs from "fs";
import path from "path";
import os from "os";

function expandHome(filepath) {
	if (filepath.startsWith("~")) {
		return path.join(os.homedir(), filepath.slice(1));
	}
	return filepath;
}

const vaultPath = process.env.OBSIDIAN_VAULT_PATH || "~/Documents/obsidian_dev/";
const expandedVaultPath = expandHome(vaultPath);
const pluginDir = path.join(expandedVaultPath, ".obsidian", "plugins", "AgentLuhmann");

const filesToCopy = ["main.js", "manifest.json", "styles.css"];

if (!fs.existsSync(expandedVaultPath)) {
	console.log(`Vault path does not exist: ${expandedVaultPath}`);
	console.log("Skipping copy to vault.");
	process.exit(0);
}

if (!fs.existsSync(pluginDir)) {
	fs.mkdirSync(pluginDir, { recursive: true });
	console.log(`Created plugin directory: ${pluginDir}`);
}

let copiedCount = 0;
for (const file of filesToCopy) {
	const src = path.join(process.cwd(), file);
	const dest = path.join(pluginDir, file);
	if (fs.existsSync(src)) {
		fs.copyFileSync(src, dest);
		console.log(`Copied ${file} -> ${dest}`);
		copiedCount++;
	} else {
		console.log(`Source file not found, skipping: ${src}`);
	}
}

if (copiedCount > 0) {
	console.log(`Successfully deployed ${copiedCount} file(s) to vault plugin directory.`);
} else {
	console.log("No files were copied.");
}

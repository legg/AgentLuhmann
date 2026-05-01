import {Plugin, TFolder} from "obsidian";
import {AgentLuhmannSettings, DEFAULT_SETTINGS, AgentLuhmannSettingTab} from "./settings";
import {CaptureProcessor} from "./capture/processor";
import {registerCaptureCommands} from "./capture/commands";
import {registerCaptureEvents} from "./capture/events";
import {ensureFolderExists} from "./utils/paths";
import {ensureTemplateExists} from "./capture/template";

export default class AgentLuhmannPlugin extends Plugin {
	settings!: AgentLuhmannSettings;
	processor!: CaptureProcessor;

	async onload() {
		await this.loadSettings();

		// Ensure required folders exist
		await ensureFolderExists(this.app.vault, this.settings.inboxPath);
		await ensureFolderExists(this.app.vault, this.settings.archivePath);
		await ensureFolderExists(this.app.vault, this.settings.templatesPath);
		await ensureTemplateExists(this.app.vault, this.settings.templatesPath);

		// Initialize processor
		this.processor = new CaptureProcessor(
			this.app.vault,
			this.app.fileManager,
			this.app.metadataCache,
			this.settings
		);

		// Register commands and events
		registerCaptureCommands(this, this.processor);
		registerCaptureEvents(this, this.processor, this.settings.autoPromptOnOpen);

		// Settings tab
		this.addSettingTab(new AgentLuhmannSettingTab(this.app, this));
	}

	onunload() {
		// Cleanup handled by register* methods
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<AgentLuhmannSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update processor settings reference
		if (this.processor) {
			this.processor.settings = this.settings;
			this.processor.debugLog = this.settings.enableDebugLogging ? console.log : () => {};
		}
	}
}

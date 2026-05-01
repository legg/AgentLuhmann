import {Plugin, TFolder} from "obsidian";
import {AgentLuhmannSettings, DEFAULT_SETTINGS, AgentLuhmannSettingTab} from "./settings";
import {CaptureProcessor} from "./capture/processor";
import {registerCaptureCommands} from "./capture/commands";
import {registerCaptureEvents} from "./capture/events";
import {ensureFolderExists} from "./utils/paths";
import {ensureTemplateExists} from "./capture/template";
import {AiApiClient} from "./api/client";
import {AuthModal} from "./ui/auth-modal";

export default class AgentLuhmannPlugin extends Plugin {
	settings!: AgentLuhmannSettings;
	processor!: CaptureProcessor;
	client!: AiApiClient;

	async onload() {
		await this.loadSettings();

		this.client = new AiApiClient(
			this.settings.aiApiUrl,
			this.settings.authToken,
			this.settings.aiEnabled,
		);

		await ensureFolderExists(this.app.vault, this.settings.inboxPath);
		await ensureFolderExists(this.app.vault, this.settings.archivePath);
		await ensureFolderExists(this.app.vault, this.settings.templatesPath);
		await ensureFolderExists(this.app.vault, this.settings.zettelsPath);
		await ensureTemplateExists(this.app.vault, this.settings.templatesPath);

		this.processor = new CaptureProcessor(
			this.app,
			this.app.vault,
			this.app.fileManager,
			this.app.metadataCache,
			this.settings,
			this.client,
		);

		registerCaptureCommands(this, this.processor);
		registerCaptureEvents(this, this.processor);

		this.addSettingTab(new AgentLuhmannSettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<AgentLuhmannSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		if (this.processor) {
			this.processor.settings = this.settings;
			this.processor.debugLog = this.settings.enableDebugLogging ? console.log : () => {};
		}
		if (this.client) {
			this.client.baseUrl = this.settings.aiApiUrl;
			this.client.authToken = this.settings.authToken;
			this.client.aiEnabled = this.settings.aiEnabled;
		}
	}

	openAuthModal(onSuccess?: () => void): void {
		new AuthModal(this.app, this, onSuccess).open();
	}
}

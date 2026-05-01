import {App, PluginSettingTab, Setting} from "obsidian";
import AgentLuhmannPlugin from "./main";

export interface AgentLuhmannSettings {
	inboxPath: string;
	archivePath: string;
	templatesPath: string;
	incubationHours: number;
	surpriseThreshold: number;
	autoPromptOnOpen: boolean;
	enableDebugLogging: boolean;
	zettelsPath: string;
	aiEnabled: boolean;
	aiApiUrl: string;
	autoAiFirstPass: boolean;
	authToken: string;
	userEmail: string;
	isAuthenticated: boolean;
}

export const DEFAULT_SETTINGS: AgentLuhmannSettings = {
	inboxPath: "00_Inbox",
	archivePath: "04_Archive",
	templatesPath: "99_Templates",
	incubationHours: 48,
	surpriseThreshold: 3,
	autoPromptOnOpen: true,
	enableDebugLogging: false,
	zettelsPath: "01_Zettels",
	aiEnabled: false,
	aiApiUrl: "",
	autoAiFirstPass: true,
	authToken: "",
	userEmail: "",
	isAuthenticated: false,
};

export class AgentLuhmannSettingTab extends PluginSettingTab {
	plugin: AgentLuhmannPlugin;

	constructor(app: App, plugin: AgentLuhmannPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Capture")
			.setHeading();

		new Setting(containerEl)
			.setName("Inbox folder path")
			.setDesc("Folder where new fleeting notes are captured.")
			.addText(text => text
				.setPlaceholder("00_Inbox")
				.setValue(this.plugin.settings.inboxPath)
				.onChange(async (value) => {
					this.plugin.settings.inboxPath = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Archive folder path")
			.setDesc("Folder where low-surprise notes are moved.")
			.addText(text => text
				.setPlaceholder("04_Archive")
				.setValue(this.plugin.settings.archivePath)
				.onChange(async (value) => {
					this.plugin.settings.archivePath = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Templates folder path")
			.setDesc("Folder where the default fleeting note template is stored.")
			.addText(text => text
				.setPlaceholder("99_Templates")
				.setValue(this.plugin.settings.templatesPath)
				.onChange(async (value) => {
					this.plugin.settings.templatesPath = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Zettels folder path")
			.setDesc("Folder where promoted zettel notes are stored.")
			.addText(text => text
				.setPlaceholder("01_Zettels")
				.setValue(this.plugin.settings.zettelsPath)
				.onChange(async (value) => {
					this.plugin.settings.zettelsPath = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Incubation")
			.setHeading();

		new Setting(containerEl)
			.setName("Incubation period (hours)")
			.setDesc("How long a note must incubate before it can be rated.")
			.addSlider(slider => slider
				.setLimits(1, 168, 1)
				.setValue(this.plugin.settings.incubationHours)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.incubationHours = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Surprise threshold (1-5)")
			.setDesc("Scores at or below this value are archived; higher scores are kept for processing.")
			.addSlider(slider => slider
				.setLimits(1, 5, 1)
				.setValue(this.plugin.settings.surpriseThreshold)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.surpriseThreshold = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Behavior")
			.setHeading();

		new Setting(containerEl)
			.setName("Auto-prompt on open")
			.setDesc("Automatically prompt for surprise rating when opening an incubated inbox note.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoPromptOnOpen)
				.onChange(async (value) => {
					this.plugin.settings.autoPromptOnOpen = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Enable debug logging")
			.setDesc("Log additional diagnostic information to the console.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableDebugLogging)
				.onChange(async (value) => {
					this.plugin.settings.enableDebugLogging = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("AI integration")
			.setHeading();

		new Setting(containerEl)
			.setName("Enable AI features")
			.setDesc("Connect to an AI service for first-pass rewriting and similarity scoring.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.aiEnabled)
				.onChange(async (value) => {
					this.plugin.settings.aiEnabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("AI API URL")
			.setDesc("Base URL of the AI service (e.g. https://your-api.workers.dev).")
			.addText(text => text
				.setPlaceholder("https://your-api.workers.dev")
				.setValue(this.plugin.settings.aiApiUrl)
				.onChange(async (value) => {
					this.plugin.settings.aiApiUrl = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Auto AI first pass")
			.setDesc("Automatically run AI first pass when capturing a new fleeting note.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoAiFirstPass)
				.onChange(async (value) => {
					this.plugin.settings.autoAiFirstPass = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Authentication status")
			.setDesc(this.plugin.settings.isAuthenticated
				? `Signed in as ${this.plugin.settings.userEmail}`
				: "Not signed in")
			.addButton(button => button
				.setButtonText(this.plugin.settings.isAuthenticated ? "Sign out" : "Sign in")
				.onClick(() => {
					if (this.plugin.settings.isAuthenticated) {
						this.plugin.settings.authToken = "";
						this.plugin.settings.isAuthenticated = false;
						this.plugin.settings.userEmail = "";
						this.plugin.saveSettings();
						this.display();
					} else {
						this.plugin.openAuthModal();
					}
				}));
	}
}

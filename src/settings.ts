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
}

export const DEFAULT_SETTINGS: AgentLuhmannSettings = {
	inboxPath: "00_Inbox",
	archivePath: "04_Archive",
	templatesPath: "99_Templates",
	incubationHours: 48,
	surpriseThreshold: 3,
	autoPromptOnOpen: true,
	enableDebugLogging: false,
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
	}
}

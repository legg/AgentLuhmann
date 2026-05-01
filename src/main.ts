import {Plugin} from 'obsidian';
import {AgentLuhmannSettings, DEFAULT_SETTINGS, AgentLuhmannSettingTab} from "./settings";

export default class AgentLuhmannPlugin extends Plugin {
	settings!: AgentLuhmannSettings;

	async onload() {
		await this.loadSettings();

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
	}
}

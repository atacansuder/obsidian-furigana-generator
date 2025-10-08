import { FuriganaService } from "furigana-service";
import { Editor, Notice, Plugin, FileSystemAdapter } from "obsidian";

interface FuriganaGeneratorPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: FuriganaGeneratorPluginSettings = {
	mySetting: "default",
};

export default class ObsidianFuriganaGenerator extends Plugin {
	settings: FuriganaGeneratorPluginSettings;
	furiganaService: FuriganaService;

	async onload() {
		await this.loadSettings();

		const adapter = this.app.vault.adapter;
		if (adapter instanceof FileSystemAdapter) {
			const pluginBasePath = adapter.getFullPath(this.manifest.dir!);

			this.furiganaService = new FuriganaService(pluginBasePath);
			await this.furiganaService.initialize();
		} else {
			new Notice(
				"Furigana Generator plugin requires a local filesystem and is not supported on this platform."
			);
			return;
		}

		this.addCommand({
			id: "add-furigana-to-selected-text",
			name: "Add furigana to selected text",
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				editor.replaceSelection(
					this.furiganaService.generateFurigana(selection)
				);
			},
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

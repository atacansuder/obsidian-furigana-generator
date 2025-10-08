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
			editorCallback: async (editor: Editor) => {
				const selection = editor.getSelection();
				const selectionWithFurigana =
					await this.furiganaService.generateFurigana(selection);
				editor.replaceSelection(selectionWithFurigana);
			},
		});

		this.addCommand({
			id: "add-furigana-to-entire-document",
			name: "Add furigana to entire document",
			editorCallback: async (editor: Editor) => {
				const content = editor.getValue();
				const contentWithFurigana =
					await this.furiganaService.generateFurigana(content);
				editor.setValue(contentWithFurigana);
			},
		});

		this.addCommand({
			id: "remove-furigana-from-selected-text",
			name: "Remove furigana from selected text",
			editorCallback: async (editor: Editor) => {
				const selection = editor.getSelection();
				const selectionWithoutFurigana =
					await this.furiganaService.removeFurigana(selection);
				editor.replaceSelection(selectionWithoutFurigana);
			},
		});

		this.addCommand({
			id: "remove-furigana-from-entire-document",
			name: "Remove furigana from entire document",
			editorCallback: async (editor: Editor) => {
				const content = editor.getValue();
				const contentWithoutFurigana =
					await this.furiganaService.removeFurigana(content);
				editor.setValue(contentWithoutFurigana);
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

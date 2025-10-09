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
				await this.addFuriganaToSelection(editor);
			},
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor) => {
				menu.addItem((item) => {
					item.setTitle("Add furigana to selection")
						.setIcon("japanese-yen")
						.onClick(async () => {
							await this.addFuriganaToSelection(editor);
						});
				});
			})
		);

		this.addCommand({
			id: "remove-furigana-from-selected-text",
			name: "Remove furigana from selected text",
			editorCallback: async (editor: Editor) => {
				await this.removeFuriganaFromSelection(editor);
			},
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor) => {
				menu.addItem((item) => {
					item.setTitle("Remove furigana from selection")
						.setIcon("japanese-yen")
						.onClick(async () => {
							await this.removeFuriganaFromSelection(editor);
						});
				});
			})
		);

		this.addCommand({
			id: "add-furigana-to-entire-document",
			name: "Add furigana to entire document",
			editorCallback: async (editor: Editor) => {
				await this.addFuriganaToDocument(editor);
			},
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor) => {
				menu.addItem((item) => {
					item.setTitle("Add  furigana to document")
						.setIcon("japanese-yen")
						.onClick(async () => {
							await this.addFuriganaToDocument(editor);
						});
				});
			})
		);

		this.addCommand({
			id: "remove-furigana-from-entire-document",
			name: "Remove furigana from entire document",
			editorCallback: async (editor: Editor) => {
				await this.removeFuriganaFromDocument(editor);
			},
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor) => {
				menu.addItem((item) => {
					item.setTitle("Remove furigana from document")
						.setIcon("japanese-yen")
						.onClick(async () => {
							await this.removeFuriganaFromDocument(editor);
						});
				});
			})
		);
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

	async addFuriganaToSelection(editor: Editor) {
		const selection = editor.getSelection();
		const selectionWithFurigana =
			await this.furiganaService.generateFurigana(selection);
		editor.replaceSelection(selectionWithFurigana);
	}

	async addFuriganaToDocument(editor: Editor) {
		const content = editor.getValue();
		const contentWithFurigana = await this.furiganaService.generateFurigana(
			content
		);
		editor.setValue(contentWithFurigana);
	}

	async removeFuriganaFromSelection(editor: Editor) {
		const selection = editor.getSelection();
		const selectionWithoutFurigana =
			await this.furiganaService.removeFurigana(selection);
		editor.replaceSelection(selectionWithoutFurigana);
	}

	async removeFuriganaFromDocument(editor: Editor) {
		const content = editor.getValue();
		const contentWithoutFurigana =
			await this.furiganaService.removeFurigana(content);
		editor.setValue(contentWithoutFurigana);
	}
}

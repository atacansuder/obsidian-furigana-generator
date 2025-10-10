import { FuriganaService } from "src/furigana-service";
import { App, Editor, Notice, Plugin, FileSystemAdapter } from "obsidian";
import { getLangStrings } from "./lang/translations";
import {
	FuriganaGeneratorPluginSettings,
	DEFAULT_SETTINGS,
	GeneralSettingTab,
	KanjisExclusionModal,
} from "./src/settings";

export default class ObsidianFuriganaGenerator extends Plugin {
	settings: FuriganaGeneratorPluginSettings;
	furiganaService: FuriganaService;

	async onload() {
		await this.loadSettings();

		const t = getLangStrings(this.settings.language);

		this.addSettingTab(new GeneralSettingTab(this.app, this));

		const adapter = this.app.vault.adapter;
		if (adapter instanceof FileSystemAdapter) {
			const pluginBasePath = adapter.getFullPath(this.manifest.dir!);

			this.furiganaService = new FuriganaService(pluginBasePath);
			await this.furiganaService.initialize();
		} else {
			new Notice(t.fsNotSupported);
			return;
		}

		this.addCommand({
			id: "add-furigana-to-selected-text",
			name: t.addFuriganaSelection,
			editorCallback: async (editor: Editor) => {
				await this.addFuriganaToSelection(editor);
			},
		});

		this.addCommand({
			id: "remove-furigana-from-selected-text",
			name: t.removeFuriganaSelection,
			editorCallback: async (editor: Editor) => {
				await this.removeFuriganaFromSelection(editor);
			},
		});

		this.addCommand({
			id: "add-furigana-to-entire-document",
			name: t.addFuriganaNote,
			editorCallback: async (editor: Editor) => {
				await this.addFuriganaToDocument(editor);
			},
		});

		this.addCommand({
			id: "remove-furigana-from-entire-document",
			name: t.removeFuriganaNote,
			editorCallback: async (editor: Editor) => {
				await this.removeFuriganaFromDocument(editor);
			},
		});

		this.addCommand({
			id: "add-kanjis-to-exclusion-list",
			name: t.excludeKanjisCommand,
			editorCallback: async (editor: Editor) => {
				await this.addKanjisToExclusionList(editor);
			},
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor) => {
				if (!this.settings.showInContextMenu) return;
				const t = getLangStrings(this.settings.language);
				menu.addSeparator();
				if (editor.getSelection()) {
					menu.addItem((item) => {
						item.setTitle(t.addFuriganaSelection)
							.setIcon("plus")
							.onClick(async () => {
								await this.addFuriganaToSelection(editor);
							});
					});
					menu.addItem((item) => {
						item.setTitle(t.removeFuriganaSelection)
							.setIcon("minus")
							.onClick(async () => {
								await this.removeFuriganaFromSelection(editor);
							});
					});
					menu.addItem((item) => {
						item.setTitle(t.excludeKanjisCommand)
							.setIcon("save")
							.onClick(async () => {
								await this.addKanjisToExclusionList(editor);
							});
					});
				} else {
					menu.addItem((item) => {
						item.setTitle(t.addFuriganaNote)
							.setIcon("file-plus")
							.onClick(async () => {
								await this.addFuriganaToDocument(editor);
							});
					});
					menu.addItem((item) => {
						item.setTitle(t.removeFuriganaNote)
							.setIcon("file-minus")
							.onClick(async () => {
								await this.removeFuriganaFromDocument(editor);
							});
					});
				}
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
			await this.furiganaService.generateFurigana(
				selection,
				this.settings.jlptLevelsToInclude,
				this.settings.scope,
				this.settings.excludeHeadings,
				this.settings.customExclusionList,
				this.settings.syntax
			);
		editor.replaceSelection(selectionWithFurigana);
	}

	async addFuriganaToDocument(editor: Editor) {
		const content = editor.getValue();
		const contentWithFurigana = await this.furiganaService.generateFurigana(
			content,
			this.settings.jlptLevelsToInclude,
			this.settings.scope,
			this.settings.excludeHeadings,
			this.settings.customExclusionList,
			this.settings.syntax
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

	async addKanjisToExclusionList(editor: Editor) {
		const selection = editor.getSelection();
		const t = getLangStrings(this.settings.language);

		if (!selection) {
			new Notice(t.excludeKanjisNoNew);
			return;
		}

		const extractedKanjis = await this.furiganaService.extractKanjis(
			selection
		);
		const uniqueKanjis = [...new Set(extractedKanjis)];

		// Filter existing kanjis
		const existingExclusions = new Set(this.settings.customExclusionList);
		const kanjisToAdd = uniqueKanjis.filter(
			(kanji) => !existingExclusions.has(kanji)
		);

		if (kanjisToAdd.length === 0) {
			new Notice(t.excludeKanjisNoNew);
			return;
		}

		new KanjisExclusionModal(
			this.app,
			this,
			kanjisToAdd,
			async (shouldRemoveFurigana: boolean) => {
				this.settings.customExclusionList =
					this.settings.customExclusionList.concat(kanjisToAdd);
				await this.saveSettings();

				if (shouldRemoveFurigana) {
					await this.removeFuriganaFromSelection(editor);
				}
				new Notice(t.excludeKanjisSaved);
			}
		).open();
	}
}

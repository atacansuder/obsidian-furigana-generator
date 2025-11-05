import { FuriganaService } from "src/furigana-service";
import { Editor, Notice, Plugin, FileSystemAdapter } from "obsidian";
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
		this.applyStyles();

		const t = getLangStrings(this.settings.language);

		this.addSettingTab(new GeneralSettingTab(this.app, this));

		const adapter = this.app.vault.adapter;
		if (adapter instanceof FileSystemAdapter) {
			const pluginBasePath = adapter.getFullPath(this.manifest.dir!);

			this.furiganaService = new FuriganaService(
				pluginBasePath,
				this.settings.language
			);
			await this.furiganaService.initialize();
		} else {
			new Notice(t.fsNotSupported);
			return;
		}

		this.addCommand({
			id: "add-furigana-to-selected-text",
			name: t.addFuriganaSelection,
			editorCallback: (editor: Editor) => {
				this.addFuriganaToSelection(editor);
			},
		});

		this.addCommand({
			id: "remove-furigana-from-selected-text",
			name: t.removeFuriganaSelection,
			editorCallback: (editor: Editor) => {
				this.removeFuriganaFromSelection(editor);
			},
		});

		this.addCommand({
			id: "add-furigana-to-entire-document",
			name: t.addFuriganaNote,
			editorCallback: (editor: Editor) => {
				this.addFuriganaToDocument(editor);
			},
		});

		this.addCommand({
			id: "remove-furigana-from-entire-document",
			name: t.removeFuriganaNote,
			editorCallback: (editor: Editor) => {
				this.removeFuriganaFromDocument(editor);
			},
		});

		this.addCommand({
			id: "add-kanjis-to-exclusion-list",
			name: t.excludeKanjisCommand,
			editorCallback: (editor: Editor) => {
				this.addKanjisToExclusionList(editor);
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
							.onClick(() => {
								this.addFuriganaToSelection(editor);
							});
					});
					menu.addItem((item) => {
						item.setTitle(t.removeFuriganaSelection)
							.setIcon("minus")
							.onClick(() => {
								this.removeFuriganaFromSelection(editor);
							});
					});
					menu.addItem((item) => {
						item.setTitle(t.excludeKanjisCommand)
							.setIcon("save")
							.onClick(() => {
								this.addKanjisToExclusionList(editor);
							});
					});
				} else {
					menu.addItem((item) => {
						item.setTitle(t.addFuriganaNote)
							.setIcon("file-plus")
							.onClick(() => {
								this.addFuriganaToDocument(editor);
							});
					});
					menu.addItem((item) => {
						item.setTitle(t.removeFuriganaNote)
							.setIcon("file-minus")
							.onClick(() => {
								this.removeFuriganaFromDocument(editor);
							});
					});
				}
			})
		);
	}

	onunload() {
		document.body.classList.remove("furigana-hover-hide");
		document.body.classList.remove("custom-furigana-size");
		document.documentElement.style.removeProperty("--furigana-font-size");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.applyStyles();
	}

	applyStyles(): void {
		document.body.classList.toggle(
			"furigana-hover-hide",
			this.settings.hideFuriganaOnHover
		);

		document.documentElement.style.setProperty(
			"--furigana-font-size",
			`${this.settings.furiganaFontSize}%`
		);
		if (this.settings.furiganaFontSize !== 50) {
			document.body.classList.add("custom-furigana-size");
		} else {
			document.body.classList.remove("custom-furigana-size");
		}
	}

	addFuriganaToSelection(editor: Editor) {
		const selection = editor.getSelection();
		const selectionWithFurigana = this.furiganaService.generateFurigana(
			selection,
			this.settings.jlptLevelsToInclude,
			this.settings.scope,
			this.settings.excludeHeadings,
			this.settings.customExclusionList,
			this.settings.syntax
		);
		editor.replaceSelection(selectionWithFurigana);
	}

	addFuriganaToDocument(editor: Editor) {
		const scrollInfo = editor.getScrollInfo();
		const cursor = editor.getCursor();

		const content = editor.getValue();
		const contentWithFurigana = this.furiganaService.generateFurigana(
			content,
			this.settings.jlptLevelsToInclude,
			this.settings.scope,
			this.settings.excludeHeadings,
			this.settings.customExclusionList,
			this.settings.syntax
		);
		editor.setValue(contentWithFurigana);

		editor.scrollTo(scrollInfo.left, scrollInfo.top);
		editor.setCursor(cursor);
	}

	removeFuriganaFromSelection(editor: Editor) {
		const selection = editor.getSelection();
		const selectionWithoutFurigana =
			this.furiganaService.removeFurigana(selection);
		editor.replaceSelection(selectionWithoutFurigana);
	}

	removeFuriganaFromDocument(editor: Editor) {
		const content = editor.getValue();
		const contentWithoutFurigana =
			this.furiganaService.removeFurigana(content);
		editor.setValue(contentWithoutFurigana);
	}

	addKanjisToExclusionList(editor: Editor) {
		const selection = editor.getSelection();
		const t = getLangStrings(this.settings.language);

		if (!selection) {
			new Notice(t.excludeKanjisNoNew);
			return;
		}

		const extractedKanjis = this.furiganaService.extractKanjis(selection);
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
					this.removeFuriganaFromSelection(editor);
				}
				new Notice(t.excludeKanjisSaved);
			}
		).open();
	}
}

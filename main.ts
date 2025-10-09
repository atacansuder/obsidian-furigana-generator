import { FuriganaService } from "furigana-service";
import {
	App,
	Editor,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	FileSystemAdapter,
} from "obsidian";
import { getLangStrings } from "./lang/translations";
import { LanguageSetting } from "lib/types";

interface FuriganaGeneratorPluginSettings {
	language: LanguageSetting;
	jlptLevelsToExclude: {
		n5: boolean;
		n4: boolean;
		n3: boolean;
		n2: boolean;
		n1: boolean;
	};
}

const DEFAULT_SETTINGS: FuriganaGeneratorPluginSettings = {
	language: "auto",
	jlptLevelsToExclude: {
		n5: true,
		n4: true,
		n3: true,
		n2: true,
		n1: true,
	},
};

export default class ObsidianFuriganaGenerator extends Plugin {
	settings: FuriganaGeneratorPluginSettings;
	furiganaService: FuriganaService;

	async onload() {
		await this.loadSettings();

		const t = getLangStrings(this.settings.language);
		this.addSettingTab(new FuriganaSettingTab(this.app, this));

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
			name: t.addFuriganaDocument,
			editorCallback: async (editor: Editor) => {
				await this.addFuriganaToDocument(editor);
			},
		});

		this.addCommand({
			id: "remove-furigana-from-entire-document",
			name: t.removeFuriganaDocument,
			editorCallback: async (editor: Editor) => {
				await this.removeFuriganaFromDocument(editor);
			},
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor) => {
				menu.addItem((item) => {
					item.setTitle(t.addFuriganaSelection)
						.setIcon("japanese-yen")
						.onClick(async () => {
							await this.addFuriganaToSelection(editor);
						});
				});
				menu.addItem((item) => {
					item.setTitle(t.removeFuriganaSelection)
						.setIcon("japanese-yen")
						.onClick(async () => {
							await this.removeFuriganaFromSelection(editor);
						});
				});
				menu.addItem((item) => {
					item.setTitle(t.addFuriganaDocument)
						.setIcon("japanese-yen")
						.onClick(async () => {
							await this.addFuriganaToDocument(editor);
						});
				});
				menu.addItem((item) => {
					item.setTitle(t.removeFuriganaDocument)
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

class FuriganaSettingTab extends PluginSettingTab {
	plugin: ObsidianFuriganaGenerator;

	constructor(app: App, plugin: ObsidianFuriganaGenerator) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const t = getLangStrings(this.plugin.settings.language);

		new Setting(containerEl)
			.setName(t.settingLanguage)
			.setDesc(t.settingLanguageDesc)
			.addDropdown((dropdown) => {
				dropdown
					.addOption("auto", t.settingLanguageOptAuto)
					.addOption("en", t.settingLanguageOptEn)
					.addOption("ja", t.settingLanguageOptJa)
					.setValue(this.plugin.settings.language)
					.onChange(async (value: LanguageSetting) => {
						this.plugin.settings.language = value;
						await this.plugin.saveSettings();
						new Notice(t.settingReloadNotice);
						this.display();
					});
			});

		new Setting(containerEl)
			.setHeading()
			.setName(t.settingJlptHeading)
			.setDesc(t.settingJlptDesc);

		const jlptLevels: (keyof typeof this.plugin.settings.jlptLevelsToExclude)[] =
			["n5", "n4", "n3", "n2", "n1"];
		for (const level of jlptLevels) {
			new Setting(containerEl)
				.setName(t.settingJlptLevel(level))
				.addToggle((toggle) => {
					toggle
						.setValue(
							this.plugin.settings.jlptLevelsToExclude[level]
						)
						.onChange(async (value) => {
							this.plugin.settings.jlptLevelsToExclude[level] =
								value;
							await this.plugin.saveSettings();
						});
				});
		}
	}
}

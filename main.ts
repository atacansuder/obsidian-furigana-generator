import { FuriganaService } from "furigana-service";
import {
	App,
	Editor,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	FileSystemAdapter,
	TextAreaComponent,
} from "obsidian";
import { getLangStrings } from "./lang/translations";
import { FirstInstanceScope, LanguageSetting } from "lib/types";
import { JlptLevelsToInclude } from "lib/types";

interface FuriganaGeneratorPluginSettings {
	language: LanguageSetting;
	scope: FirstInstanceScope;
	excludeHeadings: boolean;
	jlptLevelsToInclude: JlptLevelsToInclude;
	customExclusionList: string[];
}

const DEFAULT_SETTINGS: FuriganaGeneratorPluginSettings = {
	language: "auto",
	scope: "ALL",
	excludeHeadings: true,
	jlptLevelsToInclude: {
		n5: true,
		n4: true,
		n3: true,
		n2: true,
		n1: true,
	},
	customExclusionList: [],
};

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
				if (editor.getSelection()) {
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
				}
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
			await this.furiganaService.generateFurigana(
				selection,
				this.settings.jlptLevelsToInclude,
				this.settings.scope,
				this.settings.excludeHeadings,
				this.settings.customExclusionList
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
			this.settings.customExclusionList
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

class GeneralSettingTab extends PluginSettingTab {
	plugin: ObsidianFuriganaGenerator;

	constructor(app: App, plugin: ObsidianFuriganaGenerator) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "General Settings" });

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
			.setName(t.settingScopeHeading)
			.setDesc(t.settingScopeDesc)
			.addDropdown((dropdown) => {
				dropdown
					.addOption("ALL", t.settingScopeAll)
					.addOption("SENTENCE", t.settingScopeSentence)
					.addOption("PARAGRAPH", t.settingScopeParagraph)
					.addOption("ENTIRE_TEXT", t.settingScopeEntireText)
					.setValue(this.plugin.settings.scope)
					.onChange(async (value: FirstInstanceScope) => {
						this.plugin.settings.scope = value;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		const excludeHeadingsSetting = new Setting(containerEl)
			.setName(t.settingExcludeHeadingsHeading)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.excludeHeadings)
					.onChange(async (value) => {
						this.plugin.settings.excludeHeadings = value;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		excludeHeadingsSetting.descEl.appendText(
			t.settingExcludeHeadingsDescPart1
		);
		excludeHeadingsSetting.descEl.createEl("a", {
			text: t.settingExcludeHeadingsDescLink,
			href: t.settingExcludeHeadingsLink,
		});
		excludeHeadingsSetting.descEl.appendText(
			t.settingExcludeHeadingsDescPart2
		);

		new Setting(containerEl)
			.setHeading()
			.setName(t.settingJlptHeading)
			.setDesc(t.settingJlptDesc);

		const jlptLevels: (keyof typeof this.plugin.settings.jlptLevelsToInclude)[] =
			["n5", "n4", "n3", "n2", "n1"];
		for (const level of jlptLevels) {
			new Setting(containerEl)
				.setName(t.settingJlptLevel(level))
				.addToggle((toggle) => {
					toggle
						.setValue(
							this.plugin.settings.jlptLevelsToInclude[level]
						)
						.onChange(async (value) => {
							this.plugin.settings.jlptLevelsToInclude[level] =
								value;
							await this.plugin.saveSettings();
						});
				});
		}

		new Setting(containerEl)
			.setHeading()
			.setName(t.settingCustomExclusionHeading);

		new Setting(containerEl)
			.setDesc(t.settingCustomExclusionDesc)
			.addTextArea((text: TextAreaComponent) => {
				text.setPlaceholder(t.settingCustomExclusionPlaceholder)
					.setValue(
						this.plugin.settings.customExclusionList.join("\n")
					)
					.onChange(async (value) => {
						this.plugin.settings.customExclusionList = value
							.split("\n")
							.map((s) => s.trim())
							.filter(Boolean);
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 5;
				text.inputEl.cols = 30;
			});
	}
}

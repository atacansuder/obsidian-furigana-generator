import {
	App,
	Notice,
	PluginSettingTab,
	Setting,
	TextAreaComponent,
	Modal,
} from "obsidian";
import { getLangStrings } from "lang/translations";
import {
	FirstInstanceScope,
	LanguageSetting,
	JlptLevelsToInclude,
	FuriganaSyntax,
} from "lib/types";
import ObsidianFuriganaGenerator from "main";

export interface FuriganaGeneratorPluginSettings {
	language: LanguageSetting;
	scope: FirstInstanceScope;
	syntax: FuriganaSyntax;
	excludeHeadings: boolean;
	showInContextMenu: boolean;
	jlptLevelsToInclude: JlptLevelsToInclude;
	customExclusionList: string[];
}

export const DEFAULT_SETTINGS: FuriganaGeneratorPluginSettings = {
	language: "auto",
	scope: "ALL",
	syntax: "RUBY",
	excludeHeadings: true,
	showInContextMenu: true,
	jlptLevelsToInclude: {
		n5: true,
		n4: true,
		n3: true,
		n2: true,
		n1: true,
	},
	customExclusionList: [],
};

export class KanjisExclusionModal extends Modal {
	kanjis: string[];
	onSubmit: (shouldRemoveFurigana: boolean) => void;
	private textArea: TextAreaComponent;
	plugin: ObsidianFuriganaGenerator;
	private shouldRemoveFurigana = true;

	constructor(
		app: App,
		plugin: ObsidianFuriganaGenerator,
		kanjis: string[],
		onSubmit: (shouldRemoveFurigana: boolean) => void
	) {
		super(app);
		this.plugin = plugin;
		this.kanjis = kanjis;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		const t = getLangStrings(this.plugin.settings.language);

		contentEl.createEl("h2", { text: t.excludeKanjisModalTitle });
		contentEl.createEl("p", {
			text: t.excludeKanjisModalDesc,
		});

		new Setting(contentEl)
			.setName(t.excludeKanjisModalLabel)
			.addTextArea((text) => {
				this.textArea = text;
				text.setValue(this.kanjis.join("\n")).inputEl.setCssStyles({
					width: "100%",
					minHeight: "120px",
				});
			});

		new Setting(contentEl)
			.setName(t.excludeKanjiRemoveFuriganaToggle)
			.addToggle((toggle) =>
				toggle.setValue(this.shouldRemoveFurigana).onChange((value) => {
					this.shouldRemoveFurigana = value;
				})
			);

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(t.excludeKanjisModalConfirm)
					.setCta()
					.onClick(() => {
						this.onSubmit(this.shouldRemoveFurigana);
						this.close();
					})
			)
			.addButton((btn) =>
				btn.setButtonText(t.excludeKanjisModalCancel).onClick(() => {
					this.close();
				})
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class GeneralSettingTab extends PluginSettingTab {
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

		const syntaxSetting = new Setting(containerEl).setName("Syntax");

		syntaxSetting.descEl.appendText(
			"Select which syntax to use in editing mode for creating furigana."
		);

		const warningEl = syntaxSetting.descEl.createEl("p");
		warningEl.createEl("strong", {
			text: t.settingSyntaxWarningHeading,
			attr: { style: "color: red;" },
		});
		warningEl.appendText(` ${t.settingSyntaxWarningDescPart1}`);
		warningEl.createEl("a", {
			text: "Markdown Furigana",
			href: "https://github.com/steven-kraft/obsidian-markdown-furigana",
		});
		warningEl.appendText(t.settingSyntaxWarningDescPart2);
		warningEl.createEl("a", {
			text: "Japanese Novel Ruby",
			href: "https://github.com/k-quels/japanese-novel-ruby",
		});
		warningEl.appendText(t.settingSyntaxWarningDescPart3);

		syntaxSetting.addDropdown((dropdown) => {
			dropdown
				.addOption("RUBY", "Ruby")
				.addOption("MARKDOWN", "Markdown")
				.addOption("JAPANESE-NOVEL", "Japanese Novel")
				.setValue(this.plugin.settings.syntax)
				.onChange(async (value: FuriganaSyntax) => {
					this.plugin.settings.syntax = value;
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
			.setName(t.settingShowInContextMenuHeading)
			.setDesc(t.settingShowInContextMenuDesc)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.showInContextMenu)
					.onChange(async (value) => {
						this.plugin.settings.showInContextMenu = value;
						await this.plugin.saveSettings();
					});
			});

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

		containerEl.createEl("hr");
		const donationDiv = containerEl.createEl("div", {
			attr: {
				style: "text-align: center;",
			},
		});
		donationDiv.createEl("p", {
			text: t.settingCoffeeText,
		});
		const donationLink = donationDiv.createEl("a", {
			href: "https://www.buymeacoffee.com/asuder",
		});

		donationLink.innerHTML = `<img style="height: 50px" src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee">`;
	}
}

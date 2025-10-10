import { LanguageSetting } from "lib/types";
import { moment } from "obsidian";

interface Translations {
	// Command/Menu
	addFuriganaSelection: string;
	removeFuriganaSelection: string;
	addFuriganaDocument: string;
	removeFuriganaDocument: string;
	fsNotSupported: string;

	// Settings
	settingLanguage: string;
	settingLanguageDesc: string;
	settingLanguageOptAuto: string;
	settingLanguageOptEn: string;
	settingLanguageOptJa: string;
	settingReloadNotice: string;

	settingScopeHeading: string;
	settingScopeDesc: string;
	settingScopeAll: string;
	settingScopeParagraph: string;
	settingScopeSentence: string;
	settingScopeEntireText: string;

	settingExcludeHeadingsHeading: string;
	settingExcludeHeadingsDescPart1: string;
	settingExcludeHeadingsDescLink: string;
	settingExcludeHeadingsDescPart2: string;
	settingExcludeHeadingsLink: string;

	settingJlptHeading: string;
	settingJlptDesc: string;
	settingJlptLevel: (level: string) => string;

	settingCustomExclusionHeading: string;
	settingCustomExclusionName: string;
	settingCustomExclusionDesc: string;
	settingCustomExclusionPlaceholder: string;
}

const en: Translations = {
	addFuriganaSelection: "Add furigana to selection",
	removeFuriganaSelection: "Remove furigana from selection",
	addFuriganaDocument: "Add furigana to document",
	removeFuriganaDocument: "Remove furigana from document",
	fsNotSupported:
		"Furigana Generator plugin requires a local filesystem and is not supported on this platform.",

	settingLanguage: "Language",
	settingLanguageDesc:
		"Set the plugin's interface language. 'Auto' will use Obsidian's language setting.",
	settingLanguageOptAuto: "Auto",
	settingLanguageOptEn: "English",
	settingLanguageOptJa: "日本語",
	settingReloadNotice:
		"Plugin language updated. Please reload Obsidian for the changes to take full effect in the command palette and menus.",

	settingScopeHeading: "Furigana generation scope",
	settingScopeDesc:
		"Choose the scope where furigana will be added. A smaller scope can improve performance in large documents.",
	settingScopeAll: "Every occurance",
	settingScopeSentence: "First occurance in each sentence",
	settingScopeParagraph: "First occurance  in each paragraph",
	settingScopeEntireText: "First occurance in the entire target text",

	settingExcludeHeadingsHeading: "Exclude headings",
	settingExcludeHeadingsDescPart1:
		"If enabled, headings will be excluded from furigana generation. Be careful when deactivating this, since this can cause problems for ",
	settingExcludeHeadingsDescLink: "links to headings",
	settingExcludeHeadingsDescPart2: ".",
	settingExcludeHeadingsLink:
		"https://help.obsidian.md/links#Link+to+a+heading+in+a+note",

	settingJlptHeading: "JLPT Filtering",
	settingJlptDesc:
		"Toggle off a level to exclude its kanji from Furigana generation.",
	settingJlptLevel: (level: string) =>
		`Include kanji from JLPT ${level.toUpperCase()}`,

	settingCustomExclusionHeading: "Custom Exclusion List",
	settingCustomExclusionName: "Kanji to exclude",
	settingCustomExclusionDesc:
		"Add words here to exclude them from furigana generation. Please add one word per line. Verbs must be in their basic (dictionary) form.",
	settingCustomExclusionPlaceholder: "e.g.\n日本語\n食べる\n字",
};

const ja: Translations = {
	addFuriganaSelection: "選択範囲にルビを振る",
	removeFuriganaSelection: "選択範囲のルビを削除",
	addFuriganaDocument: "ドキュメント全体にルビを振る",
	removeFuriganaDocument: "ドキュメント全体のルビを削除",
	fsNotSupported:
		"Furigana Generatorプラグインはローカルファイルシステムを必要とするため、このプラットフォームではサポートされていません。",

	settingLanguage: "言語",
	settingLanguageDesc:
		"プラグインのインターフェース言語を設定します。「自動」に設定するとObsidianの言語設定が使用されます。",
	settingLanguageOptAuto: "自動",
	settingLanguageOptEn: "English",
	settingLanguageOptJa: "日本語",
	settingReloadNotice:
		"プラグインの言語を更新しました。コマンドパレットやメニューに完全に反映させるには、Obsidianをリロードしてください。",

	settingScopeHeading: "最初の漢字だけにふりがなをつける",
	settingScopeDesc:
		"どの範囲でふりがなをつけるかを選びます。範囲を小さくすると、大きなドキュメントでも動作が軽くなります。",
	settingScopeAll: "すべての漢字",
	settingScopeSentence: "文の最初の漢字",
	settingScopeParagraph: "段落の最初の漢字",
	settingScopeEntireText: "最初の出現のみ",

	settingExcludeHeadingsHeading: "見出しを除外",
	settingExcludeHeadingsDescPart1:
		"有効にすると、見出し部分にはふりがなが生成されません。無効にすると、",
	settingExcludeHeadingsDescLink: "見出しへのリンク",
	settingExcludeHeadingsDescPart2:
		"が正しく動作しなくなる可能性があるので注意してください。",
	settingExcludeHeadingsLink:
		"https://publish.obsidian.md/help-ja/%E3%82%AC%E3%82%A4%E3%83%89/%E5%86%85%E9%83%A8%E3%83%AA%E3%83%B3%E3%82%AF#%E8%A6%8B%E5%87%BA%E3%81%97%E3%81%B8%E3%81%AE%E3%83%AA%E3%83%B3%E3%82%AF",

	settingJlptHeading: "JLPTフィルター",
	settingJlptDesc:
		"レベルをオフにすると、そのレベルの漢字がルビ振りから除外されます。",
	settingJlptLevel: (level: string) =>
		`JLPT ${level.toUpperCase()}の漢字を含める`,

	settingCustomExclusionHeading: "カスタム除外リスト",
	settingCustomExclusionName: "除外する漢字",
	settingCustomExclusionDesc:
		"ふりがな生成から除外する単語を、1行に1つずつ入力してください。動詞は必ず辞書形で指定します。",
	settingCustomExclusionPlaceholder: "例:\n日本語\n食べる\n字",
};

const localizations: Record<string, Translations> = {
	en,
	ja,
};

export function getLangStrings(languageSetting: LanguageSetting): Translations {
	let lang = languageSetting;

	if (lang === "auto") {
		lang = moment.locale() as LanguageSetting;
	}

	return localizations[lang] || en;
}

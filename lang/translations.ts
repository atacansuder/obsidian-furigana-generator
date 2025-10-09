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
	settingJlptHeading: string;
	settingJlptDesc: string;
	settingJlptLevel: (level: string) => string;
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

	settingJlptHeading: "JLPT Filtering",
	settingJlptDesc:
		"Toggle off a level to exclude its kanji from Furigana generation.",
	settingJlptLevel: (level: string) =>
		`Include kanji from JLPT ${level.toUpperCase()}`,
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

	settingJlptHeading: "JLPTフィルター",
	settingJlptDesc:
		"レベルをオフにすると、そのレベルの漢字がルビ振りから除外されます。",
	settingJlptLevel: (level: string) =>
		`JLPT ${level.toUpperCase()}の漢字を含める`,
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

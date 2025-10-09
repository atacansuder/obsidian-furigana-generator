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
	settingLanguageOptJa: "Japanese",
	settingReloadNotice:
		"Plugin language updated. Please reload Obsidian for the changes to take full effect in the command palette and menus.",
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
	settingLanguageOptEn: "英語 (English)",
	settingLanguageOptJa: "日本語",
	settingReloadNotice:
		"プラグインの言語を更新しました。コマンドパレットやメニューに完全に反映させるには、Obsidianをリロードしてください。",
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

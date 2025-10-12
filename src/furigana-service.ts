import * as wanakana from "wanakana";
import { Notice } from "obsidian";

import {
	FirstInstanceScope,
	JlptLevelsToInclude,
	FuriganaSyntax,
	LanguageSetting,
} from "lib/types";
import { jlptN5, jlptN4, jlptN3, jlptN2, jlptN1 } from "data/kanji-sets";
import { getLangStrings } from "../lang/translations";

type Tokenizer = any;

export class FuriganaService {
	private tokenizer: Tokenizer | undefined;
	private dictionaryPath: string;
	private languageSetting: LanguageSetting;

	constructor(basePath: string, languageSetting: LanguageSetting) {
		this.dictionaryPath = `${basePath}/dict/`;
		this.languageSetting = languageSetting;
	}

	async initialize() {
		const t = getLangStrings(this.languageSetting);
		try {
			const kuromoji = await import("@patdx/kuromoji");
			const { default: NodeDictionaryLoader } = await import(
				"@patdx/kuromoji/node"
			);

			this.tokenizer = await new kuromoji.TokenizerBuilder({
				loader: new NodeDictionaryLoader({
					dic_path: this.dictionaryPath,
				}),
			}).build();
		} catch (error) {
			console.error(`[Obsidian Furigana Generator]: ${error}`);
			new Notice(t.noticeDictionaryNotFound);
		}
	}

	public async generateFurigana(
		text: string,
		jlptLevelsToInclude: JlptLevelsToInclude,
		scope: FirstInstanceScope,
		excludeHeadings: boolean,
		customExclusionList: string[],
		syntax: FuriganaSyntax
	): Promise<string> {
		const placeholders: string[] = [];

		const headingPattern = excludeHeadings ? "|(?:^|\\n)#{1,6} .+$" : "";
		const exclusionRegex = new RegExp(
			`(` +
				`<ruby>.*?<\\/rt><\\/ruby>|` + // Ruby tags with rt closing
				`\\{.*?\\|.*?\\}|` + // Markdown
				`.*?《.*?》|` + // Japanese novel ruby
				`\\[\\[.*?\\]\\]|` + // Obsidian internal links
				`\\[.*?\\]\\(.*?\\)|` + // Markdown external links
				`https?:\\/\\/\\S+|` + // Bare URLs
				`#\\S+|` + // Tags
				`\`[^\`]*\`|` + // Inline code
				`\`\`\`[\\s\\S]*?\`\`\`|` + // Code blocks
				`<%.*?%>|` + // Templater commands
				`\\[\\^.*?\\]|` + // Footnote references
				`(?:^|\\n)---\\n[\\s\\S]*?\\n---|` + // YAML frontmatter
				`%%.*?%%` + // Obsidian comments
				`${headingPattern}` +
				`)`,
			"gm"
		);
		let placeholderIndex = 0;

		const textWithPlaceholders = text.replace(exclusionRegex, (match) => {
			const placeholder = `__EXCLUDED_PLACEHOLDER_${placeholderIndex}__`;
			placeholders[placeholderIndex] = match;
			placeholderIndex++;
			return placeholder;
		});

		let processedText: string;

		switch (scope) {
			case "PARAGRAPH":
				const paragraphs = textWithPlaceholders.split("\n");
				processedText = paragraphs
					.map((paragraph) => {
						const seenInParagraph = new Set<string>();
						return this.processText(
							paragraph,
							jlptLevelsToInclude,
							scope,
							seenInParagraph,
							customExclusionList,
							syntax
						);
					})
					.join("\n");
				break;
			case "SENTENCE":
				const paragraphSeparated = textWithPlaceholders.split("\n");
				const sentenceRegex = /(?<=[。！？])/g;
				processedText = paragraphSeparated
					.map((paragraph) => {
						const sentences = paragraph.split(sentenceRegex);
						return sentences
							.map((sentence) => {
								if (sentence.trim() === "") return sentence;
								const seenInSentence = new Set<string>();
								return this.processText(
									sentence,
									jlptLevelsToInclude,
									scope,
									seenInSentence,
									customExclusionList,
									syntax
								);
							})
							.join("");
					})
					.join("\n");
				break;
			case "ENTIRE_TEXT":
			case "ALL":
			default:
				const seenWords = new Set<string>();
				processedText = this.processText(
					textWithPlaceholders,
					jlptLevelsToInclude,
					scope,
					seenWords,
					customExclusionList,
					syntax
				);
				break;
		}

		placeholders.forEach((originalTag, index) => {
			const placeholder = `__EXCLUDED_PLACEHOLDER_${index}__`;
			processedText = processedText.replace(placeholder, originalTag);
		});

		return processedText;
	}

	public async removeFurigana(text: string): Promise<string> {
		const furiganaRegex =
			/<ruby>(.*?)<rt>.*?<\/rt><\/ruby>|\{(.+?)\|.+?\}|(.+?)《.+?》/g;
		return text.replace(
			furiganaRegex,
			(_match, ruby, markdown, novel) => ruby || markdown || novel
		);
	}

	public async extractKanjis(text: string): Promise<string[]> {
		const t = getLangStrings(this.languageSetting);
		if (!this.tokenizer) {
			new Notice(t.fsNotSupported);
			return [];
		}
		const tokens = this.tokenizer?.tokenize(text);
		const kanjis = tokens.flatMap((token: { basic_form: string }) =>
			/[一-龯]/u.test(token.basic_form) ? [token.basic_form] : []
		);

		return kanjis;
	}

	private processText(
		text: string,
		jlptLevelsToInclude: JlptLevelsToInclude,
		scope: FirstInstanceScope,
		seenWords: Set<string>,
		customExclusionList: string[],
		syntax: FuriganaSyntax
	): string {
		const t = getLangStrings(this.languageSetting);
		if (!this.tokenizer) {
			new Notice(t.fsNotSupported);
			return text;
		}

		const kanjiToSkipSet = new Set<String>();
		const levelMap = {
			n5: jlptN5,
			n4: jlptN4,
			n3: jlptN3,
			n2: jlptN2,
			n1: jlptN1,
		};

		for (const level in jlptLevelsToInclude) {
			if (!jlptLevelsToInclude[level as keyof JlptLevelsToInclude]) {
				levelMap[level as keyof typeof levelMap].forEach((kanji) =>
					kanjiToSkipSet.add(kanji)
				);
			}
		}

		const customExclusionSet = new Set(customExclusionList);

		const tokens = this.tokenizer.tokenize(text);
		const kanjiRegex: RegExp = /[一-龯]/u;

		return tokens
			.map(
				(token: {
					surface_form: string;
					basic_form: string;
					reading: string;
					word_type: string;
				}) => {
					const surface = token.surface_form;
					const basicForm = token.basic_form;
					const reading = token.reading;

					if (
						surface.startsWith("__EXCLUDED_PLACEHOLDER_") ||
						customExclusionSet.has(basicForm) ||
						!kanjiRegex.test(surface) ||
						!reading ||
						token.word_type === "UNKNOWN" ||
						(scope !== "ALL" && seenWords.has(surface))
					) {
						return surface;
					}

					const kanjiCharsInToken = [...surface].filter((char) =>
						kanjiRegex.test(char)
					);
					if (
						kanjiCharsInToken.length > 0 &&
						kanjiCharsInToken.every((kanji) =>
							kanjiToSkipSet.has(kanji)
						)
					) {
						return surface;
					}

					const hiraganaReading = wanakana.toHiragana(reading);
					if (surface === hiraganaReading) {
						return surface;
					}

					if (scope !== "ALL") {
						seenWords.add(surface);
					}

					let result = "";
					let surfaceIndex = 0;
					let readingIndex = 0;
					while (surfaceIndex < surface.length) {
						if (wanakana.isKanji(surface[surfaceIndex])) {
							let kanjiSequence = "";
							while (
								surfaceIndex < surface.length &&
								wanakana.isKanji(surface[surfaceIndex])
							) {
								kanjiSequence += surface[surfaceIndex];
								surfaceIndex++;
							}

							let hiraganaPart = "";
							// Find the corresponding reading part for the kanji sequence
							let tempReadingIndex = readingIndex;
							let nextKanaIndex = -1;

							if (surfaceIndex < surface.length) {
								const nextKana = surface[surfaceIndex];
								nextKanaIndex = hiraganaReading.indexOf(
									nextKana,
									tempReadingIndex
								);
							}

							if (nextKanaIndex !== -1) {
								hiraganaPart = hiraganaReading.substring(
									readingIndex,
									nextKanaIndex
								);
								readingIndex = nextKanaIndex;
							} else {
								hiraganaPart =
									hiraganaReading.substring(readingIndex);
								readingIndex = hiraganaReading.length;
							}

							if (kanjiSequence !== hiraganaPart) {
								switch (syntax) {
									case "MARKDOWN":
										result += `{${kanjiSequence}|${hiraganaPart}}`;
										break;
									case "JAPANESE-NOVEL":
										result += `${kanjiSequence}《${hiraganaPart}》`;
										break;
									case "RUBY":
									default:
										result += `<ruby>${kanjiSequence}<rt>${hiraganaPart}</rt></ruby>`;
										break;
								}
							} else {
								result += kanjiSequence;
							}
						} else {
							const char = surface[surfaceIndex];
							result += char;
							if (hiraganaReading[readingIndex] === char) {
								readingIndex++;
							}
							surfaceIndex++;
						}
					}
					return result;
				}
			)
			.join("");
	}
}

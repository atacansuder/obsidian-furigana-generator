import { Notice } from "obsidian";

import {
	FirstInstanceScope,
	JlptLevelsToInclude,
	FuriganaSyntax,
	LanguageSetting,
} from "lib/types";
import { jlptN5, jlptN4, jlptN3, jlptN2, jlptN1 } from "data/kanji-sets";
import { getLangStrings } from "../lang/translations";

// Defining these types here because I could not import them from the module
interface IpadicFeatures {
	word_id: number;
	word_type: string;
	word_position: number;
	surface_form: string;
	pos: string;
	pos_detail_1: string;
	pos_detail_2: string;
	pos_detail_3: string;
	conjugated_type: string;
	conjugated_form: string;
	basic_form: string;
	reading?: string;
	pronunciation?: string;
}

interface Tokenizer {
	tokenize(text: string): IpadicFeatures[];
	tokenizeForSentence(
		sentence: string,
		tokens: IpadicFeatures[]
	): IpadicFeatures[];
	getLattice(text: string): unknown;
}

export class FuriganaService {
	private tokenizer: Tokenizer | undefined;
	private dictionaryPath: string;
	private languageSetting: LanguageSetting;

	constructor(basePath: string, languageSetting: LanguageSetting) {
		this.dictionaryPath = `${basePath}/`;
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
				// I had to exclude formatted text because the format wouldn't be reestablished correctly after furigana generation
				`\\*\\*.*?\\*\\*|` + // Bold with **
				`__.*?__|` + // Bold with __
				`\\*.*?\\*|` + // Italic with *
				`_.*?_|` + // Italic with _
				`~~.*?~~|` + // Strikethrough
				`==.*?==|` + // Highlight
				`\\[\\[.*?\\]\\]|` + // Obsidian internal links
				`\\[.*?\\]\\(.*?\\)|` + // Markdown external links
				`(?:^|\\n)>\\s*\\[![A-Z-]+\\].*|` + // Callout titles
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
			.map((token: IpadicFeatures) => {
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

				const hiraganaReading = this.katakanaToHiragana(reading);
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
					if (kanjiRegex.test(surface[surfaceIndex])) {
						let kanjiSequence = "";
						let tempSurfaceIndex = surfaceIndex;
						while (
							tempSurfaceIndex < surface.length &&
							kanjiRegex.test(surface[tempSurfaceIndex])
						) {
							kanjiSequence += surface[tempSurfaceIndex];
							tempSurfaceIndex++;
						}

						let hiraganaPart = "";
						let nextKanaIndexInReading = -1;

						// Find the next kana character in the surface form (if any)
						if (tempSurfaceIndex < surface.length) {
							const nextKana = this.katakanaToHiragana(
								surface[tempSurfaceIndex]
							);
							nextKanaIndexInReading = hiraganaReading.indexOf(
								nextKana,
								readingIndex
							);
						}

						if (nextKanaIndexInReading !== -1) {
							hiraganaPart = hiraganaReading.substring(
								readingIndex,
								nextKanaIndexInReading
							);
							readingIndex = nextKanaIndexInReading;
						} else {
							// Kanji is at the end of the word
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
						surfaceIndex = tempSurfaceIndex;
					} else {
						const char = surface[surfaceIndex];
						result += char;
						if (
							readingIndex < hiraganaReading.length &&
							this.katakanaToHiragana(char) ===
								hiraganaReading[readingIndex]
						) {
							readingIndex++;
						}
						surfaceIndex++;
					}
				}
				return result;
			})
			.join("");
	}

	// This function does not handle cases like long wovels, which does not get generated by the tokenizer anyway.
	private katakanaToHiragana(katakana: string): string {
		let hiragana = "";
		for (let i = 0; i < katakana.length; i++) {
			const charCode = katakana.charCodeAt(i);
			// Check if the character code is within the Katakana range
			if (charCode >= 0x30a1 && charCode <= 0x30fa) {
				// Subtract 96 to get the corresponding Hiragana character
				hiragana += String.fromCharCode(charCode - 0x60);
			} else {
				hiragana += katakana[i];
			}
		}
		return hiragana;
	}
}

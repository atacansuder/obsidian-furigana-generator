import * as kuromoji from "@patdx/kuromoji";
import * as wanakana from "wanakana";
import NodeDictionaryLoader from "@patdx/kuromoji/node";
import { Notice } from "obsidian";

import { FirstInstanceScope, JlptLevelsToInclude } from "lib/types";
import { jlptN5, jlptN4, jlptN3, jlptN2, jlptN1 } from "data/kanji-sets";

type Tokenizer = Awaited<
	ReturnType<InstanceType<typeof kuromoji.TokenizerBuilder>["build"]>
>;

export class FuriganaService {
	private tokenizer: Tokenizer | undefined;
	private dictionaryPath: string;

	constructor(basePath: string) {
		this.dictionaryPath = `${basePath}/node_modules/@patdx/kuromoji/dict/`;
	}

	async initialize() {
		try {
			this.tokenizer = await new kuromoji.TokenizerBuilder({
				loader: new NodeDictionaryLoader({
					dic_path: this.dictionaryPath,
				}),
			}).build();
			console.log("Tokenizer initialized!");
		} catch (error) {
			console.error("Error initializing tokenizer: ", error);
			new Notice(
				"Furigana dictionary not found. Please try reinstalling the plugin."
			);
		}
	}

	public async generateFurigana(
		text: string,
		jlptLevelsToInclude: JlptLevelsToInclude,
		scope: FirstInstanceScope,
		excludeHeadings: boolean,
		customExclusionList: string[]
	): Promise<string> {
		const placeholders: string[] = [];

		const headingPattern = excludeHeadings ? "|(?:^|\\n)#{1,6} .+$" : "";
		// Existing ruby tags, external and internal links, code blocks, file properties, headings (optional)
		const exclusionRegex = new RegExp(
			`(<ruby>.*?<\\/rt><\\/ruby>|\\[\\[.*?\\]\\]|\\[.*?\\]\\(.*?\\)|#\\S+|\`[^\`]*\`|\`\`\`[\\s\\S]*?\`\`\`|(?:^|\\n)---\\n[\\s\\S]*?\\n---${headingPattern})`,
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
							customExclusionList
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
									customExclusionList
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
					customExclusionList
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
		const furiganaRegex = /<ruby>(.*?)<rt>.*?<\/rt><\/ruby>/g;
		return text.replace(furiganaRegex, "$1");
	}

	private processText(
		text: string,
		jlptLevelsToInclude: JlptLevelsToInclude,
		scope: FirstInstanceScope,
		seenWords: Set<string>,
		customExclusionList: string[]
	): string {
		if (!this.tokenizer) {
			new Notice(
				"Furigana generator is not ready, please wait for the plugin to load."
			);
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

		console.log(customExclusionList);

		const tokens = this.tokenizer.tokenize(text);
		const kanjiRegex: RegExp = /[一-龯]/u;

		console.log(tokens);

		return tokens
			.map((token) => {
				const surface = token.surface_form;
				const basicForm = token.basic_form;

				if (surface.startsWith("__EXCLUDED_PLACEHOLDER_")) {
					return surface;
				}

				if (customExclusionSet.has(basicForm)) {
					return surface;
				}

				const reading = token.reading;

				if (!reading || token.word_type === "UNKNOWN") {
					return surface;
				}

				if (!kanjiRegex.test(surface)) {
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

				if (scope !== "ALL" && seenWords.has(surface)) {
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
							result += `<ruby>${kanjiSequence}<rt>${hiraganaPart}</rt></ruby>`;
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
			})
			.join("");
	}
}

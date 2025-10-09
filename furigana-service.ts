import * as kuromoji from "@patdx/kuromoji";
import * as wanakana from "wanakana";
import NodeDictionaryLoader from "@patdx/kuromoji/node";
import { Notice } from "obsidian";

import { JlptLevelsToInclude } from "lib/types";
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
		jlptLevelsToInclude: JlptLevelsToInclude
	): Promise<string> {
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

		const placeholders: string[] = [];
		const rubyRegex = /<ruby>.*?<\/rt><\/ruby>/g;
		let placeholderIndex = 0;

		const textWithPlaceholders = text.replace(rubyRegex, (match) => {
			const placeholder = `__FURIGANA_PLACEHOLDER_${placeholderIndex}__`;
			placeholders[placeholderIndex] = match;
			placeholderIndex++;
			return placeholder;
		});

		const tokens = this.tokenizer.tokenize(textWithPlaceholders);
		const kanjiRegex: RegExp = /[一-龯]/u;
		let processedText = tokens
			.map((token) => {
				const surface = token.surface_form;

				if (surface.startsWith("__FURIGANA_PLACEHOLDER_")) {
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

				const hiraganaReading = wanakana.toHiragana(reading);
				if (surface === hiraganaReading) {
					return surface;
				}

				return `<ruby>${surface}<rt>${hiraganaReading}</rt></ruby>`;
			})
			.join("");

		placeholders.forEach((originalTag, index) => {
			const placeholder = `__FURIGANA_PLACEHOLDER_${index}__`;
			processedText = processedText.replace(placeholder, originalTag);
		});

		return processedText;
	}

	public async removeFurigana(text: string): Promise<string> {
		const furiganaRegex = /<ruby>(.*?)<rt>.*?<\/rt><\/ruby>/g;
		return text.replace(furiganaRegex, "$1");
	}
}

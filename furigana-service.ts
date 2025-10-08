import * as kuromoji from "@patdx/kuromoji";
import * as wanakana from "wanakana";
import NodeDictionaryLoader from "@patdx/kuromoji/node";
import { Notice } from "obsidian";

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

	public async generateFurigana(text: string): Promise<string> {
		if (!this.tokenizer) {
			new Notice(
				"Furigana generator is not ready, please wait for the plugin to load."
			);
			return text;
		}

		const tokens = this.tokenizer.tokenize(text);
		const kanjiRegex: RegExp = /[一-龯]/u;
		const result = tokens
			.map((token) => {
				const surface = token.surface_form;
				const reading = token.reading;

				if (!reading || token.word_type === "UNKNOWN") {
					return surface;
				}

				if (!kanjiRegex.test(surface)) {
					return surface;
				}

				const hiraganaReading = wanakana.toHiragana(reading);
				if (surface === hiraganaReading) {
					return surface;
				}

				return `<ruby>${surface}<rt>${hiraganaReading}</rt></ruby>`;
			})
			.join("");

		console.log(tokens);
		return result;
	}

	public async removeFurigana(text: string): Promise<string> {
		const furiganaRegex = /<ruby>(.*?)<rt>.*?<\/rt><\/ruby>/g;
		return text.replace(furiganaRegex, "$1");
	}
}

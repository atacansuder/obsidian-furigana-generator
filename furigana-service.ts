import * as kuromoji from "@patdx/kuromoji";
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
}

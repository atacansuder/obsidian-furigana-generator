export type LanguageSetting = "auto" | "en" | "ja";
export type JlptLevelsToInclude = {
	n5: boolean;
	n4: boolean;
	n3: boolean;
	n2: boolean;
	n1: boolean;
};
export type FirstInstanceScope =
	| "ENTIRE_TEXT"
	| "PARAGRAPH"
	| "SENTENCE"
	| "ALL";

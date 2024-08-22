import { ParserOptions, SupportOption } from 'prettier';

interface PluginOptions {
	wrapText: boolean;
	expandNull: boolean;
}

export interface PrettierOptions extends ParserOptions, PluginOptions {}

export const options: {
	[K in keyof PluginOptions]: SupportOption;
} = {
	wrapText: {
		category: 'Global',
		type: 'boolean',
		description: 'Wether to wrap text or not',
		default: false,
	},
	expandNull: {
		category: 'Global',
		type: 'boolean',
		description:
			'Wether to expand ?int (and other types) to int|null or not',
		default: false,
	},
};

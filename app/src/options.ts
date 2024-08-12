import { ParserOptions, SupportOption } from 'prettier';

interface PluginOptions {
	phpDocPrintWidth?: number;
	wrapText: boolean;
	indent?: string;
}

export interface PrettierOptions extends ParserOptions, PluginOptions {}

export const options: {
	[K in keyof PluginOptions]: SupportOption;
} = {
	phpDocPrintWidth: {
		category: 'Global',
		type: 'int',
		description: 'Print width for PHPDoc (defaults to `printWidth`)',
	},
	wrapText: {
		category: 'Global',
		type: 'boolean',
		description: 'Wether to wrap text or not',
		default: false,
	},
	indent: {
		category: 'Global',
		type: 'string',
		description: 'Indent to use, defaults to prettier config',
	},
};

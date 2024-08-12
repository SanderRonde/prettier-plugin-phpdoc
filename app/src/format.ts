import { Program } from 'php-parser';
import { Parser, ParserOptions } from 'prettier';
import { parseComment } from './comment-parser';
import { printComment } from './comment-printer';

const LINE_PREFIX = ' * ';
function formatPhpDoc(text: string, program: Program, options: ParserOptions) {
	if (!program.comments) {
		return program;
	}
	const lines = text.split('\n');
	// Wow they conveniently put all comments in a single top-level array
	program.comments = program.comments.map((comment) => {
		if (comment.kind === 'commentline') {
			return comment;
		}

		let defaultIndent = '';
		if (comment.loc?.start.column) {
			// If column is 0, it's always empty, regardless of the character used
			const line = lines[comment.loc.start.line - 1];
			defaultIndent = line.slice(0, comment.loc.start.column);
		}
		const parsed = parseComment(comment.value);
		comment.value = `/**\n${printComment(
			parsed,
			options,
			defaultIndent + LINE_PREFIX
		)
			.map((line) => LINE_PREFIX + line)
			.join('\n')}\n */`;
		return comment;
	});
	return program;
}

export const getParsers = () => ({
	get php() {
		const pluginPhp = (() => {
			try {
				return require('@prettier/plugin-php') as {
					parsers: {
						php: Parser<Program>;
					};
				};
			} catch (e) {
				throw new Error(
					'PHP parser not found, please install @prettier/plugin-php'
				);
			}
		})();
		const parserParse = pluginPhp.parsers.php.parse;
		return {
			...pluginPhp.parsers.php,
			parse: parserParse
				? (text: string, options: ParserOptions) => {
						const parsed = parserParse(text, options);
						if ('then' in parsed) {
							return parsed.then((program: Program) =>
								formatPhpDoc(text, program, options)
							);
						}
						return formatPhpDoc(text, parsed, options);
					}
				: formatPhpDoc,
		};
	},
});

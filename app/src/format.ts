import { Program } from 'php-parser';
import { Parser } from 'prettier';
import { parseComment } from './comment-parser';
import { printComment } from './comment-printer';
import { PrettierOptions } from './options';

const LINE_PREFIX = ' * ';
const COMMENT_START = '/**';
const COMMENT_END = ' */';
function formatPhpDoc(
	text: string,
	program: Program,
	options: PrettierOptions
) {
	if (!program.comments) {
		return program;
	}
	const lines = text.split('\n');
	// Wow they conveniently put all comments in a single top-level array
	program.comments = program.comments.map((comment) => {
		if (
			comment.kind === 'commentline' ||
			!comment.value.startsWith('/**')
		) {
			return comment;
		}

		let defaultIndent = '';
		if (comment.loc?.start.column) {
			// If column is 0, it's always empty, regardless of the character used
			const line = lines[comment.loc.start.line - 1];
			defaultIndent = line.slice(0, comment.loc.start.column);
		}
		const isMultiline = comment.value.includes('\n');
		const parsed = parseComment(comment);
		const padding = defaultIndent + `${COMMENT_START} ${COMMENT_END}`;
		const printedCommentLines = printComment(
			parsed,
			options,
			// We pick the longest possible indent here. This ensures we don't end
			// up in an instable state. If we were to pick the shortest indent when
			// the comment is multiline, that would lead to a situation where we have
			// a long indent, then wrap it to multiline, then we call the same thing
			// again but with a shorter max indent, leading to some text possibly wrapping.
			padding
		);
		if (
			isMultiline ||
			printedCommentLines.length > 1 ||
			printedCommentLines[0].length + padding.length > options.printWidth
		) {
			comment.value = `${COMMENT_START}\n${printedCommentLines
				.map((line) => LINE_PREFIX + line)
				.join('\n')}\n${COMMENT_END}`;
		} else {
			comment.value = `${COMMENT_START} ${printedCommentLines[0]}${COMMENT_END}`;
		}
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
				? (text: string, options: PrettierOptions) => {
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

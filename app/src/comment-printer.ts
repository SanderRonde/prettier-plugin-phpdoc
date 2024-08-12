import { ParserOptions } from 'prettier';
import { CommentNodeType, ParsedCommentNode } from './comment-parser';
import { printType } from './type-printer';
import { trimSpaces } from './util';

function wrapText(text: string, width: number, initialLine?: string): string[] {
	const textLines = text.split('\n');
	const lines: string[] = [];
	for (let i = 0; i < textLines.length; i++) {
		let line = i === 0 && initialLine ? initialLine : '';
		for (const word of textLines[i].split(' ')) {
			if (line.length + word.length > width) {
				lines.push(trimSpaces(line));
				line = '';
			}
			line += word + ' ';
		}
		lines.push(trimSpaces(line));
	}
	return lines;
}

export function printComment(
	nodes: ParsedCommentNode[],
	options: ParserOptions,
	defaultIndent: string
): string[] {
	const remainingWidth =
		options.printWidth - (defaultIndent.length + ' * '.length);

	const lines: string[] = [];
	for (const node of nodes) {
		if (node.type === CommentNodeType.Text) {
			// Plain text, now wrap it to the desired line length
			lines.push(...wrapText(node.content, remainingWidth));
		} else if (!node.parsedType) {
			// No type, this just follows the format `@tag description`. We can wrap as above
			lines.push(
				...wrapText(`${node.tag} ${node.description}`, remainingWidth)
			);
		} else {
			// The type needs to be printed and wrapped in the process.
			const unwrappedType = printType(
				node.parsedType,
				options,
				false
			).join('');
			const descriptionParts = node.description.split(' ');
			const unwrappedMinLine = trimSpaces(
				`${node.tag} ${unwrappedType} ${descriptionParts[0]}`
			);
			if (unwrappedMinLine.length <= remainingWidth) {
				// No need to wrap the type, just print this
				lines.push(
					...wrapText(
						node.description ? ` ${node.description}` : '',
						remainingWidth,
						`${node.tag} ${unwrappedType}`
					)
				);
			} else {
				// The type needs to be wrapped
				const wrappedType = printType(node.parsedType, options, true);
				lines.push(`${node.tag} ${wrappedType[0]}`);
				lines.push(...wrappedType.slice(1, -1));
				if (wrappedType.length > 1) {
					lines.push(
						...wrapText(
							node.description ? ` ${node.description}` : '',
							remainingWidth,
							wrappedType[wrappedType.length - 1]
						)
					);
				}
			}
		}
	}
	return lines;
}

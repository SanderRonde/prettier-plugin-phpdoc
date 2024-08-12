import { CommentNodeType, ParsedCommentNode } from './comment-parser';
import { getNextWrapLevel, printType, WrapLevel } from './type-printer';
import { trimSpaces } from './util';
import { PrettierOptions } from './options';

interface WrapConfig {
	width: number;
	tabWidth: number;
	shouldWrap: boolean;
}

function pushWrappingText(
	text: string,
	config: WrapConfig,
	initialLine?: string
): string[] {
	const textLines = text.split('\n');
	const lines: string[] = [];
	for (let i = 0; i < textLines.length; i++) {
		let line = i === 0 && initialLine ? initialLine : '';
		for (const word of textLines[i].split(' ')) {
			if (
				config.shouldWrap &&
				(line + word).replace(/\t/g, () => ' '.repeat(config.tabWidth))
					.length > config.width
			) {
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
	options: PrettierOptions,
	defaultIndent: string
): string[] {
	const remainingWidth =
		(options.phpDocPrintWidth || options.printWidth) -
		(defaultIndent.length + ' * '.length);

	const config: WrapConfig = {
		width: remainingWidth,
		tabWidth: options.tabWidth,
		shouldWrap: options.wrapText,
	};
	const lines: string[] = [];
	for (const node of nodes) {
		if (node.type === CommentNodeType.Text) {
			// Plain text, now wrap it to the desired line length
			lines.push(...pushWrappingText(node.content, config));
		} else if (!node.parsedType) {
			// No type, this just follows the format `@tag description`. We can wrap as above
			lines.push(
				...pushWrappingText(`${node.tag} ${node.description}`, config)
			);
		} else {
			// The type needs to be printed and wrapped in the process.
			let wrapLevel: WrapLevel | null = WrapLevel.Never;
			const unwrappedType = printType(
				node.parsedType,
				options,
				wrapLevel
			).join('');
			const descriptionParts = node.description.split(' ');
			const unwrappedMinLine = trimSpaces(
				`${node.tag} ${unwrappedType} ${descriptionParts[0]}`
			);
			if (unwrappedMinLine.length <= remainingWidth) {
				// No need to wrap the type, just print this
				lines.push(
					...pushWrappingText(
						node.description ? ` ${node.description}` : '',
						config,
						`${node.tag} ${unwrappedType}`
					)
				);
			} else {
				// The type needs to be wrapped, see what level we can get away with
				wrapLevel = WrapLevel.L1;
				let wrappedType: string[] = [];
				do {
					wrappedType = printType(
						node.parsedType,
						options,
						wrapLevel
					);
					wrapLevel = getNextWrapLevel(wrapLevel);
				} while (
					wrapLevel &&
					[`${node.tag} ${wrappedType[0]}`, ...wrappedType].some(
						(line) => line.length > remainingWidth
					)
				);

				lines.push(`${node.tag} ${wrappedType[0]}`);
				lines.push(...wrappedType.slice(1));
				if (node.description) {
					lines[lines.length - 1] += ` ${descriptionParts[0]}`;
				}
				if (descriptionParts.length > 1) {
					lines.push(
						...pushWrappingText(
							` ${descriptionParts.slice(1)}`,
							config
						)
					);
				}
			}
		}
	}
	return lines;
}

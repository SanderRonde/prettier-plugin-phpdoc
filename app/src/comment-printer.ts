import { CommentNodeType, ParsedCommentNode } from './comment-parser';
import { getNextWrapLevel, printType, WrapLevel } from './type-printer';
import { trimSpacesRight } from './util';
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
				lines.push(trimSpacesRight(line));
				line = '';
			}
			line += word + ' ';
		}
		lines.push(trimSpacesRight(line));
	}
	return lines;
}

function pushToLines(lines: string[], text: string): string[] {
	const textLines = text.split('\n');
	if (lines.length === 0) {
		return textLines;
	}

	lines[lines.length - 1] += textLines[0];
	return [...lines, ...textLines.slice(1)];
}

export function printComment(
	nodes: ParsedCommentNode[],
	options: PrettierOptions,
	defaultIndent: string
): string[] {
	const remainingWidth =
		options.printWidth - (defaultIndent.length + ' * '.length);

	let didInsertNewline = false;
	const config: WrapConfig = {
		width: remainingWidth,
		tabWidth: options.tabWidth,
		shouldWrap: options.wrapText,
	};
	let lines: string[] = [];
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		if (node.type === CommentNodeType.Text) {
			// Plain text, now wrap it to the desired line length
			lines.push(...pushWrappingText(node.content, config));
		} else if (!node.parsedType) {
			// No type, this just follows the format `@tag description`. We can wrap as above
			lines.push(
				...pushWrappingText(`${node.tag} ${node.description}`, config)
			);
		} else {
			if (
				!didInsertNewline &&
				nodes[i - 1]?.type === CommentNodeType.Text
			) {
				lines.push('');
				didInsertNewline = true;
			}

			// The type needs to be printed and wrapped in the process.
			const descriptionParts = node.description.split(' ');
			const nonWrappingPartsLength = node.parsedType ? 2 : 1;
			const nonWrappingParts = descriptionParts
				.slice(0, nonWrappingPartsLength)
				.join(' ');

			let wrapLevel: WrapLevel | null = WrapLevel.Always;
			let formattedType: string[] = [];
			do {
				formattedType = printType(node.parsedType, options, wrapLevel);
				wrapLevel = getNextWrapLevel(wrapLevel);
			} while (
				wrapLevel &&
				[`${node.tag} ${formattedType[0]}`, ...formattedType].some(
					(line) => line.length > remainingWidth
				)
			);

			lines.push(`${node.tag} ${formattedType[0]}`);
			lines.push(...formattedType.slice(1));
			if (node.description) {
				lines = pushToLines(lines, ` ${nonWrappingParts}`);
			}
			if (descriptionParts.length > nonWrappingPartsLength) {
				const newLines = pushWrappingText(
					` ${descriptionParts.slice(nonWrappingPartsLength).join(' ')}`,
					config,
					lines[lines.length - 1]
				);
				lines.pop();
				lines.push(...newLines);
			}
		}
	}

	// Ensure there are no two adjacent empty lines
	const cleanedLines: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		if (lines[i - 1] === '' && lines[i] === '') {
			continue;
		}
		cleanedLines.push(lines[i]);
	}

	return cleanedLines;
}

import { trimSpacesleft, trimSpacesRight } from './util';
import { ParsedTypeNode, parseType } from './type-parser';
import { Comment } from 'php-parser';

const TAGS_WITH_TYPES = [
	'method',
	'param',
	'property',
	'return',
	'type',
	'throws',
	'var',
	'phpstan-var',
	'phpstan-param',
];

export enum CommentNodeType {
	Text,
	TextTag,
}

interface TextCommentNode {
	type: CommentNodeType.Text;
	content: string;
}

interface TagCommentNode {
	type: CommentNodeType.TextTag;
	tag: string;
	description: string;
}

type CommentNode = TextCommentNode | TagCommentNode;

function parseCommentNodes(comment: string) {
	// Strip out the comment markers
	comment = comment.replace(/^\/\*\*?/, '').replace(/\s*\*\/$/, '');
	// Strip out any asterisks
	comment = comment.replace(/^\s*\*+/gm, '');

	const lines = comment.split('\n');
	const nodes: CommentNode[] = [];
	for (let i = 0; i < lines.length; i++) {
		let trimmedLine = trimSpacesRight(lines[i]);
		if (trimmedLine[0] === ' ') {
			trimmedLine = trimmedLine.slice(1);
		}
		if (trimSpacesleft(trimmedLine).startsWith('@')) {
			const [tag, ...descriptionParts] =
				trimSpacesleft(trimmedLine).split(/\s/);
			const description = descriptionParts.join(' ');

			nodes.push({
				type: CommentNodeType.TextTag,
				tag,
				description,
			});
		} else {
			const lastNode = nodes[nodes.length - 1];
			if (lastNode?.type === CommentNodeType.TextTag) {
				lastNode.description += '\n' + trimmedLine;
			} else {
				nodes.push({
					type: CommentNodeType.Text,
					content: trimmedLine,
				});
			}
		}
	}
	return nodes;
}

interface ParsedTagCommentNode {
	type: CommentNodeType.TextTag;
	tag: string;
	description: string;
	parsedType: ParsedTypeNode | null;
}

export type ParsedCommentNode = TextCommentNode | ParsedTagCommentNode;

export function parseComment(comment: Comment): ParsedCommentNode[] {
	const nodes = parseCommentNodes(comment.value);
	return nodes.map((node) => {
		if (node.type === CommentNodeType.Text) {
			return node;
		}

		const { tag, description } = node;
		if (!TAGS_WITH_TYPES.includes(tag.slice(1))) {
			return {
				...node,
				parsedType: null,
			};
		}

		const { parsedType, rest } = parseType(description, comment);
		return {
			...node,
			parsedType,
			description: rest,
		} satisfies ParsedTagCommentNode;
	});
}

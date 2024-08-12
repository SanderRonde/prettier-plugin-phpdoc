import { trimSpaces } from './util';
import { ParsedTypeNode, parseType } from './type-parser';

const TAGS_WITH_TYPES = [
	'method',
	'param',
	'property',
	'return',
	'type',
	'throws',
	'var',
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
	// Strip out whitespace
	comment = comment.trim();

	const lines = comment.split('\n');
	const nodes: CommentNode[] = [];
	for (let i = 0; i < lines.length; i++) {
		const trimmedLine = trimSpaces(lines[i]);
		if (trimmedLine.startsWith('@')) {
			const [tag, ...descriptionParts] = trimmedLine.split(/\s/);
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

export function parseComment(comment: string): ParsedCommentNode[] {
	const nodes = parseCommentNodes(comment);
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

		const { parsedType, rest } = parseType(description);
		return {
			...node,
			parsedType,
			description: rest,
		} satisfies ParsedTagCommentNode;
	});
}

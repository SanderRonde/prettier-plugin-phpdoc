import { Comment } from 'php-parser';

export type ParsedTypeNode =
	| MaybeNode
	| SimpleValueNode
	| WithGenericsNode
	| StaticAccessNode
	| TupleDictNode
	| RecordNode
	| ArrayListNode
	| ArraySquareBracketNode
	| UnionNode
	| CallableNode
	| StringNode
	| ParenthesesNode
	| ConditionalTypeNode
	| SpreadNode
	| ModifierKeywordNode;

export enum TypeKind {
	Maybe = 'maybe',
	SimpleValue = 'simple-value',
	WithGenerics = 'with-generics',
	StaticAccess = 'static-access',
	TupleDict = 'tuple-dict',
	Record = 'record',
	ArrayList = 'arrayList',
	ArraySquareBracket = 'array-square-bracket',
	Union = 'union',
	Callable = 'callable',
	StringLiteral = 'string',
	Parentheses = 'parentheses',
	ConditionalType = 'conditional-type',
	Spread = 'spread',
	ModifierKeyword = 'modifier-keyword',
}

interface MaybeNode {
	kind: TypeKind.Maybe;
	type: ParsedTypeNode;
}

interface SimpleValueNode {
	kind: TypeKind.SimpleValue;
	value: string;
}

interface WithGenericsNode {
	kind: TypeKind.WithGenerics;
	node: ParsedTypeNode;
	generics: ParsedTypeNode[];
}

interface StaticAccessNode {
	kind: TypeKind.StaticAccess;
	class: ParsedTypeNode;
	member: ParsedTypeNode;
}

export interface TupleDictEntryWithKey {
	key: ParsedTypeNode;
	optional: boolean;
	value: ParsedTypeNode;
}

interface TupleDictEntryWithoutKey {
	key: null;
	value: ParsedTypeNode;
}

interface TupleDictNode {
	kind: TypeKind.TupleDict;
	entries: (TupleDictEntryWithKey | TupleDictEntryWithoutKey)[];
}

interface RecordNode {
	kind: TypeKind.Record;
	key: ParsedTypeNode;
	value: ParsedTypeNode;
}

interface ArrayListNode {
	kind: TypeKind.ArrayList;
	type: ParsedTypeNode;
	name: 'array' | 'list';
}

interface ArraySquareBracketNode {
	kind: TypeKind.ArraySquareBracket;
	type: ParsedTypeNode;
}

interface UnionNode {
	kind: TypeKind.Union;
	types: ParsedTypeNode[];
}

interface CallableNode {
	kind: TypeKind.Callable;
	node: ParsedTypeNode;
	parameters: {
		type: ParsedTypeNode;
		name?: string;
	}[];
	returnType: ParsedTypeNode;
}

interface StringNode {
	kind: TypeKind.StringLiteral;
	value: string;
	quote: 'single' | 'double';
}

interface ParenthesesNode {
	kind: TypeKind.Parentheses;
	type: ParsedTypeNode;
}

interface ConditionalTypeNode {
	kind: TypeKind.ConditionalType;
	check: ParsedTypeNode;
	extends: ParsedTypeNode;
	trueType: ParsedTypeNode;
	falseType: ParsedTypeNode;
}

interface SpreadNode {
	kind: TypeKind.Spread;
}

interface ModifierKeywordNode {
	kind: TypeKind.ModifierKeyword;
	modifier: ParsedTypeNode;
	target: ParsedTypeNode;
}

class TypeParser {
	public constructor(private _text: string) {}

	public pos: number = 0;
	private _lastResult: string | null = null;

	private _maybe(...accepts: (string | RegExp)[]): string | null {
		while (
			this.pos < this._text.length &&
			[' ', '\t', '\n'].includes(this._text[this.pos])
		) {
			this.pos++;
		}

		for (const accept of accepts) {
			if (
				typeof accept === 'string' &&
				accept.length > this._text.length - this.pos
			) {
				continue;
			}
			if (typeof accept === 'string') {
				if (
					this._text.slice(this.pos, this.pos + accept.length) ===
					accept
				) {
					this.pos += accept.length;
					this._lastResult = accept;
					return accept;
				}
			} else {
				const match = this._text.slice(this.pos).match(accept);
				if (match) {
					this.pos += match[0].length;
					this._lastResult = match[0];
					return match[0];
				}
			}
		}
		return null;
	}

	private _peek(...accepts: (string | RegExp)[]): string | null {
		const pos = this.pos;
		const result = this._maybe(...accepts);
		this.pos = pos;
		return result;
	}

	private _expect(
		where: string[],
		...accepts: (string | RegExp)[]
	): string | never {
		const result = this._maybe(...accepts);
		if (result === null) {
			const what = accepts.join(' or ');
			throw new Error(
				`expected ${what} at offset ${this.pos} at ${where.join('.')}: ${
					this._text.slice(this.pos, 25) || '<eol>'
				}`
			);
		}
		return result;
	}

	private _maybeGeneric(where: string[]): ParsedTypeNode[] | null {
		if (!this._maybe('<')) {
			return null;
		}

		const nodes: ParsedTypeNode[] = [];
		do {
			if (this._maybe('>')) {
				// Trailing comma...
				return nodes;
			}
			const node = this.parseType([...where, 'generic']);
			if (node.kind === TypeKind.SimpleValue && !this._peek(',', '>')) {
				// This can be a covariant or other modifier
				nodes.push({
					kind: TypeKind.ModifierKeyword,
					modifier: node,
					target: this.parseType([...where, 'modifier']),
				});
			} else {
				nodes.push(node);
			}
		} while (this._maybe(','));
		this._expect(where, '>');
		return nodes;
	}

	parseType(where: string[], consumeUnion: boolean = true): ParsedTypeNode {
		let node: ParsedTypeNode | null = null;
		if (this._maybe('?')) {
			node = {
				kind: TypeKind.Maybe,
				type: this.parseType([...where, 'maybe']),
			};
		} else if (this._maybe(/^array-[\\a-zA-Z0-9\-\_]+/)) {
			const lastResult = this._lastResult!;
			node = { kind: TypeKind.SimpleValue, value: lastResult };
		} else if (this._maybe('array')) {
			if (this._maybe('{')) {
				node = {
					entries: [],
					kind: TypeKind.TupleDict,
				};
				while (!this._maybe('}')) {
					const subType = this.parseType([...where, 'array']);
					const isOptional = !!this._maybe('?');
					if (this._maybe(':')) {
						// array{key: value}
						const value = this.parseType([...where, 'array-value']);
						node.entries.push({
							key: subType,
							value,
							optional: isOptional,
						});
					} else {
						// array{Key, Value}
						node.entries.push({
							key: null,
							value: subType,
						});
					}

					if (!this._maybe(',')) {
						this._expect([...where, 'array'], '}');
						break;
					}
				}
			} else if (this._maybe('<')) {
				const subType = this.parseType([...where, 'array-record']);
				if (this._maybe(',', '>') === ',') {
					// array<key, value>
					const valueType = this.parseType([
						...where,
						'array-record-value',
					]);
					this._expect([...where, 'array-value'], '>');
					node = {
						kind: TypeKind.Record,
						key: subType,
						value: valueType,
					};
				} else {
					// array<value>
					node = {
						kind: TypeKind.ArrayList,
						type: subType,
						name: 'array',
					};
				}
			} else {
				// Untyped array
				node = {
					value: 'array',
					kind: TypeKind.SimpleValue,
				};
			}
		} else if (this._maybe('list')) {
			if (this._maybe('<')) {
				const subType = this.parseType([...where, 'list']);
				node = {
					kind: TypeKind.ArrayList,
					type: subType,
					name: 'list',
				};
				this._expect([...where, 'array'], '>');
			} else {
				node = {
					value: 'list',
					kind: TypeKind.SimpleValue,
				};
			}
		} else if (this._maybe('"', "'")) {
			const quote = this._lastResult === '"' ? 'double' : 'single';

			let value = '';
			while (
				this._text[this.pos] !== this._lastResult &&
				this._text[this.pos - 1] !== '\\' &&
				this.pos < this._text.length
			) {
				value += this._text[this.pos];
				this.pos++;
			}

			if (this.pos === this._text.length) {
				throw new Error('unterminated string');
			}

			this._expect([...where, 'string'], this._lastResult!);
			node = {
				kind: TypeKind.StringLiteral,
				value,
				quote,
			};
		} else if (this._maybe(/^((&)?\$)?(-?)[\\a-zA-Z0-9\-\_]+/)) {
			const lastResult = this._lastResult!;
			node = { kind: TypeKind.SimpleValue, value: lastResult };
			const generics = this._maybeGeneric([...where, 'primitive']);
			if (generics) {
				node = {
					kind: TypeKind.WithGenerics,
					node: node,
					generics,
				};
			}

			if (this._maybe('::')) {
				node = {
					kind: TypeKind.StaticAccess,
					class: node,
					member: this.parseType([...where, 'static-access']),
				};
			}
		} else if (this._maybe('(')) {
			const type = this.parseType([...where, 'parentheses']);
			this._expect([...where, 'parentheses'], ')');
			node = {
				kind: TypeKind.Parentheses,
				type,
			} satisfies ParenthesesNode;
		} else if (this._maybe('...')) {
			node = {
				kind: TypeKind.Spread,
			};
		} else {
			throw new Error(
				`unexpected token at ${where.join('.')}: ${this._text.slice(this.pos, 25)}`
			);
		}

		if (this._maybe('(')) {
			const parameters: CallableNode['parameters'] = [];
			while (!this._maybe(')')) {
				const type = this.parseType([...where, 'parentheses']);
				if (this._maybe(/^(&)?\$[a-zA-Z0-9]+/)) {
					// This is a named parameter
					parameters.push({
						name: this._lastResult!,
						type: type,
					});
				} else {
					parameters.push({
						type: type,
					});
				}

				if (!this._maybe(',')) {
					this._expect([...where, 'parentheses'], ')');
					break;
				}
			}

			this._expect([...where, 'parentheses'], ':');
			const returnType = this.parseType([...where, 'return-type']);
			node = {
				kind: TypeKind.Callable,
				node,
				parameters,
				returnType,
			} satisfies CallableNode;
		}

		// Handle trailing arrays
		while (this._maybe('[]')) {
			node = {
				kind: TypeKind.ArraySquareBracket,
				type: node!,
			};
		}

		// Handle trailing union types
		const unionNodes: ParsedTypeNode[] = [node];
		while (consumeUnion && this._maybe('|')) {
			unionNodes.push(this.parseType([...where, 'union'], false));
		}

		if (unionNodes.length === 1) {
			node = unionNodes[0];
		} else {
			node = {
				kind: TypeKind.Union,
				types: unionNodes,
			};
		}

		if (this._maybe('is') && where.length > 1) {
			// This is a PHPStan conditional type
			const is = this.parseType([...where, 'conditional:is']);
			this._expect([...where, 'conditional'], '?');
			const trueType = this.parseType([...where, 'conditional:true']);
			this._expect([...where, 'conditional'], ':');
			const falseType = this.parseType([...where, 'conditional:false']);
			node = {
				kind: TypeKind.ConditionalType,
				check: node,
				extends: is,
				trueType,
				falseType,
			} satisfies ConditionalTypeNode;
		}

		return node;
	}
}

export function parseType(
	text: string,
	comment: Comment
): {
	parsedType: ParsedTypeNode;
	rest: string;
} {
	const parser = new TypeParser(text);
	const parsedType = parser.parseType([
		typeof comment.loc?.start.line === 'number'
			? `Line:${comment.loc.start.line}`
			: 'comment',
	]);
	return {
		parsedType,
		rest: text.slice(parser.pos),
	};
}

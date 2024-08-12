export type ParsedTypeNode =
	| MaybeNode
	| PrimitiveNode
	| WithGenericsNode
	| StaticAccessNode
	| TupleDictNode
	| RecordNode
	| ArrayListNode
	| ArraySquareBracketNode
	| UnionNode
	| CallableNode;

export enum TypeKind {
	Maybe = 'maybe',
	SimpleValue = 'simple-value',
	WithGenerics = 'with-generics',
	StaticAccess = 'static-access',
	TupleDict = 'tuple-dict',
	Record = 'record',
	ArrayList = 'arrayList',
	ArraySquareBracket = 'arraySquareBracket',
	Union = 'union',
	Callable = 'callable',
}

interface MaybeNode {
	kind: TypeKind.Maybe;
	type: ParsedTypeNode;
}

interface PrimitiveNode {
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
	parameters: ParsedTypeNode[];
	returnType: ParsedTypeNode;
}

class TypeParser {
	public constructor(private _text: string) {}

	public pos: number = 0;
	private _lastResult: string | null = null;

	private _expect(where: string[], ...accepts: string[]): string | never {
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

		const nodes = [];
		do {
			nodes.push(this.parseType([...where, 'generic']));
		} while (this._maybe(','));
		this._expect(where, '>');
		return nodes;
	}

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

	parseType(
		where: string[] = [],
		consumeUnion: boolean = true
	): ParsedTypeNode {
		let node: ParsedTypeNode | null = null;
		if (this._maybe('?')) {
			node = {
				kind: TypeKind.Maybe,
				type: this.parseType([...where, 'maybe']),
			};
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
					};
				}
			} else {
				this._expect([...where, 'array'], '{', '<');
				throw new Error('unreachable');
			}
		} else if (this._maybe(/(-?)[\\a-zA-Z0-9\-]+/)) {
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
		} else {
			throw new Error(
				`unexpected token: ${this._text.slice(this.pos, 25)}`
			);
		}

		if (this._maybe('(')) {
			const parameters: ParsedTypeNode[] = [];
			while (!this._maybe(')')) {
				parameters.push(this.parseType([...where, 'parentheses']));

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
			} as CallableNode;
		}

		// Handle trailing arrays
		while (this._maybe('[')) {
			this._expect([...where, 'array'], ']');
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
			return unionNodes[0];
		}

		return {
			kind: TypeKind.Union,
			types: unionNodes,
		};
	}
}

export function parseType(text: string): {
	parsedType: ParsedTypeNode;
	rest: string;
} {
	const parser = new TypeParser(text);
	const parsedType = parser.parseType();
	return {
		parsedType,
		rest: text.slice(parser.pos),
	};
}

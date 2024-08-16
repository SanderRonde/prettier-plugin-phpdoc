import { PrettierOptions } from './options';
import { ParsedTypeNode, TypeKind } from './type-parser';

export function getNextWrapLevel(wrapLevel: WrapLevel): WrapLevel | null {
	const next = wrapLevel + 1;
	if (!Object.values(WrapLevel).includes(next)) {
		return null;
	}
	return next;
}

export enum WrapLevel {
	Never,
	/** Dictionaries */
	L1,
	/** Generics */
	L2,
	/** Tuples, conditionals */
	L3 = 3,
}

class TypePrinter {
	private _lines: string[] = [];
	private _line: string = '';
	private _indent: number = 0;

	public constructor(
		private readonly _wrapLevel: WrapLevel,
		private readonly _options: PrettierOptions
	) {}

	private get _whiteSpace() {
		const hasTabs = this._options.useTabs;
		if (hasTabs) {
			return '\t';
		}
		return ' '.repeat(this._options.tabWidth);
	}

	private _hasLevel(level: WrapLevel): boolean {
		return level <= this._wrapLevel;
	}

	private _changeIndent(level: WrapLevel, operation: '+1' | '-1') {
		if (!this._hasLevel(level)) {
			return;
		}
		if (operation === '+1') {
			this._indent++;
		} else {
			this._indent--;
		}
	}

	private _newline(level: WrapLevel) {
		if (!this._hasLevel(level)) {
			return;
		}
		this._lines.push(this._line);
		if (this._indent) {
			this._line = ' ' + this._whiteSpace.repeat(this._indent);
		} else {
			this._line = '';
		}
	}

	private _print(text: string): void {
		this._line += text;
	}

	printType(node: ParsedTypeNode) {
		if (node.kind === TypeKind.Maybe) {
			if (this._options.expandNull) {
				this.printType({
					kind: TypeKind.Union,
					types: [
						{ kind: TypeKind.SimpleValue, value: 'null' },
						node.type,
					],
				});
			} else {
				this._print('?');
				this.printType(node.type);
			}
		} else if (node.kind === TypeKind.SimpleValue) {
			this._print(node.value);
		} else if (node.kind === TypeKind.WithGenerics) {
			this.printType(node.node);

			this._changeIndent(WrapLevel.L2, '+1');
			this._print('<');
			this._newline(WrapLevel.L2);
			for (let i = 0; i < node.generics.length; i++) {
				this.printType(node.generics[i]);
				// Trailing comma
				if (
					i !== node.generics.length - 1 ||
					this._hasLevel(WrapLevel.L2)
				) {
					this._print(', ');
				}
				if (i !== node.generics.length - 1) {
					this._newline(WrapLevel.L2);
				}
			}
			this._changeIndent(WrapLevel.L2, '-1');
			this._newline(WrapLevel.L2);
			this._print('>');
		} else if (node.kind === TypeKind.StaticAccess) {
			this.printType(node.class);
			this._print('::');
			this.printType(node.member);
		} else if (node.kind === TypeKind.TupleDict) {
			this._print('array{');
			if (node.entries.length) {
				const wrapLevel = node.entries.every((entry) => entry.key)
					? WrapLevel.L1
					: WrapLevel.L3;
				// This is a dictionary
				this._changeIndent(wrapLevel, '+1');
				this._newline(wrapLevel);
				for (let i = 0; i < node.entries.length; i++) {
					const entry = node.entries[i];
					if (entry.key) {
						this.printType(entry.key!);
						if (entry.optional) {
							this._print('?');
						}
						this._print(': ');
						this.printType(entry.value);
					} else {
						this.printType(node.entries[i].value);
					}
					// Trailing comma
					if (
						i !== node.entries.length - 1 ||
						this._hasLevel(wrapLevel)
					) {
						this._print(', ');
					}
					if (i !== node.entries.length - 1) {
						this._newline(wrapLevel);
					}
				}
				this._changeIndent(wrapLevel, '-1');
				this._newline(wrapLevel);
			}
			this._print('}');
		} else if (node.kind === TypeKind.Record) {
			this._print('array<');
			this.printType(node.key);
			this._print(', ');
			this.printType(node.value);
			this._print('>');
		} else if (node.kind === TypeKind.ArrayList) {
			this._print(`${node.name}<`);
			this.printType(node.type);
			this._print('>');
		} else if (node.kind === TypeKind.ArraySquareBracket) {
			this.printType(node.type);
			this._print('[]');
		} else if (node.kind === TypeKind.Union) {
			const types: ParsedTypeNode[] = [];
			for (let i = 0; i < node.types.length; i++) {
				const type = node.types[i];
				// If there is a `null` in here, move it to the front
				if (
					type.kind === TypeKind.SimpleValue &&
					type.value === 'null'
				) {
					types.unshift(type);
					// If there is a nullable type in a union, split up the null
				} else if (
					this._options.expandNull &&
					type.kind === TypeKind.Maybe
				) {
					types.unshift({
						kind: TypeKind.SimpleValue,
						value: 'null',
					});
					types.push(type.type);
				} else {
					types.push(type);
				}
			}

			for (let i = 0; i < types.length; i++) {
				if (i > 0) {
					this._print(' | ');
				}
				this.printType(types[i]);
			}
		} else if (node.kind === TypeKind.Callable) {
			this.printType(node.node);
			this._print('(');
			for (let i = 0; i < node.parameters.length; i++) {
				if (i > 0) {
					this._print(', ');
				}
				this.printType(node.parameters[i].type);
				if (node.parameters[i].name) {
					this._print(' ' + node.parameters[i].name);
				}
			}
			this._print('): ');
			this.printType(node.returnType);
		} else if (node.kind === TypeKind.StringLiteral) {
			const quote = node.quote === 'single' ? "'" : '"';
			this._print(quote + node.value + quote);
		} else if (node.kind === TypeKind.Parentheses) {
			this._print('(');
			this.printType(node.type);
			this._print(')');
		} else if (node.kind === TypeKind.ConditionalType) {
			this._changeIndent(WrapLevel.L3, '+1');
			this._newline(WrapLevel.L3);
			this.printType(node.check);
			this._print(' is ');
			this.printType(node.extends);
			this._newline(WrapLevel.L3);
			this._print(' ? ');
			this.printType(node.trueType);
			this._newline(WrapLevel.L3);
			this._print(' : ');
			this.printType(node.falseType);
			this._changeIndent(WrapLevel.L3, '-1');
		} else if (node.kind === TypeKind.Spread) {
			this._print('...');
		} else if (node.kind === TypeKind.ModifierKeyword) {
			this.printType(node.modifier);
			this._print(' ');
			this.printType(node.target);
		} else {
			assertUnreachable(node);
		}
	}

	getLines(): string[] {
		this._lines.push(this._line);
		return this._lines;
	}
}

function assertUnreachable(x: never): never {
	throw new Error('Unexpected object: ' + x);
}

export function printType(
	node: ParsedTypeNode,
	options: PrettierOptions,
	wrapLevel: WrapLevel
) {
	const printer = new TypePrinter(wrapLevel, options);
	printer.printType(node);
	return printer.getLines();
}

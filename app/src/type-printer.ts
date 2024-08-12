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
		if (this._options.indent) {
			return this._options.indent;
		}
		const hasTabs = this._options.useTabs;
		if (hasTabs) {
			return '\t';
		}
		return ' '.repeat(this._options.tabWidth);
	}

	private _newline(level: WrapLevel) {
		if (level > this._wrapLevel) {
			return;
		}
		this._lines.push(this._line);
		this._line = this._whiteSpace.repeat(this._indent);
	}

	private _print(text: string): void {
		this._line += text;
	}

	printType(node: ParsedTypeNode) {
		if (node.kind === TypeKind.Maybe) {
			this._print('?');
			this.printType(node.type);
		} else if (node.kind === TypeKind.SimpleValue) {
			this._print(node.value);
		} else if (node.kind === TypeKind.WithGenerics) {
			this.printType(node.node);

			this._indent++;
			this._print('<');
			this._newline(WrapLevel.L2);
			for (let i = 0; i < node.generics.length; i++) {
				if (i > 0) {
					this._print(', ');
					this._newline(WrapLevel.L2);
				}
				this.printType(node.generics[i]);
			}
			this._indent--;
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
				this._indent++;
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
					if (i !== node.entries.length - 1) {
						this._print(', ');
						this._newline(wrapLevel);
					}
				}
				this._indent--;
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
			for (let i = 0; i < node.types.length; i++) {
				if (i > 0) {
					this._print('|');
				}
				this.printType(node.types[i]);
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
			this._indent++;
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
			this._indent--;
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

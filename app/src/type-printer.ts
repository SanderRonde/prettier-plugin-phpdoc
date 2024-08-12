import { ParserOptions } from 'prettier';
import { ParsedTypeNode, TupleDictEntryWithKey, TypeKind } from './type-parser';

class TypePrinter {
	private _lines: string[] = [];
	private _line: string = '';
	private _indent: number = 0;

	public constructor(
		private readonly _wrap: boolean,
		private readonly _options: ParserOptions
	) {}

	private get _whiteSpace() {
		const hasTabs = this._options.useTabs;
		if (hasTabs) {
			return '\t';
		}
		return ' '.repeat(this._options.tabWidth);
	}

	private _newline() {
		if (!this._wrap) {
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
			this._print('<');
			for (let i = 0; i < node.generics.length; i++) {
				if (i > 0) {
					this._print(', ');
				}
				this.printType(node.generics[i]);
			}
			this._print('>');
		} else if (node.kind === TypeKind.StaticAccess) {
			this.printType(node.class);
			this._print('::');
			this.printType(node.member);
		} else if (node.kind === TypeKind.TupleDict) {
			this._print('array{');
			if (!node.entries.every((entry) => entry.key)) {
				// Not every entry has a key, this is a tuple
				for (let i = 0; i < node.entries.length; i++) {
					this.printType(node.entries[i].value);
					if (i !== node.entries.length - 1) {
						this._print(', ');
					}
				}
			} else {
				// This is a dictionary
				this._indent++;
				this._print('');
				this._newline();
				for (let i = 0; i < node.entries.length; i++) {
					const entry = node.entries[i] as TupleDictEntryWithKey;
					this.printType(entry.key!);
					if (entry.optional) {
						this._print('?');
					}
					this._print(': ');
					this.printType(entry.value);
					if (i !== node.entries.length - 1) {
						this._print(', ');
						this._newline();
					}
				}
				this._indent--;
				this._newline();
			}
			this._print('}');
		} else if (node.kind === TypeKind.Record) {
			this._print('array<');
			this.printType(node.key);
			this._print(', ');
			this.printType(node.value);
			this._print('>');
		} else if (node.kind === TypeKind.ArrayList) {
			this._print('array<');
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
				this.printType(node.parameters[i]);
			}
			this._print('): ');
			this.printType(node.returnType);
		} else if (node.kind === TypeKind.StringLiteral) {
			const quote = node.quote === 'single' ? "'" : '"';
			this._print(quote + node.value + quote);
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
	options: ParserOptions,
	wrap: boolean
) {
	const printer = new TypePrinter(wrap, options);
	printer.printType(node);
	return printer.getLines();
}

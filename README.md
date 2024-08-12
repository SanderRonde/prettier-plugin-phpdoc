# Prettier Plugin: PHPDoc

A prettier plugin that formats PHPDoc and the types used in them.

## Installation

```sh
npm install --save-dev prettier-plugin-phpdoc
```

## Usage

### Add to Prettier Config

```js
module.exports = {
	plugins: ['./node_modules/prettier-plugin-sort-imports/dist/index.js'],
};
```

### Options

-   `phpDocPrintWidth`: (default: `printWidth`) Specify the line length that the printer will wrap PHPDoc on.
-   `wrapText`: (default: `false`) Whether to wrap text in PHPDoc

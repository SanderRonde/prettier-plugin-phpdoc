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
	plugins: ['./node_modules/prettier-plugin-phpdoc/dist/index.js'],
};
```

### Options

-   `wrapText`: (default: `false`) Whether to wrap text in PHPDoc after it crosses `printWidth`
-   `expandNull`: (default: `false`) Whether to expand `?int` (and other types) to `null|int`

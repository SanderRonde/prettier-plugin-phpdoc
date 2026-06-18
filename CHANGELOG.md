## Changelog

### 1.3.1

-   Support PHPStan sealed array types

### 1.3.0

-   Fix bug in parser, rewrite so that arg order makes more sense

### 1.1.0

-   Actually use peer version of `@prettier/plugin-php` instead of bundling it

### 1.0.5

-   Don't format non-PHPDoc comments (those that don't start with `/**`)

### 1.0.4

-   Don't consume unions inside statics
-   Fix bug where nullable return types would result in a union of the callable with null

### 1.0.1 - 1.0.3

-   Fix issue with wrapping when parameter description started with a newline

### 1.0.0

-   Initial release

<?php

/** @var array<string, array{bool, ?int}> */
$someVar = [];

class DemoFile {
	/**
	 * @var array<string, array{bool, ?int}>
	 */
	public static $someVar = [];

	public const SOME_CLASS_CONST_WITH_TYPE = 30;

	/**
	 * @param array{
	 *  	title: string,
	 *  	description: string,
	 *  	items: string[],
	 *  	body: string | bool,
	 * } $param
	 */
	public static function someFn(array $param) {
		// Inline comment
		return [];
	}

	/**
	 * This is a very long text that will wrap. This is a very long text that will wrap. This is a very long text that will wrap. This is a very long text that will wrap.
	 *
	 * @param array<string, array<int, array<string, mixed>>> $userData Multi-dimensional array of user data
	 * @param callable(mixed $withVar, int): mixed $transformCallback Callback function to transform individual data points
	 * @param array{
	 *  	aggregation: 'a' | '' | 'cdwda' | "dwada",
	 *  	filters: array<int, array{
	 *  		field: string,
	 *  		operator: string,
	 *  		value: mixed,
	 *  	}>,
	 *  	groupBy: null | string,
	 *  	sortBy: array<string, string>,
	 *  	limit: null | positive-int,
	 * } $options Configuration options for report generation
	 * @param bool $useCache Whether to use cached results if available
	 * @param ?DateTimeInterface $cacheExpiry Expiration time for cache entries
	 *
	 * @return array{
	 *  	summary: array{
	 *  		totalUsers: int,
	 *  		avgScore: float,
	 *  		topPerformer: null | string,
	 *  	},
	 *  	detailedReport: array<int, array<string, mixed>>,
	 *  	metadata: array{
	 *  		generatedAt: DateTimeInterface,
	 *  		dataVersion: string,
	 *  		appliedFilters: int,
	 *  	},
	 * }
	 * @throws InvalidArgumentException If $userData is empty or $options are invalid
	 * @throws RuntimeException If data processing encounters critical errors
	 * @throws CacheException If caching operations fail when $useCache is true
	 *
	 * @api
	 * @since 2.5.0
	 * @deprecated 3.0.0 Use processUserDataV2() instead
	 * @see processUserDataV2()
	 * @link https://example.com/docs/user-data-processing
	 * @todo Optimize performance for large datasets
	 * @author John Doe <john.doe@example.com>
	 * @copyright 2024 Example Corp
	 * @license MIT
	 */
	public function moreFns(
		array $userData,
		callable $transformCallback,
		array $options,
		bool $useCache,
		?DateTimeInterface $cacheExpiry,
	): array {
		// Inline comment
		return [];
	}

	const C = [
		'x' => ['a' => true],
	];

	/** @param key-of<self::C[string]> $key */
	public function phpstanSpecific(array $x): void {
	}

	/**
	 * Unsealed array shapes (PHPStan): a sealed shape plus a typed rest.
	 *
	 * @param array{href: string, ...<int, Html|string|null>} $inlineRest
	 * @param array{
	 *  	header?: null | Html,
	 *  	footerDark?: bool,
	 *  	...<int, Html|string|null>,
	 * } $wrappedRest
	 * @param array{foo: string, ...} $untypedRest
	 */
	public function unsealedShapes(array $inlineRest, array $wrappedRest, array $untypedRest): void {
	}
}

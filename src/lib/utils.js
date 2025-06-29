// This file contains copies of the `optionsMatches` and `matchesStringOrRegExp` functions from Stylelint's `lib/utils.js` file.

/**
 * Check if an options object's propertyName contains a user-defined string or
 * regex that matches the passed in input.
 *
 * @param {{ [x: string]: unknown; }} options
 * @param {string} propertyName
 * @param {unknown} input
 *
 * @returns {boolean}
 */
export function optionsMatches(options, propertyName, input) {
  return Boolean(
    options &&
      options[propertyName] &&
      typeof input === "string" &&
      matchesStringOrRegExp(input, options[propertyName]),
  );
}

/**
 * Compares a string to a second value that, if it fits a certain convention,
 * is converted to a regular expression before the comparison.
 * If it doesn't fit the convention, then two strings are compared.
 *
 * Any strings starting and ending with `/` are interpreted
 * as regular expressions.
 *
 * @typedef {{match: string, pattern: (string | RegExp), substring: string} | false} MatchResult
 *
 * @param {string | Array<string>} input
 * @param {string | RegExp | Array<string | RegExp>} comparison
 * @returns {MatchResult}
 */
export function matchesStringOrRegExp(input, comparison) {
  if (!Array.isArray(input)) {
    return testAgainstStringOrRegExpOrArray(input, comparison);
  }

  for (const inputItem of input) {
    const testResult = testAgainstStringOrRegExpOrArray(inputItem, comparison);

    if (testResult) {
      return testResult;
    }
  }

  return false;
}

/**
 * @param {string} value
 * @param {string | RegExp | Array<string | RegExp>} comparison
 * @returns {MatchResult}
 */
function testAgainstStringOrRegExpOrArray(value, comparison) {
  if (!Array.isArray(comparison)) {
    return testAgainstStringOrRegExp(value, comparison);
  }

  for (const comparisonItem of comparison) {
    const testResult = testAgainstStringOrRegExp(value, comparisonItem);

    if (testResult) {
      return testResult;
    }
  }

  return false;
}

/**
 * @param {string} value
 * @param {RegExp} pattern
 * @returns {MatchResult}
 */
function matchValue(value, pattern) {
  const match = value.match(pattern);

  return match ? { match: value, pattern, substring: match[0] ?? "" } : false;
}

/**
 * @param {string} value
 * @param {string | RegExp} comparison
 * @returns {MatchResult}
 */
function testAgainstStringOrRegExp(value, comparison) {
  // If it's a RegExp, test directly
  if (comparison instanceof RegExp) {
    return matchValue(value, comparison);
  }

  // Check if it's RegExp in a string
  const regexFlag = "i";
  const comparisonIsRegex =
    comparison.startsWith("/") &&
    (comparison.endsWith("/") || comparison.endsWith(`/${regexFlag}`));

  // If so, create a new RegExp from it
  if (comparisonIsRegex) {
    const pattern = comparison.endsWith(regexFlag)
      ? new RegExp(comparison.slice(1, -2), regexFlag)
      : new RegExp(comparison.slice(1, -1));

    const result = matchValue(value, pattern);

    if (result) {
      result.pattern = comparison;
    }

    return result;
  }

  // Otherwise, it's a string. Do a strict comparison
  return value === comparison
    ? { match: value, pattern: comparison, substring: value }
    : false;
}

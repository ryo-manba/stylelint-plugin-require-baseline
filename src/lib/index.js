import { parse, walk } from "css-tree";
import stylelint from "stylelint";
import valueParser from "postcss-value-parser";

import {
  BASELINE_HIGH,
  BASELINE_LOW,
  atRules,
  mediaConditions,
  properties,
  propertyValues,
  selectors,
  types,
} from "../data/baseline-data.js";
import { namedColors } from "../data/colors.js";

/** @typedef {import("css-tree").Identifier} Identifier */
/** @typedef {import("css-tree").FunctionNodePlain} FunctionNodePlain */
/** @typedef {import("css-tree").Declaration} Declaration */
/** @typedef {import("css-tree").Rule} Rule */
/** @typedef {import("postcss").Node} Node */

const {
  createPlugin,
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

const ruleName = "plugin/use-baseline";

const messages = ruleMessages(ruleName, {
  notBaselineProperty: (property, availability) =>
    `Property "${property}" is not a ${availability} available baseline feature.`,
  notBaselinePropertyValue: (property, value, availability) =>
    `Value "${value}" of property "${property}" is not a ${availability} available baseline feature.`,
  notBaselineType: (type, availability) =>
    `Type "${type}" is not a ${availability} available baseline feature.`,
  notBaselineAtRule: (atRule, availability) =>
    `At-rule "${atRule}" is not a ${availability} available baseline feature.`,
  notBaselineMediaCondition: (condition, availability) =>
    `Media condition "${condition}" is not a ${availability} available baseline feature.`,
  notBaselineSelector: (selectorName, availability) =>
    `Selector "${selectorName}" is not a ${availability} available baseline feature.`,
});

/**
 * Represents a property that is supported via @supports.
 * This implementation is based on the @eslint/css project.
 * Source:
 * https://github.com/eslint/css/blob/css-v0.4.0/src/rules/require-baseline.js#L33-L306

 */
class SupportedProperty {
  /**
   * The name of the property.
   * @type {string}
   */
  name;

  /**
   * Supported identifier values.
   * @type {Set<string>}
   */
  #identifiers = new Set();

  /**
   * Supported function types.
   * @type {Set<string>}
   */
  #functions = new Set();

  /**
   * Creates a new instance.
   * @param {string} name The name of the property.
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * Adds an identifier to the list of supported identifiers.
   * @param {string} identifier The identifier to add.
   * @returns {void}
   */
  addIdentifier(identifier) {
    this.#identifiers.add(identifier);
  }

  /**
   * Determines if an identifier is supported.
   * @param {string} identifier The identifier to check.
   * @returns {boolean} `true` if the identifier is supported, `false` if not.
   */
  hasIdentifier(identifier) {
    return this.#identifiers.has(identifier);
  }

  /**
   * Determines if any identifiers are supported.
   * @returns {boolean} `true` if any identifiers are supported, `false` if not.
   */
  hasIdentifiers() {
    return this.#identifiers.size > 0;
  }

  /**
   * Adds a function to the list of supported functions.
   * @param {string} func The function to add.
   * @returns {void}
   */
  addFunction(func) {
    this.#functions.add(func);
  }

  /**
   * Determines if a function is supported.
   * @param {string} func The function to check.
   * @returns {boolean} `true` if the function is supported, `false` if not.
   */
  hasFunction(func) {
    return this.#functions.has(func);
  }

  /**
   * Determines if any functions are supported.
   * @returns {boolean} `true` if any functions are supported, `false` if not.
   */
  hasFunctions() {
    return this.#functions.size > 0;
  }
}

/**
 * Represents an `@supports` rule and everything it enables.
 */
class SupportsRule {
  /**
   * The properties supported by this rule.
   * @type {Map<string, SupportedProperty>}
   */
  #properties = new Map();

  /**
   * The selectors supported by this rule.
   * @type {Set<string>}
   */
  #selectors = new Set();

  /**
   * Adds a property to the rule.
   * @param {string} property The name of the property.
   * @returns {SupportedProperty} The supported property object.
   */
  addProperty(property) {
    if (this.#properties.has(property)) {
      return this.#properties.get(property);
    }

    const supportedProperty = new SupportedProperty(property);

    this.#properties.set(property, supportedProperty);

    return supportedProperty;
  }

  /**
   * Determines if the rule supports a property.
   * @param {string} property The name of the property.
   * @returns {boolean} `true` if the property is supported, `false` if not.
   */
  hasProperty(property) {
    return this.#properties.has(property);
  }

  /**
   * Gets the supported property.
   * @param {string} property The name of the property.
   * @returns {SupportedProperty} The supported property.
   */
  getProperty(property) {
    return this.#properties.get(property);
  }

  /**
   * Determines if the rule supports a property value.
   * @param {string} property The name of the property.
   * @param {string} identifier The identifier to check.
   * @returns {boolean} `true` if the property value is supported, `false` if not.
   */
  hasPropertyIdentifier(property, identifier) {
    const supportedProperty = this.#properties.get(property);

    if (!supportedProperty) {
      return false;
    }

    return supportedProperty.hasIdentifier(identifier);
  }

  /**
   * Determines if the rule supports any property values.
   * @param {string} property The name of the property.
   * @returns {boolean} `true` if any property values are supported, `false` if not.
   */
  hasPropertyIdentifiers(property) {
    const supportedProperty = this.#properties.get(property);

    if (!supportedProperty) {
      return false;
    }

    return supportedProperty.hasIdentifiers();
  }

  /**
   * Determines if the rule supports a function.
   * @param {string} property The name of the property.
   * @param {string} func The function to check.
   * @returns {boolean} `true` if the function is supported, `false` if not.
   */
  hasFunction(property, func) {
    const supportedProperty = this.#properties.get(property);

    if (!supportedProperty) {
      return false;
    }

    return supportedProperty.hasFunction(func);
  }

  /**
   * Determines if the rule supports any functions.
   * @param {string} property The name of the property.
   * @returns {boolean} `true` if any functions are supported, `false` if not.
   */
  hasFunctions(property) {
    const supportedProperty = this.#properties.get(property);

    if (!supportedProperty) {
      return false;
    }

    return supportedProperty.hasFunctions();
  }

  /**
   * Adds a selector to the rule.
   * @param {string} selector The name of the selector.
   * @returns {void}
   */
  addSelector(selector) {
    this.#selectors.add(selector);
  }

  /**
   * Determines if the rule supports a selector.
   * @param {string} selector The name of the selector.
   * @returns {boolean} `true` if the selector is supported, `false` if not.
   */
  hasSelector(selector) {
    return this.#selectors.has(selector);
  }
}

/**
 * Represents a collection of supports rules.
 */
class SupportsRules {
  /**
   * A collection of supports rules.
   * @type {Array<SupportsRule>}
   */
  #rules = [];

  /**
   * Adds a rule to the collection.
   * @param {SupportsRule} rule The rule to add.
   * @returns {void}
   */
  push(rule) {
    this.#rules.push(rule);
  }

  /**
   * Removes the last rule from the collection.
   * @returns {SupportsRule} The last rule in the collection.
   */
  pop() {
    return this.#rules.pop();
  }

  /**
   * Retrieves the last rule in the collection.
   * @returns {SupportsRule} The last rule in the collection.
   */
  last() {
    return this.#rules.at(-1);
  }

  /**
   * Determines if any rule supports a property.
   * @param {string} property The name of the property.
   * @returns {boolean} `true` if any rule supports the property, `false` if not.
   */
  hasProperty(property) {
    return this.#rules.some((rule) => rule.hasProperty(property));
  }

  /**
   * Determines if any rule supports a property identifier.
   * @param {string} property The name of the property.
   * @param {string} identifier The identifier to check.
   * @returns {boolean} `true` if any rule supports the property value, `false` if not.
   */
  hasPropertyIdentifier(property, identifier) {
    return this.#rules.some((rule) =>
      rule.hasPropertyIdentifier(property, identifier),
    );
  }

  /**
   * Determines if any rule supports any property identifiers.
   * @param {string} property The name of the property.
   * @returns {boolean} `true` if any rule supports the property values, `false` if not.
   */
  hasPropertyIdentifiers(property) {
    return this.#rules.some((rule) => rule.hasPropertyIdentifiers(property));
  }

  /**
   * Determines if any rule supports a function.
   * @param {string} property The name of the property.
   * @param {string} func The function to check.
   * @returns {boolean} `true` if any rule supports the function, `false` if not.
   */
  hasPropertyFunction(property, func) {
    return this.#rules.some((rule) => rule.hasFunction(property, func));
  }

  /**
   * Determines if any rule supports any functions.
   * @param {string} property The name of the property.
   * @returns {boolean} `true` if any rule supports the functions, `false` if not.
   */
  hasPropertyFunctions(property) {
    return this.#rules.some((rule) => rule.hasFunctions(property));
  }

  /**
   * Determines if any rule supports a selector.
   * @param {string} selector The name of the selector.
   * @returns {boolean} `true` if any rule supports the selector, `false` if not.
   */
  hasSelector(selector) {
    return this.#rules.some((rule) => rule.hasSelector(selector));
  }
}

/**
 * Represents the required availability of a feature.
 */
class BaselineAvailability {
  /**
   * The preferred Baseline year.
   * @type {number}
   */
  #baselineYear = undefined;

  /**
   * The preferred Baseline status.
   * @type {number}
   */
  #baselineStatus = undefined;

  /**
   * @param {string | number} availability The required level of feature availability.
   */
  constructor(availability = "widely") {
    this.availability = availability;

    if (typeof availability === "number") {
      this.#baselineYear = availability;
    } else {
      this.#baselineStatus =
        availability === "widely" ? BASELINE_HIGH : BASELINE_LOW;
    }
  }

  /**
   * Determines whether a feature meets the required availability.
   * @param {Object} encodedStatus A feature's encoded baseline status and year.
   * @returns {boolean} `true` if the feature is supported, `false` if not.
   */
  isSupported(encodedStatus) {
    const parts = encodedStatus.split(":");
    const status = Number(parts[0]);
    const year = Number(parts[1] || NaN);

    if (this.#baselineYear) {
      return year <= this.#baselineYear;
    }

    return status >= this.#baselineStatus;
  }
}

const ruleFunction = (primary, secondaryOptions) => {
  return (root, result) => {
    if (!validateOptions(result, ruleName, { actual: primary })) return;

    const baselineAvailability = new BaselineAvailability(
      secondaryOptions?.available,
    );
    const ignoreSelectors = new Set(secondaryOptions?.ignoreSelectors || []);
    const ignoreProperties = new Set(secondaryOptions?.ignoreProperties || []);
    const ignoreAtRules = new Set(secondaryOptions?.ignoreAtRules || []);

    const supportsRules = new SupportsRules();

    // Process @supports rules first
    // Skip nested @supports rules to avoid duplicate checks
    root.walkAtRules(/^supports$/i, (atRule) => {
      if (isInsideSupports(atRule)) return;

      checkSupports(atRule);
    });

    /**
     * Walk through all nodes except:
     *  - @supports rules (already processed)
     *  - Nodes inside any @supports (handled within checkSupports)
     */
    root.walk((node) => {
      if (node.type === "atrule" && node.name.toLowerCase() === "supports")
        return;

      if (isInsideSupports(node)) return;

      switch (node.type) {
        case "atrule": {
          handleAtRule(node);
          break;
        }
        case "rule": {
          checkSelector(node);
          break;
        }
        case "decl": {
          handleDeclaration(node);
          break;
        }
      }
    });

    /**
     * Recursively processes an @supports rule and its nested contents.
     * @param {AtRule} atRule
     */
    function checkSupports(atRule) {
      const supportsRule = new SupportsRule();

      supportsRules.push(supportsRule);

      try {
        const ast = parse(atRule.params, {
          context: "atrulePrelude",
          atrule: "supports",
          parseAtrulePrelude: true,
          positions: true,
        });

        /**
         * "not" applies only to the next node, which should be skipped.
         * Track depth using `negationDepth` and reset `negation` in `leave`
         * when the next node finishes processing.
         */
        let negation = false;
        let negationDepth = 0;

        walk(ast, {
          enter(node) {
            // if the negation flag is set, ignore the next node
            if (negation) {
              return;
            }

            if (node.type === "Identifier" && node.name === "not") {
              negation = true;
              negationDepth++;

              return;
            }

            // Store supported properties and values for this @supports rule.
            if (node.type === "SupportsDeclaration") {
              const { declaration } = node;
              const property = declaration.property;
              const supportedProperty = supportsRule.addProperty(property);

              declaration.value.children.forEach((child) => {
                if (child.type === "Identifier") {
                  supportedProperty.addIdentifier(child.name);

                  return;
                }

                if (child.type === "Function") {
                  supportedProperty.addFunction(child.name);
                }
              });
            }

            if (
              node.type === "FeatureFunction" &&
              node.feature === "selector"
            ) {
              for (const selectorChild of node.value.children) {
                supportsRule.addSelector(selectorChild.name);
              }
            }
          },
          leave() {
            if (negation) {
              // Reset negation flag once the next node finishes processing.
              if (negationDepth === 0) {
                negation = false;
              } else {
                negationDepth--;
              }
            }
          },
        });
      } catch {
        // invalid @supports conditions are ignored
      }

      // Process nested nodes within @supports
      atRule.each((node) => {
        if (node.name === "supports") {
          checkSupports(node);

          return;
        }

        // Process the immediate child node
        switch (node.type) {
          case "atrule":
            handleAtRule(node);
            break;
          case "decl":
            handleDeclaration(node);
            break;
          case "rule":
            checkSelector(node);
            break;
        }

        if (typeof node.walk !== "function") return;

        // Process nested nodes within the child node
        node.walk((child) => {
          switch (child.type) {
            case "atrule":
              handleAtRule(child);
              break;
            case "decl":
              handleDeclaration(child);
              break;
            case "rule":
              checkSelector(child);
              break;
          }
        });
      });

      // pop when exiting the @supports scope
      supportsRules.pop();
    }

    /**
     * @param {Rule} node
     * @returns {void}
     */
    function handleAtRule(atRule) {
      const { name } = atRule;

      if (name.toLowerCase() === "supports") {
        checkSupports(atRule);

        return;
      }

      if (name === "media") {
        checkMediaConditions(atRule);

        return;
      }

      if (ignoreAtRules.has(name)) return;

      if (!atRules.has(name)) return;

      const featureStatus = atRules.get(name);

      if (!baselineAvailability.isSupported(featureStatus)) {
        report({
          message: messages.notBaselineAtRule,
          messageArgs: [`@${name}`, baselineAvailability.availability],
          result,
          node: atRule,
          index: 0,
          endIndex: name.length + 1,
        });
      }
    }

    /**
     * @param {import('postcss').Declaration} decl
     * @returns {void}
     */
    function handleDeclaration(decl) {
      const { prop, value } = decl;

      if (checkProperty(decl, prop)) {
        /**
         * If the property isn't in baseline, then don't go on to check the values.
         * There's no need to report multiple errors for the same property.
         */
        return;
      }

      const parsed = valueParser(value);

      parsed.walk((node) => {
        if (node.type === "word") {
          checkPropertyValueIdentifier(decl, prop, node.value);
        } else if (node.type === "function") {
          checkPropertyValueFunction(decl, node.value);
        }
      });
    }

    /**
     * Checks a property against baseline compatibility
     * @param {Declaration} decl
     * @param {string} property
     * @returns {boolean}
     */
    function checkProperty(decl, property) {
      if (supportsRules.hasProperty(property)) return;

      if (ignoreProperties.has(property)) return;

      // If the property is not in the Baseline data, skip
      if (!properties.has(property)) return;

      const featureStatus = properties.get(property);

      if (!baselineAvailability.isSupported(featureStatus)) {
        report({
          message: messages.notBaselineProperty,
          messageArgs: [property, baselineAvailability.availability],
          result,
          node: decl,
          word: property,
        });

        return true;
      }

      return false;
    }

    /**
     * Checks a property value against baseline compatibility data.
     * @param {Declaration} decl
     * @param {string} property
     * @param {string} value
     * @returns {void}
     */
    function checkPropertyValueIdentifier(decl, property, value) {
      if (supportsRules.hasPropertyIdentifier(property, value)) return;

      // named colors are always valid
      if (namedColors.has(value)) return;

      if (!propertyValues.has(property)) return;

      const possiblePropertyValues = propertyValues.get(property);

      if (!possiblePropertyValues.has(value)) return;

      const featureStatus = possiblePropertyValues.get(value);

      if (!baselineAvailability.isSupported(featureStatus)) {
        report({
          message: messages.notBaselinePropertyValue,
          messageArgs: [property, value, baselineAvailability.availability],
          result,
          node: decl,
          word: value,
        });
      }
    }

    /**
     * Checks a function type against baseline compatibility data.
     * @param {Declaration} decl
     * @param {string} funcName
     */
    function checkPropertyValueFunction(decl, funcName) {
      if (supportsRules.hasPropertyFunction(decl.prop, funcName)) return;

      if (!types.has(funcName)) return;

      const featureStatus = types.get(funcName);

      if (!baselineAvailability.isSupported(featureStatus)) {
        report({
          message: messages.notBaselineType,
          messageArgs: [funcName, baselineAvailability.availability],
          result,
          node: decl,
          word: funcName,
        });
      }
    }

    /**
     * Checks media conditions against baseline compatibility data.
     * @param {AtRule} atRule
     */
    function checkMediaConditions(atRule) {
      const rawParams = atRule.params;

      try {
        const ast = parse(rawParams, {
          context: "atrulePrelude",
          atrule: "media",
          parseAtrulePrelude: true,
          positions: true,
        });

        walk(ast, (node) => {
          if (node.type === "Feature") {
            const featureName = node.name;

            if (!mediaConditions.has(featureName)) return;

            const featureStatus = mediaConditions.get(featureName);

            if (!baselineAvailability.isSupported(featureStatus)) {
              const atRuleIndex = atRuleParamIndex(atRule);

              const index = node.loc.start.column;
              const endIndex = index + featureName.length;

              report({
                ruleName,
                result,
                message: messages.notBaselineMediaCondition(
                  featureName,
                  baselineAvailability.availability,
                ),
                node: atRule,
                index: atRuleIndex + index,
                endIndex: atRuleIndex + endIndex,
              });
            }
          }
        });
      } catch {
        // Ignore invalid media queries
      }
    }

    /**
     * Checks selectors against baseline compatibility data.
     * @param {Rule} ruleNode
     * @returns {void}
     */
    function checkSelector(ruleNode) {
      const { selector } = ruleNode;

      try {
        const ast = parse(selector, {
          context: "selector",
          positions: true,
        });

        walk(ast, (node) => {
          let selectorName = node.name;

          const selectorType = node.type;

          if (selectorType === "NestingSelector") {
            selectorName = "nesting";
          } else if (
            selectorType !== "PseudoClassSelector" &&
            selectorType !== "PseudoElementSelector"
          ) {
            return;
          }

          if (supportsRules.hasSelector(selectorName)) return;

          if (ignoreSelectors.has(selectorName)) return;

          if (!selectors.has(selectorName)) return;

          const featureStatus = selectors.get(selectorName);

          if (!baselineAvailability.isSupported(featureStatus)) {
            // some selectors are prefixed with the : or :: symbols
            let prefixSymbolLength = 0;

            if (node.type === "PseudoClassSelector") {
              prefixSymbolLength = 1;
            } else if (node.type === "PseudoElementSelector") {
              prefixSymbolLength = 2;
            }

            const index = node.loc.start.offset;
            let endIndex = index;

            if (selectorName !== "nesting") {
              endIndex += selectorName.length + prefixSymbolLength;
            }

            report({
              ruleName,
              result,
              message: messages.notBaselineSelector(
                selectorName,
                baselineAvailability.availability,
              ),
              node: ruleNode,
              index,
              endIndex,
            });
          }
        });
      } catch {
        // Ignore invalid selectors
      }
    }
  };
};

/**
 * Checks if a node is inside an @supports rule.
 * @param {Node} node
 * @returns {boolean}
 */
function isInsideSupports(node) {
  let parent = node.parent;

  while (parent) {
    if (parent.type === "atrule" && parent.name === "supports") {
      return true;
    }

    parent = parent.parent;
  }

  return false;
}

/**
 * @param {AtRule} atRule
 * @returns {number}
 */
function atRuleParamIndex(atRule) {
  const index = 1 + atRule.name.length;

  return index + (atRule.raws.afterName?.length ?? 0);
}

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;

export default createPlugin(ruleName, ruleFunction);

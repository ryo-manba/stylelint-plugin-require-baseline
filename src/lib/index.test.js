import { stripIndent } from "common-tags";
import { testRule } from "stylelint-test-rule-node";

import plugin from "./index.js";

const {
  rule: { messages, ruleName },
} = plugin;

testRule({
  plugins: [plugin],
  ruleName,
  config: true,

  accept: [
    { code: "a { color: red; }" },
    { code: "a { color: red; background-color: blue; }" },
    { code: "a { color: red; transition: none; }" },
    { code: "body { --custom-property: red; }" },
    { code: "body { padding: 0; }" },
    { code: "::before { content: attr(foo); }" },
    { code: "a { color: red; -moz-transition: bar }" },
    { code: "@font-face { font-weight: 100 400 }" },
    { code: "@media (min-width: 800px) { a { color: red; } }" },
    { code: "@media (foo) { a { color: red; } }" },
    { code: "@media (prefers-color-scheme: dark) { a { color: red; } }" },
    { code: "@supports (accent-color: auto) { a { accent-color: auto; } }" },
    { code: "@supports (accent-color: red) { a { accent-color: red; } }" },
    { code: "@supports (accent-color: auto) { a { accent-color: red; } }" },
    { code: "@supports (clip-path: fill-box) { a { clip-path: fill-box; } }" },
    {
      code: "@supports not (not (accent-color: auto)) { a { accent-color: auto; } }",
    },
    {
      code: stripIndent`
        @supports (accent-color: auto) and (backdrop-filter: auto) {
          a { accent-color: auto; background-filter: auto }
        }
      `,
    },
    {
      code: stripIndent`
        @supports (accent-color: auto) {
          @supports (backdrop-filter: auto) {
            a { accent-color: auto; background-filter: auto }
          }
        }
      `,
    },
    {
      code: stripIndent`
        @supports (accent-color: auto) {
          @supports (accent-color: auto) {
            a { accent-color: auto; }
          }
          a { accent-color: auto; }
        }
      `,
    },
    {
      code: stripIndent`
        @supports (width: abs(20% - 100px)) {
          a { width: abs(20% - 100px); }
        }
      `,
    },
    {
      code: stripIndent`
        @supports selector(:has()) {
          h1:has(+ h2) { color: red; }
        }
      `,
    },
    {
      code: "div { cursor: pointer; }",
      description: "See: https://github.com/eslint/css/pull/52",
    },
    {
      code: "pre { overflow: auto; }",
      description: "See https://github.com/eslint/css/issues/79",
    },
    {
      code: "dialog[open] { color: red; }",
      description: "attribute selectors are widely supported",
    },
    {
      code: ".foo { color: blue; }",
      description: "class selectors are widely supported",
    },
    {
      code: "#foo { color: red; }",
      description: "id selectors are widely supported",
    },
    {
      code: "* { color: red; }",
      description: "universal selectors are widely supported",
    },
    {
      code: "div.foo#bar[attr] * { margin: 0; }",
      description: "combination of basic selectors are widely supported",
    },
  ],

  reject: [
    {
      code: "a { accent-color: bar; backdrop-filter: auto }",
      warnings: [
        {
          message: messages.notBaselineProperty("accent-color", "widely"),
          line: 1,
          column: 5,
          endLine: 1,
          endColumn: 17,
        },
        {
          message: messages.notBaselineProperty("backdrop-filter", "widely"),
          line: 1,
          column: 24,
          endLine: 1,
          endColumn: 39,
        },
      ],
    },
    {
      code: "a { clip-path: stroke-box; }",
      message: messages.notBaselinePropertyValue(
        "clip-path",
        "stroke-box",
        "widely",
      ),
      line: 1,
      column: 16,
      endLine: 1,
      endColumn: 26,
    },
    {
      code: "a { color: abs(20% - 10px); }",
      message: messages.notBaselineType("abs", "widely"),
      line: 1,
      column: 12,
      endLine: 1,
      endColumn: 15,
    },
    {
      code: stripIndent`
        @property --foo {
          syntax: "*";
          inherits: false;
        }
      `,
      message: messages.notBaselineAtRule("@property", "widely"),
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 10,
    },
    {
      code: "@container (min-width: 800px) { a { color: red; } }",
      message: messages.notBaselineAtRule("@container", "widely"),
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 11,
    },
    {
      code: "@view-transition { from-view: a; to-view: b; }",
      message: messages.notBaselineAtRule("@view-transition", "widely"),
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 17,
    },
    {
      code: "a { color: color-mix(in hsl, hsl(200 50 80), coral 80%); }",
      message: messages.notBaselineType("color-mix", "widely"),
      line: 1,
      column: 12,
      endLine: 1,
      endColumn: 21,
    },
    {
      code: "@media (color-gamut: srgb) { a { color: red; } }",
      message: messages.notBaselineMediaCondition("color-gamut", "widely"),
      line: 1,
      column: 9,
      endLine: 1,
      endColumn: 20,
    },
    {
      code: "@media (height: 600px) and (color-gamut: srgb) and (device-posture: folded) { a { color: red; } }",
      warnings: [
        {
          message: messages.notBaselineMediaCondition("color-gamut", "widely"),
          line: 1,
          column: 29,
          endLine: 1,
          endColumn: 40,
        },
        {
          message: messages.notBaselineMediaCondition(
            "device-posture",
            "widely",
          ),
          line: 1,
          column: 53,
          endLine: 1,
          endColumn: 67,
        },
      ],
    },
    {
      code: "@media (foo) and (color-gamut: srgb) { a { color: red; } }",
      message: messages.notBaselineMediaCondition("color-gamut", "widely"),
      line: 1,
      column: 19,
      endLine: 1,
      endColumn: 30,
    },
    {
      code: "h1:has(+ h2) { margin: 0 0 0.25rem 0; }",
      message: messages.notBaselineSelector("has", "widely"),
      line: 1,
      column: 3,
      endLine: 1,
      endColumn: 7,
    },
    {
      code: "details::details-content { background-color: #a29bfe; }",
      message: messages.notBaselineSelector("details-content", "widely"),
      line: 1,
      column: 8,
      endLine: 1,
      endColumn: 25,
    },
    {
      code: stripIndent`
        @supports (accent-color: auto) {
          @supports (backdrop-filter: auto) {
            a { accent-color: red; }
          }

          a { backdrop-filter: auto; }
        }
      `,
      message: messages.notBaselineProperty("backdrop-filter", "widely"),
      line: 6,
      column: 7,
      endLine: 6,
      endColumn: 22,
    },
    {
      code: "@supports (clip-path: fill-box) { a { clip-path: stroke-box; } }",
      message: messages.notBaselinePropertyValue(
        "clip-path",
        "stroke-box",
        "widely",
      ),
      line: 1,
      column: 50,
      endLine: 1,
      endColumn: 60,
    },
    {
      code: "@supports (accent-color: auto) { a { accent-color: abs(20% - 10px); } }",
      message: messages.notBaselineType("abs", "widely"),
      line: 1,
      column: 52,
      endLine: 1,
      endColumn: 55,
    },
    {
      code: "@supports not (accent-color: auto) { a { accent-color: auto } }",
      message: messages.notBaselineProperty("accent-color", "widely"),
      line: 1,
      column: 42,
      endLine: 1,
      endColumn: 54,
    },
    {
      code: stripIndent`
        @supports selector(:has()) {}

        @supports (color: red) {
          h1:has(+ h2) {
            color: red;
          }
        }
      `,
      message: messages.notBaselineSelector("has", "widely"),
      line: 4,
      column: 5,
      endLine: 4,
      endColumn: 9,
    },
    {
      code: stripIndent`
        @supports (color: red) {
          /* a comment */
          a {
            accent-color: auto;
          }
        }
      `,
      message: messages.notBaselineProperty("accent-color", "widely"),
      line: 4,
      column: 5,
      endLine: 4,
      endColumn: 17,
    },
  ],
});

testRule({
  plugins: [plugin],
  ruleName,
  config: [true, { available: "newly" }],

  accept: [
    { code: "a { backdrop-filter: auto }" },
    {
      code: stripIndent`
        @property --foo {
          syntax: "*";
          inherits: false;
        }
      `,
    },
  ],

  reject: [
    {
      code: "a { accent-color: bar; backdrop-filter: auto }",
      message: messages.notBaselineProperty("accent-color", "newly"),
      line: 1,
      column: 5,
      endLine: 1,
      endColumn: 17,
    },
    {
      code: "@media (device-posture: folded) { a { color: red; } }",
      message: messages.notBaselineMediaCondition("device-posture", "newly"),
      line: 1,
      column: 9,
      endLine: 1,
      endColumn: 23,
    },
  ],
});

testRule({
  plugins: [plugin],
  ruleName,
  config: [true, { available: 2015 }],

  reject: [
    {
      code: ".p { font-stretch: condensed; }",
      message: messages.notBaselineProperty("font-stretch", 2015),
      line: 1,
      column: 6,
      endLine: 1,
      endColumn: 18,
    },
  ],
});

testRule({
  plugins: [plugin],
  ruleName,
  config: [true, { available: 2021 }],

  reject: [
    {
      code: ".box { backdrop-filter: blur(10px); }",
      message: messages.notBaselineProperty("backdrop-filter", 2021),
      line: 1,
      column: 8,
      endLine: 1,
      endColumn: 23,
    },
  ],
});

testRule({
  plugins: [plugin],
  ruleName,
  config: [true, { available: 2022 }],

  accept: [{ code: ".messages { overscroll-behavior: contain; }" }],

  reject: [
    {
      code: stripIndent`label {
        & input {
          border: blue 2px dashed;
        }
      }`,
      message: messages.notBaselineSelector("nesting", 2022),
      line: 2,
      column: 9,
      endLine: 2,
      endColumn: 10,
    },
  ],
});

testRule({
  plugins: [plugin],
  ruleName,
  config: [true, { available: 2024 }],

  accept: [{ code: ".box { backdrop-filter: blur(10px); }" }],
});

testRule({
  plugins: [plugin],
  ruleName,
  config: [
    true,
    {
      ignoreSelectors: ["has", "details-content"],
    },
  ],

  accept: [
    {
      code: "h1:has(+ h2) { margin: 0 0 0.25rem 0; }",
    },
    {
      code: "details::details-content { background-color: #a29bfe; }",
    },
  ],

  reject: [
    {
      code: stripIndent`label {
        & input {
          border: blue 2px dashed;
        }
      }`,
      message: messages.notBaselineSelector("nesting", "widely"),
      line: 2,
      column: 9,
      endLine: 2,
      endColumn: 10,
    },
  ],
});

testRule({
  plugins: [plugin],
  ruleName,
  config: [
    true,
    {
      ignoreProperties: ["accent-color", "backdrop-filter"],
    },
  ],

  accept: [
    {
      code: "a { accent-color: bar; backdrop-filter: auto }",
    },
  ],

  reject: [
    {
      code: "a { clip-path: stroke-box; }",
      message: messages.notBaselinePropertyValue(
        "clip-path",
        "stroke-box",
        "widely",
      ),
      line: 1,
      column: 16,
      endLine: 1,
      endColumn: 26,
    },
  ],
});

testRule({
  plugins: [plugin],
  ruleName,
  config: [
    true,
    {
      ignoreAtRules: ["container"],
    },
  ],

  accept: [
    {
      code: "@container (min-width: 800px) { a { color: red; } }",
    },
  ],

  reject: [
    {
      code: stripIndent`
        @property --foo {
          syntax: "*";
          inherits: false;
        }
      `,
      message: messages.notBaselineAtRule("@property", "widely"),
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 10,
    },
  ],
});

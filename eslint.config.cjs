const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const globals = require("globals");

module.exports = {
  ignores: [
    // From .eslintignore
    "dist",
    "node_modules",
    "coverage",
    ".vscode",
    "terraform",
  ],
  files: ["**/*.ts"],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2020,
      project: "tsconfig.json",
      tsconfigRootDir: __dirname,
      sourceType: "module",
    },
    globals: {
      ...globals.node,
      ...globals.jest,
    },
  },
  plugins: {
    "@typescript-eslint": tsPlugin,
  },
  rules: {
    // TypeScript specific rules
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-var-requires": "off",
  },
};

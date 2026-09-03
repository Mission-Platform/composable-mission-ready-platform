/** @type {import("prettier").Config} */
const config = {
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  trailingComma: 'all',
  bracketSpacing: true,
  singleAttributePerLine: true,
  bracketSameLine: false,
  htmlWhitespaceSensitivity: 'ignore',
  arrowParens: 'always',
  endOfLine: 'lf',
  vueIndentScriptAndStyle: true,
  overrides: [
    {
      // JSONC consumers (e.g. Wrangler config) reject the trailing commas that
      // `trailingComma: 'es5'` would otherwise append before every closing
      // `}`/`]`, so disable them while keeping the JSONC parser for comments.
      files: ['**/*.jsonc'],
      options: {
        trailingComma: 'none',
        parser: 'jsonc',
      },
    },
  ],
};

export default config;

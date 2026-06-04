/**
 * Base Stylelint configuration for all Mission Platform packages and apps.
 *
 * Extends:
 *   - stylelint-config-standard-scss   → standard CSS + SCSS rules
 *   - stylelint-config-recommended-vue → Vue SFC <style> block support
 *
 * Usage in .stylelintrc.js (or stylelint.config.js):
 *   import baseConfig from '@mission-platform/stylelint-config'
 *   export default { ...baseConfig }
 *
 * Or in .stylelintrc.json:
 *   { "extends": ["@mission-platform/stylelint-config"] }
 */
const config = {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-recommended-vue'],
  customSyntax: 'postcss-html',
  overrides: [
    {
      files: ['**/*.scss'],
      customSyntax: 'postcss-scss',
    },
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html',
      rules: {
        // v-bind() in Vue SFC CSS uses camelCase JS expressions — disable keyword casing for Vue files
        'value-keyword-case': null, // eslint-disable-line unicorn/no-null -- stylelint rule API uses null to disable a rule
        // SCSS @use/@include are handled by scss/at-rule-no-unknown; disable the base rule for Vue SFCs
        'at-rule-no-unknown': null, // eslint-disable-line unicorn/no-null -- stylelint rule API uses null to disable a rule
      },
    },
  ],
  rules: {
    'color-named': 'never',
    'color-no-invalid-hex': true,
    'declaration-block-no-duplicate-properties': true,
    'shorthand-property-no-redundant-values': true,
    'selector-class-pattern': [
      '^([a-z][a-z0-9]*)(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      {
        message: 'Expected class selector to follow BEM naming convention',
      },
    ],
    'scss/at-rule-no-unknown': true,
    'scss/no-duplicate-dollar-variables': true,
    'scss/dollar-variable-pattern': '^[a-z][a-z0-9-]*$',
    'import-notation': 'string',
  },
};

export default config;

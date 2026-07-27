/* stylelint Documentation */
/**
 * @mission-platform/stylelint-config
 *
 * Mission Platform's Stylelint configuration, extending:
 * - `@mission-platform/stylelint-config-remix` (for Remix-specific rules)
 * - `stylelint-config-standard` (standard CSS rules)
 * - `stylelint-config-prettier` (to disable conflicting prettier rules)
 *
 * Rules:
 * - Enforce consistent spacing around colons and brackets
 * - Disallow unused CSS selectors
 * - Prefer consistent naming conventions for CSS variables
 * - Limit hex color length to 6 characters
 */
import baseConfig from '@mission-platform/stylelint-config';

export default {
  ...baseConfig,
  rules: {
    ...baseConfig.rules,
    'color-no-invalid-hex': true,
    'selector-class-pattern': '[a-z][a-z0-9]*(?:[-][a-z0-9]+)*',
  },
};
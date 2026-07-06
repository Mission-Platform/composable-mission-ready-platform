/* eslint-config Documentation */
/**
 * @mission-platform/eslint-config
 *
 * Mission Platform's ESLint configuration, extending:
 * - `plugin:unicorn/recommended`
 * - `plugin:import/recommended`
 * - `plugin:prettier/recommended`
 *
 * Rules:
 * - Enforce consistent import styles
 * - Prefer destructured imports
 * - Disallow unused variables
 * - Enforce camelCase naming
 */
import { plugin } from '@mission-platform/eslint-config';

export default plugin({
  // Custom rules can be added here
  rules: {
    'unicorn/prefer-ternary': 'error',
  },
});
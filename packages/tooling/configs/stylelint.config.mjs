/**
 * Workspace-local Stylelint configuration for the platform config workspace.
 *
 * The shared base configuration is imported from `@mission-platform/stylelint-config`.
 * This workspace keeps the following local rules for its config-level styles:
 *
 * - Validate color values.
 * - Enforce kebab-case class selectors.
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
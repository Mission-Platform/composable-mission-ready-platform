/* vitest Documentation */
/**
 * @mission-platform/vitest-config
 *
 * Mission Platform's Vitest configuration, based on:
 * - `@mission-platform/vitest-config` (base configuration)
 * - Vue Test Utils for component testing
 * - Testing Library for DOM queries
 *
 * Features:
 * - Component testing with Vue 3
 * - Mocking of Node.js modules
 * - Coverage reporting with thresholds
 * - Environment variables support
 */
import {plugin} from '@mission-platform/vitest-config';

export default plugin({
  // Test environment configuration
  environment: 'jsdom',

  // Coverage thresholds
  coverage: {
    provider: 'v8',
    thresholds: {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },

  // Global test setup
  globals: true,

  // Test file patterns
  test: {
    include: ['**/*.test.{js,ts,vue}'],
    name: 'vitest',
  },
});

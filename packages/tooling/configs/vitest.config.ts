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
import { defineVitestConfig } from './vite-config/src/vitest';

export default defineVitestConfig({
  environment: 'node',
  overrides: {
    test: {
      include: ['**/*.spec.ts', '**/*.test.ts'],
    },
  },
});

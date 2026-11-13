import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts'],
  coverageExclude: ['src/**/*.spec.ts', 'src/test-setup.ts'],
  overrides: {
    test: {
      testTimeout: 60_000,
    },
  },
});

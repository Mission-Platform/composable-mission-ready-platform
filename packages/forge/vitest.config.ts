import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts', 'src/**/*.tsx'],
  coverageExclude: ['src/**/*.stories.*', 'src/**/index.ts', 'src/jsx.d.ts'],
  overrides: {
    // Match the automatic JSX runtime used by the package source so `.tsx`
    // components produce neutral Forge elements under Vitest as well.
    oxc: {
      jsx: {
        runtime: 'automatic',
        importSource: '@mission-platform/forge',
      },
    },
  },
});

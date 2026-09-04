import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts', 'src/**/*.tsx'],
  coverageExclude: ['src/**/*.stories.*', 'src/**/index.ts'],
  overrides: {
    oxc: {
      jsx: {
        runtime: 'automatic',
        importSource: '@mission-platform/forge-jsx',
      },
    },
    test: {
      // The components consume their CSS Modules' class maps; render the
      // unhashed BEM names in unit tests so the cross-framework parity
      // assertions read against the literal class names.
      css: {
        modules: {
          classNameStrategy: 'non-scoped',
        },
      },
    },
  },
});

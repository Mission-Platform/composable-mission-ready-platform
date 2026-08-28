import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  include: ['src/**/*.spec.ts', 'vite-plugins/forge/src/**/*.spec.ts'],
  coverageInclude: ['src/**/*.ts', 'src/**/*.tsx'],
  coverageExclude: ['src/**/*.stories.*', 'src/**/index.ts', 'src/jsx.d.ts'],
  overrides: {
    oxc: {
      jsx: {
        runtime: 'automatic',
        importSource: '@mission-platform/forge',
      },
    },
    test: {
      // The styled components consume their CSS Modules' class maps; render the
      // unhashed names in unit tests so the cross-framework parity assertions
      // read against the literal class names.
      css: {
        modules: {
          classNameStrategy: 'non-scoped',
        },
      },
    },
  },
});

import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts', 'src/**/*.tsx'],
  coverageExclude: ['src/**/*.stories.*', 'src/**/index.ts'],
  overrides: {
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
    test: {
      // The icons consume their CSS Modules' class maps; render the unhashed
      // BEM names in unit tests so the cross-framework parity assertions read
      // against the literal class names.
      css: {
        modules: {
          classNameStrategy: 'non-scoped',
        },
      },
    },
  },
});

import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts', 'src/**/*.tsx'],
  coverageExclude: ['src/**/*.stories.*', 'src/**/index.ts', 'src/jsx.d.ts'],
  overrides: {
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
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

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
      // The neutral `@mission-platform/icons` is consumed from its source (its
      // published entry resolves to a compiled per-framework build via the
      // `mp:<framework>` export condition), so it must be inlined and
      // transformed by Vite — with the same `h` JSX factory and CSS-Module
      // handling — rather than externalised and loaded as raw `.tsx` by Node.
      server: {
        deps: {
          inline: ['@mission-platform/icons'],
        },
      },
      // The styled components consume their CSS Modules' class maps; render the
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

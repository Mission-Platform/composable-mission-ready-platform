import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  // `*.model.spec.ts` mounts the **compiled Vue build** through the bare
  // `@mission-platform/select` specifier, so it needs the `mp:vue` export
  // condition. The cross-framework parity specs must keep neutral resolution
  // (they render the same neutral source on React *and* Vue), hence the scope.
  framework: 'vue',
  frameworkInclude: ['src/**/*.model.spec.ts'],
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

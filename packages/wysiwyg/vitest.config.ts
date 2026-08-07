import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  // `*.code-dialog.spec.ts` mounts the **compiled Vue build** through the bare
  // `@mission-platform/wysiwyg` specifier, so it needs the `mp:vue` export
  // condition. The cross-framework parity specs must keep neutral resolution
  // (they render the same neutral source on React *and* Vue), hence the scope.
  framework: 'vue',
  frameworkInclude: ['src/**/*.code-dialog.spec.ts'],
  coverageInclude: ['src/**/*.ts', 'src/**/*.tsx'],
  coverageExclude: ['src/**/*.stories.*', 'src/**/index.ts', 'src/jsx.d.ts'],
  overrides: {
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
    test: {
      server: {
        deps: {
          inline: [
            '@mission-platform/icons',
            '@mission-platform/components',
            '@mission-platform/forms',
            '@mission-platform/forms-core',
            '@mission-platform/layouts',
          ],
        },
      },
      css: {
        modules: {
          classNameStrategy: 'non-scoped',
        },
      },
    },
  },
});

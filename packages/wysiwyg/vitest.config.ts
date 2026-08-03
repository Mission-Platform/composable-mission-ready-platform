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

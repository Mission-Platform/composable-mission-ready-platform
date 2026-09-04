import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts', 'src/**/*.tsx'],
  coverageExclude: ['src/**/*.stories.*', 'src/**/index.ts', 'src/**/*.d.ts'],
  overrides: {
    oxc: {
      jsx: {
        runtime: 'automatic',
        importSource: '@mission-platform/forge-jsx',
      },
    },
    test: {
      server: {
        deps: {
          inline: ['@mission-platform/components', '@mission-platform/icons'],
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

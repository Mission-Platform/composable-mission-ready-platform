import { resolve } from 'node:path';

import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts', 'src/**/*.tsx'],
  coverageExclude: ['src/**/*.spec.ts', 'src/test-setup.ts', 'src/test-support/**', 'src/**/*.stories.*'],
  overrides: {
    oxc: {
      jsx: {
        runtime: 'automatic',
        importSource: '@mission-platform/forge-jsx',
      },
    },
    resolve: {
      alias: [
        { find: '@mission-platform/code-scanner', replacement: resolve(import.meta.dirname, 'src/index.ts') },
        {
          find: '@mission-platform/matrix-code',
          replacement: resolve(import.meta.dirname, '../matrix-code/src/index.ts'),
        },
        { find: '@mission-platform/qr-code', replacement: resolve(import.meta.dirname, '../qr-code/src/index.ts') },
        { find: '@mission-platform/barcode', replacement: resolve(import.meta.dirname, '../barcode/src/index.ts') },
        {
          find: '@mission-platform/components',
          replacement: resolve(import.meta.dirname, 'src/test-support/neutral-components.ts'),
        },
      ],
    },
    test: {
      testTimeout: 120_000,
      setupFiles: ['./src/test-setup.ts'],
      server: {
        deps: {
          inline: ['@mission-platform/icons'],
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

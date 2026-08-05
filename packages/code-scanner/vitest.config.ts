import { resolve } from 'node:path';

import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts', 'src/**/*.tsx'],
  coverageExclude: [
    'src/**/*.spec.ts',
    'src/test-setup.ts',
    'src/test-support/**',
    'src/**/*.stories.*',
  ],
  overrides: {
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
    resolve: {
      alias: [
        { find: /^@mission-platform\/code-scanner$/, replacement: resolve(import.meta.dirname, 'src/index.ts') },
        {
          find: /^@mission-platform\/components$/,
          replacement: resolve(import.meta.dirname, 'src/test-support/neutral-components.ts'),
        },
      ],
    },
    test: {
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

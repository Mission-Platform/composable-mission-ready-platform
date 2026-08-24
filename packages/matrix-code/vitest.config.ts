import { resolve } from 'node:path';

import { defineVitestConfig } from '@mission-platform/vite-config/vitest';
import forgeWebScriptPlugin from '@mission-platform/vite-plugin-forge-web-script';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts', 'src/**/*.tsx'],
  coverageExclude: ['src/**/*.spec.ts', 'src/test-setup.ts', 'src/test-support/**', 'src/**/*.stories.*'],
  overrides: {
    plugins: [forgeWebScriptPlugin({ root: import.meta.dirname, requireExports: false, selfHostedVmMode: 'jit' })],
    oxc: {
      jsx: {
        runtime: 'automatic',
        importSource: '@mission-platform/forge',
      },
    },
    resolve: {
      alias: [
        { find: /^@mission-platform\/matrix-code$/, replacement: resolve(import.meta.dirname, 'src/index.ts') },
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

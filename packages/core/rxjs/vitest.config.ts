import { fileURLToPath } from 'node:url';

import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts'],
  coverageExclude: ['src/**/index.ts'],
  overrides: {
    resolve: {
      alias: {
        '@mission-platform/forge-adapters/react': fileURLToPath(
          new URL('../forge-adapters/src/adapters/react.ts', import.meta.url),
        ),
        '@mission-platform/forge-adapters/vue': fileURLToPath(
          new URL('../forge-adapters/src/adapters/vue.ts', import.meta.url),
        ),
        '@mission-platform/forge-adapters': fileURLToPath(new URL('../forge-adapters/src', import.meta.url)),
      },
    },
  },
});

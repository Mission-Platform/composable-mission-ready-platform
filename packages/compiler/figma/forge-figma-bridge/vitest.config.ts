import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  environment: 'node',
  overrides: {
    resolve: { tsconfigPaths: false },
    test: {
      pool: 'threads',
      maxWorkers: 1,
    },
  },
});

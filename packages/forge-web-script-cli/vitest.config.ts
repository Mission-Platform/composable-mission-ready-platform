import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: false },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    pool: 'threads',
    maxWorkers: 1,
  },
});

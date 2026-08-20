import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: false },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    pool: 'threads',
    maxWorkers: 1,
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.stories.*', 'src/index.ts'],
      provider: 'v8',
    },
  },
});

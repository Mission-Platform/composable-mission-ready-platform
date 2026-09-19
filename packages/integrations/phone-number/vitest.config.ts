import { defineVitestConfig } from '@mission-platform/vite-config/vitest';
import flintPlugin from '@mission-platform/vite-plugin-flint';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts'],
  coverageExclude: ['src/**/*.spec.ts', 'src/generated/**'],
  overrides: {
    plugins: [flintPlugin({ root: import.meta.dirname })],
  },
});

import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts', 'src/**/*.tsx'],
  coverageExclude: ['src/**/*.stories.*', 'src/**/index.ts', 'src/jsx.d.ts'],
  overrides: {
    // Match the classic JSX factory used by the package source so `.tsx`
    // components transform to `h(...)` calls under Vitest as well.
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
  },
});

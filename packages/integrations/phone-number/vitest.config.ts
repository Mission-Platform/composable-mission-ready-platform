import { defineVitestConfig } from '@mission-platform/vite-config/vitest';
import forgeWebScriptPlugin from '@mission-platform/vite-plugin-forge-web-script';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts'],
  coverageExclude: ['src/**/*.spec.ts', 'src/generated/**'],
  overrides: {
    plugins: [forgeWebScriptPlugin({ root: import.meta.dirname })],
  },
});

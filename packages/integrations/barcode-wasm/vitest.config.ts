import { resolve } from 'node:path';

import { defineVitestConfig } from '@mission-platform/vite-config/vitest';
import forgeWebScriptPlugin from '@mission-platform/vite-plugin-forge-web-script';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts'],
  coverageExclude: ['src/**/*.spec.ts', 'src/test-setup.ts', 'src/test-support/**', 'src/**/*.stories.*'],
  overrides: {
    plugins: [forgeWebScriptPlugin({ root: import.meta.dirname, requireExports: false })],
    resolve: {
      alias: [{ find: /^@mission-platform\/barcode-wasm$/, replacement: resolve(import.meta.dirname, 'src/index.ts') }],
    },
    test: {
      setupFiles: ['./src/test-setup.ts'],
    },
  },
});

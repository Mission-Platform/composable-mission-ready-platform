import { resolve } from 'node:path';

import { defineVitestConfig } from '@mission-platform/vite-config/vitest';
import flintPlugin from '@mission-platform/vite-plugin-flint';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts'],
  coverageExclude: ['src/**/*.spec.ts', 'src/test-setup.ts', 'src/test-support/**', 'src/**/*.stories.*'],
  overrides: {
    plugins: [flintPlugin({ root: import.meta.dirname, requireExports: false, selfHostedVmMode: 'jit' })],
    resolve: {
      alias: [
        { find: /^@mission-platform\/matrix-code-wasm$/, replacement: resolve(import.meta.dirname, 'src/index.ts') },
      ],
    },
    test: {
      setupFiles: ['./src/test-setup.ts'],
    },
  },
});

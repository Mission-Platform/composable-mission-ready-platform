import { resolve } from 'node:path';

import { createForgeWebScriptCompilerService } from '@mission-platform/forge-web-script';
import { defineVitestConfig } from '@mission-platform/vite-config/vitest';
import forgeWebScriptPlugin from '@mission-platform/vite-plugin-forge-web-script';

const forgeWebScriptCompilerService = createForgeWebScriptCompilerService();

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts'],
  coverageExclude: ['src/**/*.spec.ts', 'src/test-setup.ts', 'src/test-support/**', 'src/**/*.stories.*'],
  overrides: {
    plugins: [
      forgeWebScriptPlugin({
        root: import.meta.dirname,
        requireExports: false,
        compilerService: forgeWebScriptCompilerService,
      }),
    ],
    resolve: {
      alias: [{ find: /^@mission-platform\/qr-code-wasm$/, replacement: resolve(import.meta.dirname, 'src/index.ts') }],
    },
    test: {
      setupFiles: ['./src/test-setup.ts'],
    },
  },
});

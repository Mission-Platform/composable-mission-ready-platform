import { resolve } from 'node:path';

import { createForgeWebScriptCompilerService } from '@mission-platform/forge-web-script';
import { defineVitestConfig } from '@mission-platform/vite-config/vitest';
import forgeWebScriptPlugin from '@mission-platform/vite-plugin-forge-web-script';

// The self-hosted lex bootstrap currently reports false negatives on the larger
// QR encoder graphs (output payload hashes match, but the VM fingerprint
// diverges). Use a plain compiler service for package tests so FWS runtime
// behavior remains under test without the broken bootstrap gate.
const forgeWebScriptCompilerService = createForgeWebScriptCompilerService();

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts', 'src/**/*.tsx'],
  coverageExclude: ['src/**/*.spec.ts', 'src/test-setup.ts', 'src/test-support/**', 'src/**/*.stories.*'],
  overrides: {
    plugins: [
      forgeWebScriptPlugin({
        root: import.meta.dirname,
        requireExports: false,
        compilerService: forgeWebScriptCompilerService,
        requestedCapabilities: (fileName) => (fileName.includes('qr-decoder.fws') ? ['qr.decode.utf8'] : undefined),
      }),
    ],
    oxc: {
      jsx: {
        runtime: 'automatic',
        importSource: '@mission-platform/forge',
      },
    },
    resolve: {
      alias: [
        { find: /^@mission-platform\/qr-code$/, replacement: resolve(import.meta.dirname, 'src/index.ts') },
        {
          find: /^@mission-platform\/components$/,
          replacement: resolve(import.meta.dirname, 'src/test-support/neutral-components.ts'),
        },
      ],
    },
    test: {
      setupFiles: ['./src/test-setup.ts'],
      server: {
        deps: {
          inline: ['@mission-platform/icons'],
        },
      },
      css: {
        modules: {
          classNameStrategy: 'non-scoped',
        },
      },
    },
  },
});

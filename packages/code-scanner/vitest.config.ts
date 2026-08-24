import { resolve } from 'node:path';

import { defineVitestConfig } from '@mission-platform/vite-config/vitest';
import forgeWebScriptPlugin from '@mission-platform/vite-plugin-forge-web-script';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts', 'src/**/*.tsx'],
  coverageExclude: ['src/**/*.spec.ts', 'src/test-setup.ts', 'src/test-support/**', 'src/**/*.stories.*'],
  overrides: {
    plugins: [
      forgeWebScriptPlugin({
        root: import.meta.dirname,
        projectRoots: [
          resolve(import.meta.dirname, 'src/fws'),
          resolve(import.meta.dirname, '../qr-code/src/fws'),
          resolve(import.meta.dirname, '../matrix-code/src/fws'),
          resolve(import.meta.dirname, '../barcode/src/fws'),
        ],
        crossProjectLinkMode: 'static',
        defaultLinkMode: 'static',
        linkProfile: 'static',
        optimization: 'release',
        targetFeatures: { simd: true },
        requireExports: false,
        requestedCapabilities: (fileName) => (fileName.endsWith('/qr-decoder.fws') ? ['qr.decode.utf8'] : undefined),
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
        { find: /^@mission-platform\/code-scanner$/, replacement: resolve(import.meta.dirname, 'src/index.ts') },
        {
          find: /^@mission-platform\/components$/,
          replacement: resolve(import.meta.dirname, 'src/test-support/neutral-components.ts'),
        },
      ],
    },
    test: {
      testTimeout: 120_000,
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

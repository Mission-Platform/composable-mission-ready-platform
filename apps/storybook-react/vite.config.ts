/// <reference types="vitest/config" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import postcssConfig from '@mission-platform/postcss-config';
import i18nPlugin from '@mission-platform/vite-plugin-i18n';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const dirname = typeof __dirname === 'undefined' ? path.dirname(fileURLToPath(import.meta.url)) : __dirname;

export default defineConfig({
  server: {
    fs: {
      strict: false,
      allow: ['/'],
    },
  },
  optimizeDeps: {
    include: ['storybook/test'],
  },
  css: {
    postcss: postcssConfig,
  },
  plugins: [react(), i18nPlugin({ defaultLocale: 'en' })],
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          fileParallelism: false,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ persistentContext: false }),
            instances: [{ browser: 'chromium' } /*{ browser: 'firefox' }, { browser: 'webkit' }*/],
          },
        },
      },
    ],
  },
});

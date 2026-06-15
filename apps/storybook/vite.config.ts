/// <reference types="vitest/config" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineAppConfig } from '@mission-platform/vite-config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { playwright } from '@vitest/browser-playwright';
import svgLoader from 'vite-svg-loader';

const dirname = typeof __dirname === 'undefined' ? path.dirname(fileURLToPath(import.meta.url)) : __dirname;

export default defineAppConfig({
  overrides: {
    plugins: [
      vueJsx(),
      svgLoader({
        svgo: true,
        defaultImport: 'component',
        svgoConfig: { multipass: true, datauri: 'unenc' },
      }),
    ],
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
            browser: {
              enabled: true,
              headless: true,
              provider: playwright({ persistentContext: false }),
              instances: [{ browser: 'chromium' } /*{ browser: 'firefox' }, { browser: 'webkit' }*/],
            },
          },
        },
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['src/**/*.test.ts'],
          },
        },
      ],
    },
  },
});

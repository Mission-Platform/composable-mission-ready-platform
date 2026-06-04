/// <reference types="vitest/config" />
// https://vite.dev/config/
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import postcssConfig from '@mission-platform/postcss-config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vite';
import svgLoader from 'vite-svg-loader';

const dirname = typeof __dirname === 'undefined' ? path.dirname(fileURLToPath(import.meta.url)) : __dirname;

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  css: {
    postcss: postcssConfig,
  },
  plugins: [
    vue(),
    vueJsx(),
    VueI18nPlugin({
      include: [
        path.resolve(dirname, '../../packages/*/src/**/*.vue'),
      ],
    }),
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
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: 'chromium',
              },
              {
                browser: 'firefox',
              },
              {
                browser: 'webkit',
              },
            ],
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
});

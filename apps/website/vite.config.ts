/// <reference types="vitest/config" />
import path from 'node:path';

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import postcssConfig from '@mission-platform/postcss-config';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// We don't use `defineAppConfig` here because we need to customise the
// `VueI18nPlugin` `include` option so that the lazy-loaded standalone YAML
// bundles under `src/locales/` are compiled to locale-message modules.
// Merging would produce duplicate Vue / i18n plugin instances and break the
// SFC pipeline.
export default defineConfig({
  css: {
    postcss: postcssConfig,
  },
  plugins: [
    vue(),
    VueI18nPlugin({
      include: [path.resolve(__dirname, 'src/locales/**/*.yaml')],
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});

import path from 'node:path';

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import postcssConfig from '@mission-platform/postcss-config';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  css: {
    postcss: postcssConfig,
  },
  plugins: [vue(), VueI18nPlugin({ include: [] })],
  build: {
    lib: {
      entry: {
        ui: path.resolve(__dirname, 'src/index.ts'),
      },
      name: 'MissionPlatformUi',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['vue', 'vue-i18n', '@mission-platform/i18n'],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
    cssCodeSplit: false,
  },
});

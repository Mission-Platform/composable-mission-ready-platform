import path from 'node:path';

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import Vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    Vue(),
    VueI18nPlugin({
      include: path.resolve(__dirname, 'src/locales/**/*.yaml'),
    }),
  ],
  build: {
    lib: {
      entry: {
        i18n: path.resolve(__dirname, 'src/index.ts'),
        locales: path.resolve(__dirname, 'src/locales/index.ts'),
      },
      name: 'MissionPlatformI18n',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['vue', 'vue-i18n'],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
});

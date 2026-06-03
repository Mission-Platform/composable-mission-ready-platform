import { resolve } from 'node:path'

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import postcssConfig from '@mission-platform/postcss-config'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  css: {
    postcss: postcssConfig,
  },
  plugins: [
    vue(),
    VueI18nPlugin({
      include: resolve(__dirname, 'src/locales/**/*.yaml'),
    }),
  ],
  build: {
    lib: {
      entry: {
        ui: resolve(__dirname, 'src/index.ts'),
        locales: resolve(__dirname, 'src/locales/index.ts'),
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
})

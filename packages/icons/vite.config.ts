import { resolve } from 'node:path'

import postcssConfig from '@mission-platform/postcss-config'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import svgLoader from 'vite-svg-loader'

export default defineConfig({
  css: {
    postcss: postcssConfig,
  },
  plugins: [
    vue(),
    svgLoader({
      svgo: true,
      defaultImport: 'component',
      svgoConfig: { multipass: true, datauri: 'unenc' },
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MissionPlatformIcons',
      fileName: 'icons',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
})

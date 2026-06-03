import path from 'node:path'

import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/tokens.ts'),
      name: 'MissionPlatformTokens',
      fileName: 'tokens',
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        preserveModules: false,
      },
    },
  },
})

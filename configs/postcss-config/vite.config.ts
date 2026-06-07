import path from 'node:path';

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'MissionPlatformPostcssConfig',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['autoprefixer', 'postcss'],
      output: {
        preserveModules: false,
      },
    },
  },
});

import path from 'node:path';

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        'harper.worker': path.resolve(__dirname, 'src/harper.worker.ts'),
      },
      name: 'MissionPlatformHarper',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['monaco-editor', 'vue'],
      output: {
        preserveModules: false,
      },
    },
  },
});

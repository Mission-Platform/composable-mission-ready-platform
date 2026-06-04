import path from 'node:path';

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: {
        hunspell: path.resolve(__dirname, 'src/index.ts'),
        'hunspell.worker': path.resolve(__dirname, 'src/hunspell.worker.ts'),
      },
      name: 'MissionPlatformHunspell',
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  assetsInclude: ['**/*.wasm'],
});

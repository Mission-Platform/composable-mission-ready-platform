import path from 'node:path';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: {
        map: path.resolve(__dirname, 'src/index.ts'),
        locales: path.resolve(__dirname, 'src/locales/index.ts'),
      },
      name: 'MissionPlatformMap',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['vue', 'maplibre-gl'],
      output: {
        globals: {
          vue: 'Vue',
          'maplibre-gl': 'maplibregl',
        },
      },
    },
  },
});

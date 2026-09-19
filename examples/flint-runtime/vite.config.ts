import { resolve } from 'node:path';

import { defineConfig } from 'vite';

import flintPlugin from '@mission-platform/vite-plugin-flint';

export default defineConfig({
  resolve: {
    alias: {
      '@flint-example/runtime.flint': resolve(import.meta.dirname, 'src/runtime.flint'),
    },
  },
  plugins: [flintPlugin({
    projectRoots: [resolve(import.meta.dirname, 'src'), resolve(import.meta.dirname, 'shared-project')],
    crossProjectLinkMode: 'dynamic',
  })],
});

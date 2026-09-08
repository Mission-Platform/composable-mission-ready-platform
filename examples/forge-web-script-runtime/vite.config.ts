import { resolve } from 'node:path';

import { defineConfig } from 'vite';

import forgeWebScriptPlugin from '@mission-platform/vite-plugin-forge-web-script';

export default defineConfig({
  resolve: {
    alias: {
      '@forge-example/runtime.fws': resolve(import.meta.dirname, 'src/runtime.fws'),
    },
  },
  plugins: [forgeWebScriptPlugin({
    projectRoots: [resolve(import.meta.dirname, 'src'), resolve(import.meta.dirname, 'shared-project')],
    crossProjectLinkMode: 'dynamic',
  })],
});
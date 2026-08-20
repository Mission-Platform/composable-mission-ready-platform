import { resolve } from 'node:path';

import { defineConfig } from 'vite';

import forgeWebScriptPlugin from '@mission-platform/vite-plugin-forge-web-script';

export default defineConfig({
  resolve: {
    alias: {
      '@forge-example/runtime.fws': resolve(__dirname, 'src/runtime.fws'),
    },
  },
  plugins: [forgeWebScriptPlugin({
    projectRoots: [resolve(__dirname, 'src'), resolve(__dirname, 'shared-project')],
    crossProjectLinkMode: 'dynamic',
  })],
});
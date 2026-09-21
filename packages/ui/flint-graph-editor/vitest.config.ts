import { resolve } from 'node:path';

import { defineVitestConfig } from '@mission-platform/vite-config/vitest';
import flintPlugin from '@mission-platform/vite-plugin-flint';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts'],
  coverageExclude: ['src/**/*.spec.ts', 'src/**/*.stories.*'],
  overrides: {
    plugins: [
      flintPlugin({
        root: import.meta.dirname,
        requireExports: false,
        requestedCapabilities: [
          'webgpu.render_begin',
          'webgpu.render_grid',
          'webgpu.render_edges',
          'webgpu.render_nodes',
          'webgpu.render_pins',
          'webgpu.render_end',
        ],
      }),
    ],
    resolve: {
      alias: [
        {
          find: /^@mission-platform\/flint-graph-editor$/,
          replacement: resolve(import.meta.dirname, 'src/index.ts'),
        },
      ],
    },
  },
});

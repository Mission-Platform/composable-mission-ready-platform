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
          'webgpu.upload_camera_buffer',
          'webgpu.upload_node_buffer',
          'webgpu.upload_edge_buffer',
          'webgpu.upload_pin_buffer',
          'webgpu.render_begin',
          'webgpu.render_grid',
          'webgpu.render_edges',
          'webgpu.render_nodes',
          'webgpu.render_pins',
          'webgpu.render_end',
          'webgpu.write_node_instance',
          'webgpu.write_edge_instance',
          'webgpu.write_pin_instance',
          'webgl.render_begin',
          'webgl.render_grid',
          'webgl.draw_edge',
          'webgl.draw_node',
          'webgl.draw_pin',
          'webgl.render_end',
          'webgl.render_frame',
          'canvas2d.render_begin',
          'canvas2d.render_grid',
          'canvas2d.draw_edge',
          'canvas2d.draw_node',
          'canvas2d.draw_pin',
          'canvas2d.render_end',
          'canvas2d.render_frame',
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

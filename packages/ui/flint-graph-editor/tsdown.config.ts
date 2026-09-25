import path from 'node:path';

import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineTsdownForgeTarget } from '@mission-platform/tsdown-config';
import flintPlugin from '@mission-platform/vite-plugin-flint';
import { defineTsdownForgeComponentsAll } from '@mission-platform/vite-plugin-forge';

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');
const buildNeutral = process.env.FORGE_FRAMEWORK_TARGET === undefined || process.env.FORGE_FRAMEWORK_TARGET === 'none';
const flintPlugins = [
  flintPlugin({
    root: rootDirectory,
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
];

export default [
  ...(buildNeutral
    ? [
        defineTsdownForgeTarget({
          rootDir: rootDirectory,
          entry: 'src/index.ts',
          dts: true,
          clean: true,
          overrides: {
            plugins: flintPlugins,
          },
        }),
      ]
    : []),
  ...(process.env.FORGE_FRAMEWORK_TARGET === 'none'
    ? []
    : defineTsdownForgeComponentsAll({
        rootDir: rootDirectory,
        frameworks: [
          forgeReactFramework(),
          forgeSolidFramework(),
          forgeSvelteFramework(),
          forgeWebComponentsFramework(),
          forgeVueFramework(),
        ],
        componentsModule,
        name: 'MissionPlatformFlintGraphEditor',
        external: [
          '@mission-platform/components',
          '@mission-platform/d3',
          '@mission-platform/flint',
          '@mission-platform/flint-runtime',
          '@mission-platform/icons',
          '@mission-platform/tokens',
          'd3',
        ],
        declarationModule: '..',
        overrides: {
          plugins: flintPlugins,
        },
      })),
];

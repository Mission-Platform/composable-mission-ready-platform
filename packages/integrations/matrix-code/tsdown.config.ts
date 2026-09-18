import path from 'node:path';

import { tsdownForgeCmsPlugins } from '@mission-platform/forge-cms-plugin-api';
import { forgeStoryblokCmsTargets } from '@mission-platform/forge-cms-storyblok';
import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponentsAll } from '@mission-platform/vite-plugin-forge';

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');

const buildNeutral = process.env.FORGE_FRAMEWORK_TARGET === undefined || process.env.FORGE_FRAMEWORK_TARGET === 'none';

/**
 * Re-exports the Wasm matrix encoder engine from `@mission-platform/matrix-code-wasm`
 * and compiles the multi-framework UI components (`dist/{vue,react,solid,web-components,svelte}/`)
 * without duplicating the Wasm binary into each component library.
 */
export default [
  ...(buildNeutral
    ? [
        defineTsdownLibrary({
          rootDir: import.meta.dirname,
          entry: {
            index: 'src/index.ts',
          },
          unbundle: false,
          clean: true,
          external: ['@mission-platform/matrix-code-wasm'],
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
        name: 'MissionPlatformMatrixCode',
        external: ['i18next', '@mission-platform/matrix-code-wasm'],
        declarationModule: '..',
      })),
  ...(process.env.FORGE_FRAMEWORK_TARGET === 'none'
    ? []
    : [
        defineTsdownLibrary({
          rootDir: rootDirectory,
          entry: componentsModule,
          plugins: tsdownForgeCmsPlugins({
            rootDir: rootDirectory,
            componentsModule,
            targets: forgeStoryblokCmsTargets({
              packageName: '@mission-platform/matrix-code',
              frameworks: [
                forgeReactFramework(),
                forgeVueFramework(),
                forgeSvelteFramework(),
                forgeSolidFramework(),
                forgeWebComponentsFramework(),
              ],
            }),
          }),
          external: ['@mission-platform/matrix-code-wasm'],
        }),
      ]),
];

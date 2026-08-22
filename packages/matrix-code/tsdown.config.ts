import path from 'node:path';

import { defineTsdownForgeCmsAll } from '@mission-platform/forge-cms-plugin-api';
import { forgeStoryblokCmsTargets } from '@mission-platform/forge-cms-storyblok';
import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponents } from '@mission-platform/vite-plugin-forge';
import forgeWebScriptPlugin from '@mission-platform/vite-plugin-forge-web-script';

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');

/**
 * Neutral self-contained encoder/decoder (`dist/index.js` + dts) plus the five
 * forge component framework builds (`dist/{vue,react,solid,svelte,web-components}/`).
 * Encoding and decoding execute through package-local FWS artifacts only.
 */
export default [
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    entry: {
      index: 'src/index.ts',
    },
    // Single self-contained ESM bundle (not preserve-modules).
    unbundle: false,
    clean: true,
    overrides: {
      plugins: [forgeWebScriptPlugin({ rootDir: rootDirectory, requireExports: false, selfHostedVmMode: 'aot' })],
    },
  }),
  ...defineTsdownForgeComponents({
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
    external: ['i18next', '@mission-platform/matrix-code'],
    declarationModule: '..',
    overrides: {
      plugins: [forgeWebScriptPlugin({ rootDir: rootDirectory, requireExports: false, selfHostedVmMode: 'aot' })],
    },
  }),
  ...defineTsdownForgeCmsAll({
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
];

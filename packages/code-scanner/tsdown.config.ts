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

/** FWS roots flattened into the neutral scanner artifact. */
const scannerProjectRoots = [
  path.resolve(rootDirectory, 'src/fws'),
  path.resolve(rootDirectory, '../qr-code/src/fws'),
  path.resolve(rootDirectory, '../matrix-code/src/fws'),
  path.resolve(rootDirectory, '../barcode/src/fws'),
];

/**
 * Neutral self-contained scanner façade (`dist/index.js` + dts) plus the five
 * forge component framework builds (`dist/{vue,react,solid,web-components}/`).
 * The static scanner graph links decoder source modules directly, so no decoder
 * runtime package is imported by the published neutral entry.
 */
export default [
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    entry: {
      index: 'src/index.ts',
    },
    unbundle: false,
    clean: true,
    overrides: {
      plugins: [
        forgeWebScriptPlugin({
          root: rootDirectory,
          projectRoots: scannerProjectRoots,
          crossProjectLinkMode: 'static',
          defaultLinkMode: 'static',
          linkProfile: 'static',
          optimization: 'release',
          requireExports: false,
          requestedCapabilities: (fileName) => (fileName.endsWith('/qr-decoder.fws') ? ['qr.decode.utf8'] : undefined),
        }),
      ],
    },
  }),
  ...(process.env.FORGE_FRAMEWORK_TARGET === 'none'
    ? []
    : defineTsdownForgeComponents({
        rootDir: rootDirectory,
        frameworks: [
          forgeReactFramework(),
          forgeSolidFramework(),
          forgeSvelteFramework(),
          forgeWebComponentsFramework(),
          forgeVueFramework(),
        ],
        componentsModule,
        name: 'MissionPlatformCodeScanner',
        external: ['i18next'],
        declarationModule: '..',
      })),
  ...defineTsdownForgeCmsAll({
    rootDir: rootDirectory,
    componentsModule,
    targets: forgeStoryblokCmsTargets({
      packageName: '@mission-platform/code-scanner',
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

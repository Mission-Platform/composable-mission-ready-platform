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

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');

/**
 * Workspace `-wasm` packages whose already self-contained (base64-inlined)
 * output is bundled into the matrix-code package so the published artifact stays
 * self-contained with no external runtime dependency.
 */
const WASM_PACKAGES = [
  '@mission-platform/matrix-code-encode-wasm',
  '@mission-platform/matrix-code-decode-wasm',
] as const;

/**
 * Neutral self-contained encoder/decoder (`dist/index.js` + dts) plus the five
 * forge component framework builds (`dist/{vue,react,solid,svelte,web-components}/`).
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
      // tsdown externalises package.json dependencies by default; force the
      // self-contained `-wasm` packages into this bundle so the published
      // artifact needs no external runtime dependency.
      deps: {
        alwaysBundle: [...WASM_PACKAGES],
      },
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
    external: ['i18next'],
    declarationModule: '..',
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

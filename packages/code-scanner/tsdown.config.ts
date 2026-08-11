import path from 'node:path';

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
 * Workspace `-wasm` package whose already self-contained (base64-inlined) output
 * is bundled into the code-scanner package so the published artifact stays
 * self-contained with no external runtime dependency.
 */
const WASM_PACKAGES = ['@mission-platform/code-scan-wasm'] as const;

/**
 * Neutral self-contained scanner façade (`dist/index.js` + dts) plus the five
 * forge component framework builds (`dist/{vue,react,solid,web-components}/`).
 * Sibling decoder packages stay external so their inlined wasm is not re-bundled.
 */
export default [
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    entry: {
      index: 'src/index.ts',
    },
    unbundle: false,
    clean: true,
    external: ['@mission-platform/qr-code', '@mission-platform/matrix-code', '@mission-platform/barcode'],
    overrides: {
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
    name: 'MissionPlatformCodeScanner',
    external: ['i18next'],
    declarationModule: '..',
  }),
];

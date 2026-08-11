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
 * Neutral component declarations (`dist/components/**`) plus the five forge
 * framework builds (`dist/{vue,react,solid,svelte,web-components}/`). Matches the
 * prior Vite wiring: `generateFrameworkSources` + synthesised entry dts
 * (`declarationModule: '../components'`).
 */
export default [
  // Emit the neutral tree under `dist/components/**` so package exports and the
  // forge entry dts (`declarationModule: '../components'`) resolve the same
  // layout as the prior `tsc --emitDeclarationOnly` output.
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    entry: 'src/components/index.ts',
    clean: true,
    overrides: {
      outDir: path.resolve(import.meta.dirname, 'dist/components'),
    },
  }),
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    entry: 'src/sprite/asset.ts',
    clean: false,
    overrides: {
      outDir: path.resolve(import.meta.dirname, 'dist/sprite'),
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
    name: 'MissionPlatformJsxForms',
    external: ['i18next'],
    declarationModule: '..',
  }),
];

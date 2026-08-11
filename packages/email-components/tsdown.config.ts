import path from 'node:path';

import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponents, defineTsdownForgeEmailComponents } from '@mission-platform/vite-plugin-forge';

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');

/**
 * Keep the neutral public entry and emit a separate neutral entry for server
 * email use. Generic browser rendering remains on the standard components
 * build and the optional renderer adapters.
 */
export default [
  defineTsdownLibrary({
    rootDir: rootDirectory,
    entry: 'src/index.ts',
    clean: true,
  }),
  defineTsdownForgeEmailComponents({
    rootDir: rootDirectory,
    componentsModule,
    name: 'MissionPlatformEmailComponents',
    external: ['@mission-platform/email-renderer'],
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
    name: 'MissionPlatformEmailComponents',
    declarationModule: '..',
  }),
];

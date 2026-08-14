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

export default [
  defineTsdownLibrary({
    rootDir: rootDirectory,
    entry: ['src/index.ts', 'src/calendar/index.ts'],
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
    componentsModule: path.resolve(rootDirectory, 'src/components/index.ts'),
    name: 'MissionPlatformVCard',
    declarationModule: '..',
  }),
  ...defineTsdownForgeCmsAll({
    rootDir: rootDirectory,
    componentsModule: path.resolve(rootDirectory, 'src/components/index.ts'),
    targets: forgeStoryblokCmsTargets({
      packageName: '@mission-platform/vcard',
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

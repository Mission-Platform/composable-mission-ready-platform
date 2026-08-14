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

export default [
  defineTsdownLibrary({ rootDir: import.meta.dirname, entry: { index: 'src/index.ts' } }),
  ...defineTsdownForgeComponents({
    rootDir: import.meta.dirname,
    frameworks: [
      forgeVueFramework(),
      forgeReactFramework(),
      forgeSolidFramework(),
      forgeSvelteFramework(),
      forgeWebComponentsFramework(),
    ],
    componentsModule: path.resolve(import.meta.dirname, 'src/components/index.ts'),
    name: 'MissionPlatformContent',
  }),
  ...defineTsdownForgeCmsAll({
    rootDir: import.meta.dirname,
    componentsModule: path.resolve(import.meta.dirname, 'src/components/index.ts'),
    targets: forgeStoryblokCmsTargets({
      packageName: '@mission-platform/content',
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

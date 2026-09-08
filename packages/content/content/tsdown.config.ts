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

export default [
  defineTsdownLibrary({
    rootDir: rootDirectory,
    entry: { index: 'src/index.ts' },
  }),
  ...defineTsdownForgeComponentsAll({
    rootDir: rootDirectory,
    frameworks: [
      forgeVueFramework(),
      forgeReactFramework(),
      forgeSolidFramework(),
      forgeSvelteFramework(),
      forgeWebComponentsFramework(),
    ],
    componentsModule,
    name: 'MissionPlatformContent',
  }),
  defineTsdownLibrary({
    rootDir: rootDirectory,
    entry: componentsModule,
    plugins: tsdownForgeCmsPlugins({
      rootDir: rootDirectory,
      componentsModule,
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
  }),
];

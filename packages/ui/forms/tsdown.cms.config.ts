import path from 'node:path';

import { defineTsdownForgeCmsTargetConfigs } from '@mission-platform/forge-cms-plugin-api';
import { forgeStoryblokCmsTargets } from '@mission-platform/forge-cms-storyblok';
import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');

export default defineTsdownForgeCmsTargetConfigs({
  rootDir: rootDirectory,
  componentsModule,
  targets: forgeStoryblokCmsTargets({
    packageName: '@mission-platform/forms',
    frameworks: [
      forgeReactFramework(),
      forgeVueFramework(),
      forgeSvelteFramework(),
      forgeSolidFramework(),
      forgeWebComponentsFramework(),
    ],
  }),
});

import path from 'node:path';

import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineJsxLibraryConfig, type JsxFramework } from '@mission-platform/vite-plugin-forge';
import { defineConfig, type UserConfig } from 'vite';

const componentsModule = path.resolve(import.meta.dirname, 'src/components/index.ts');
function defineFrameworkConfig(framework: JsxFramework): UserConfig {
  const plugin =
    framework === 'vue'
      ? forgeVueFramework()
      : framework === 'react'
        ? forgeReactFramework()
        : framework === 'solid'
          ? forgeSolidFramework()
          : framework === 'svelte'
            ? forgeSvelteFramework()
            : forgeWebComponentsFramework();
  const frameworkExternals =
    framework === 'react'
      ? ['react', 'react-dom']
      : framework === 'vue'
        ? ['vue']
        : framework === 'solid'
          ? ['solid-js']
          : framework === 'svelte'
            ? ['svelte']
            : framework === 'web-components'
              ? ['lit']
              : ['lit'];

  return defineJsxLibraryConfig({
    rootDir: import.meta.dirname,
    plugin,
    name: 'MissionPlatformTypographyJsx',
    componentsModule,
    external: frameworkExternals,
    overrides: {
      build: {
        cssCodeSplit: true,
      },
    },
  });
}

export default defineConfig(({ mode }): UserConfig => {
  switch (mode) {
    case 'react':
    case 'vue':
    case 'solid':
    case 'svelte':
    case 'web-components': {
      return defineFrameworkConfig(mode);
    }
    default: {
      return defineFrameworkConfig('vue');
    }
  }
});

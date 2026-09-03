import { createRequire } from 'node:module';
import path from 'node:path';

import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineLibraryConfig } from '@mission-platform/vite-config';
import {
  generateFrameworkSources,
  jsxComponentsCssImportPlugin,
  jsxComponentsDtsPlugin,
  type JsxFramework,
  reactJsxPlugin,
  solidJsxPlugin,
  sveltePlugin,
} from '@mission-platform/vite-plugin-forge';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

const componentsModule = path.resolve(import.meta.dirname, 'src/components/index.ts');
const cacheRoot = path.resolve(import.meta.dirname, 'node_modules/.cache');
const vueTscBin = createRequire(import.meta.url).resolve('vue-tsc/bin/vue-tsc.js', {
  paths: [path.join(import.meta.dirname, 'node_modules/@mission-platform/forge')],
});

function defineFrameworkConfig(framework: JsxFramework): UserConfig {
  const cacheName = `typography-${framework}`;
  const generatedDirectory = path.join(cacheRoot, cacheName);
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
  const entry = generateFrameworkSources({
    plugin,
    componentsModule,
    outDir: generatedDirectory,
  });

  const stagePlugins: Plugin[] =
    framework === 'vue'
      ? [vueJsx()]
      : framework === 'react'
        ? [reactJsxPlugin()]
        : framework === 'solid'
          ? [...solidJsxPlugin()]
          : framework === 'svelte'
            ? [...sveltePlugin()]
            : [];

  const frameworkSuffix =
    framework === 'react'
      ? 'React'
      : framework === 'vue'
        ? 'Vue'
        : framework === 'solid'
          ? 'Solid'
          : framework === 'svelte'
            ? 'Svelte'
            : 'WebComponents';

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
              : [];

  return defineLibraryConfig({
    rootDir: import.meta.dirname,
    name: `MissionPlatformTypographyJsx${frameworkSuffix}`,
    entry,
    external: frameworkExternals,
    overrides: {
      build: {
        outDir: `dist/${framework}`,
        cssCodeSplit: true,
      },
      plugins: [
        ...stagePlugins,
        jsxComponentsCssImportPlugin(),
        jsxComponentsDtsPlugin({
          framework,
          generatedDir: generatedDirectory,
          outDir: path.resolve(import.meta.dirname, `dist/${framework}`),
          vueTscBin,
          componentsModule,
        }),
      ],
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

import path from 'node:path';

import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineJsxLibraryConfig, type JsxFramework } from '@mission-platform/vite-plugin-forge';
import { defineConfig, type UserConfig } from 'vite';

/**
 * The package ships **only** framework-specific builds (no neutral artifact),
 * produced by the two-stage compiler in `@mission-platform/vite-plugin-forge`:
 *
 * - **Stage 1** — `generateFrameworkSources` reads the neutral icons barrel
 *   (`src/components/index.ts`) and emits a per-framework source tree into a
 *   build-cache directory: React `.tsx` modules, or real Vue `.vue` SFCs. It
 *   returns the generated entry path.
 * - **Stage 2** — the framework's own toolchain compiles that tree natively:
 *   the classic-`h` React JSX transform (`reactJsxPlugin`) or
 *   `@vitejs/plugin-vue` (from `defineLibraryConfig`) + `@vitejs/plugin-vue-jsx`.
 *
 * Each build runs with **`preserveModules` + `cssCodeSplit`**, so every icon is
 * emitted as its own JS chunk **and** its own CSS asset (from the icon's
 * co-located `.module.scss`). Combined with `sideEffects` in `package.json`
 * (CSS only), consumers importing a single icon pull just that icon's JS + CSS
 * and tree-shake the rest of the library away.
 *
 * The two frameworks are emitted into separate `dist/<framework>/` subtrees and
 * exposed through the package's `./react` and `./vue` subpath exports.
 *
 * `tsc` then emits the neutral icons' own declarations into `dist/components/**`,
 * which the synthesised entry `.d.ts` files import from.
 */
const componentsModule = path.resolve(import.meta.dirname, 'src/components/index.ts');
/** Build the per-framework library config (shared between all framework modes). */
function defineFrameworkConfig(framework: JsxFramework): UserConfig {
  const plugin =
    framework === 'react'
      ? forgeReactFramework()
      : framework === 'vue'
        ? forgeVueFramework()
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
    name: 'MissionPlatformIconsJsx',
    componentsModule,
    useEntryDts: true,
    declarationModule: '../components',
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

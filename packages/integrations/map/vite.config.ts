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
 * - **Stage 1** — `generateFrameworkSources` reads the neutral components barrel
 *   (`src/components/index.ts`) and emits a per-framework source tree into a
 *   build-cache directory: React `.tsx` modules / real Vue `.vue` SFCs, plus the
 *   package's composables/context/store carried alongside (the neutral
 *   composables and `map-context` are compiled per framework; the agnostic
 *   `drawing-store`/`to-map-color` helpers are copied verbatim).
 * - **Stage 2** — the framework's own toolchain compiles that tree natively
 *   (the classic-`h` React JSX transform / `@vitejs/plugin-vue` + `plugin-vue-jsx`).
 *
 * The two frameworks are emitted into separate `dist/<framework>/` subtrees and
 * exposed through the `./react` and `./vue` subpath exports. Each build runs
 * `preserveModules` + `cssCodeSplit` so every component keeps its own JS chunk +
 * CSS asset, and gets its own genuine declarations from
 * {@link jsxComponentsDtsPlugin} (the TS compiler API over the React tree,
 * `vue-tsc` over the Vue tree). `tsc` also emits the neutral components' own
 * declarations into `dist/components/**` for the package's neutral `.` entry.
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
            : ['lit'];

  return defineJsxLibraryConfig({
    rootDir: import.meta.dirname,
    plugin,
    name: 'MissionPlatformJsxMap',
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

import path from 'node:path';

import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineLibraryConfig } from '@mission-platform/vite-config';
import { defineJsxLibraryConfig, type JsxFramework } from '@mission-platform/vite-plugin-forge';
import forgeWebScriptPlugin from '@mission-platform/vite-plugin-forge-web-script';
import { defineConfig, type UserConfig } from 'vite';

/**
 * `@mission-platform/matrix-code` ships **three** distinct build artifacts from
 * a single Vite config, selected by `--mode`:
 *
 * - **default** — the dependency-free package-local FWS **encoder**
 *   (`src/index.ts`), emitted as the self-contained `dist/index.js`. This is
 *   the package's `.` export.
 * - **`vue` / `react`** — the write-once `ForgeMatrixCode` **component** compiled
 *   to native Vue 3 / React by the two-stage compiler in
 *   `@mission-platform/vite-plugin-forge` (Stage 1 generates the per-framework
 *   source tree from the neutral barrel `src/component/index.ts`; Stage 2 is the
 *   framework's own toolchain). These are the package's `./vue` / `./react`
 *   exports. The component imports the encoder from the package's own `.` entry
 *   (`@mission-platform/matrix-code`, kept external), reuses `ForgeButton` from
 *   `@mission-platform/components`; typography is supplied by the dedicated
 *   `@mission-platform/typography` package.
 */

const componentsModule = path.resolve(import.meta.dirname, 'src/components/index.ts');

/** The self-contained encoder bundle (`dist/index.js`, the `.` export). */
function defineEncoderConfig(): UserConfig {
  return defineLibraryConfig({
    rootDir: import.meta.dirname,
    entry: {
      index: 'src/index.ts',
    },
    name: 'MissionPlatformMatrixCode',
    // Keep the package-local FWS loaders self-contained rather than emitting a
    // separate module graph.
    preserveModules: false,
    overrides: {
      plugins: [forgeWebScriptPlugin({ root: import.meta.dirname, requireExports: false, selfHostedVmMode: 'aot' })],
    },
  });
}

/** The per-framework `ForgeMatrixCode` component build (`dist/react`, `dist/vue`, `dist/solid`, `dist/svelte`, `dist/web-components`). */
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
    name: 'MissionPlatformMatrixCode',
    componentsModule,
    // The encoder is consumed through the package's own `.` entry, kept external
    // so the shipped component references it rather than re-inlining the wasm.
    external: [...frameworkExternals, '@mission-platform/matrix-code'],
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
      return defineEncoderConfig();
    }
  }
});

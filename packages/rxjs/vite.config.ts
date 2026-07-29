import path from 'node:path';

import { defineLibraryConfig } from '@mission-platform/vite-config';
import {
  generateHookLibrarySources,
  hookLibraryDtsPlugin,
  reactJsxPlugin,
  solidJsxPlugin,
  sveltePlugin,
  type JsxFramework,
} from '@mission-platform/vite-plugin-jsx';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

/**
 * `@mission-platform/rxjs` ships a **framework-neutral** root entry (`.`, the
 * write-once `useObservable`/`useSubscription` authored against
 * `@mission-platform/jsx`'s render-once hooks, for SSR/neutral use) **and** live
 * **React** (`./react`) and **Vue** (`./vue`) entries, produced by the two-stage
 * compiler in `@mission-platform/vite-plugin-jsx`:
 *
 * - **Default mode** — bundles the neutral source (`src/index.ts`) as-is into
 *   `dist/` (`tsc` emits the matching neutral declarations).
 * - **`react` mode** — {@link generateHookLibrarySources} compiles the neutral
 *   hook modules to React (rewriting the neutral hook imports to `react`, whose
 *   signatures React already shares) into a build cache, which Stage 2 (the
 *   classic-`h` React JSX transform via {@link reactJsxPlugin}) bundles into
 *   `dist/react/`.
 * - **`vue` mode** — {@link generateHookLibrarySources} translates the neutral
 *   hooks into idiomatic Vue composables (values become `ref`s, effects become
 *   `onMounted`/`watch`/`onUnmounted`) into a build cache, which Stage 2 bundles
 *   into `dist/vue/`.
 *
 * Each framework build gets its **own** declarations from {@link
 * hookLibraryDtsPlugin}, a post-build step that runs `tsc` over the generated
 * tree into `dist/<framework>/` (React typed against React's hooks, Vue with
 * `Ref`-returning composables) — no shared/common declaration.
 *
 * A single `pnpm build` runs the neutral build first (which clears `dist`) then
 * the React and Vue builds (each of which only manages its own `dist/<framework>`
 * subtree).
 */
const entryModule = path.resolve(__dirname, 'src/index.ts');
const cacheRoot = path.resolve(__dirname, 'node_modules/.cache');

/** The neutral (`.`) build: the source bundled verbatim for SSR/neutral consumers. */
function defineNeutralConfig(): UserConfig {
  return defineLibraryConfig({
    rootDir: __dirname,
    name: 'MissionPlatformRxjs',
  });
}

/** The framework (`./react`, `./vue`, `./solid`, `./svelte`, `./web-components`) build. */
function defineFrameworkHookConfig(framework: JsxFramework): UserConfig {
  const cacheName = `rxjs-${framework}`;
  const generatedDirectory = path.join(cacheRoot, cacheName);
  const entry = generateHookLibrarySources({
    framework,
    entryModule,
    outDir: generatedDirectory,
  });

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

  const stagePlugins: Plugin[] =
    framework === 'react'
      ? [reactJsxPlugin()]
      : framework === 'solid'
        ? solidJsxPlugin()
        : framework === 'svelte'
          ? sveltePlugin()
          : [];

  return defineLibraryConfig({
    rootDir: __dirname,
    name: `MissionPlatformRxjs${frameworkSuffix}`,
    entry,
    preserveModules: true,
    preserveModulesRoot: path.join('node_modules/.cache', cacheName),
    external: frameworkExternals,
    overrides: {
      build: {
        outDir: `dist/${framework}`,
      },
      plugins: [
        ...stagePlugins,
        hookLibraryDtsPlugin({
          framework,
          generatedDir: generatedDirectory,
          outDir: path.resolve(__dirname, `dist/${framework}`),
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
      return defineFrameworkHookConfig(mode);
    }
    default: {
      return defineNeutralConfig();
    }
  }
});

import path from 'node:path';

import { defineLibraryConfig } from '@mission-platform/vite-config';
import { generateHookLibrarySources, hookLibraryDtsPlugin, reactJsxPlugin } from '@mission-platform/vite-plugin-jsx';
import { defineConfig, type UserConfig } from 'vite';

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

/** The React (`./react`) build: the neutral hooks compiled to a live React hook library. */
function defineReactConfig(): UserConfig {
  const cacheName = 'rxjs-react';
  const generatedDir = path.join(cacheRoot, cacheName);
  const entry = generateHookLibrarySources({
    framework: 'react',
    entryModule,
    outDir: generatedDir,
  });

  return defineLibraryConfig({
    rootDir: __dirname,
    name: 'MissionPlatformRxjsReact',
    entry,
    preserveModules: true,
    preserveModulesRoot: path.join('node_modules/.cache', cacheName),
    overrides: {
      build: {
        outDir: 'dist/react',
      },
      plugins: [
        reactJsxPlugin(),
        // Emit React's own declarations from the generated tree (post-build).
        hookLibraryDtsPlugin({ framework: 'react', generatedDir, outDir: path.resolve(__dirname, 'dist/react') }),
      ],
    },
  });
}

/** The Vue (`./vue`) build: the neutral hooks translated to a live Vue composable library. */
function defineVueConfig(): UserConfig {
  const cacheName = 'rxjs-vue';
  const generatedDir = path.join(cacheRoot, cacheName);
  const entry = generateHookLibrarySources({
    framework: 'vue',
    entryModule,
    outDir: generatedDir,
  });

  return defineLibraryConfig({
    rootDir: __dirname,
    name: 'MissionPlatformRxjsVue',
    entry,
    preserveModules: true,
    preserveModulesRoot: path.join('node_modules/.cache', cacheName),
    overrides: {
      build: {
        outDir: 'dist/vue',
      },
      plugins: [
        // Emit Vue's own declarations from the generated tree (post-build).
        hookLibraryDtsPlugin({ framework: 'vue', generatedDir, outDir: path.resolve(__dirname, 'dist/vue') }),
      ],
    },
  });
}

export default defineConfig(({ mode }): UserConfig => {
  switch (mode) {
    case 'react': {
      return defineReactConfig();
    }
    case 'vue': {
      return defineVueConfig();
    }
    default: {
      return defineNeutralConfig();
    }
  }
});

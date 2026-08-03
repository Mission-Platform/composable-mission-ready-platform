import { createRequire } from 'node:module';
import path from 'node:path';

import { defineLibraryConfig } from '@mission-platform/vite-config';
import {
  generateFrameworkSources,
  jsxComponentsCssImportPlugin,
  jsxComponentsDtsPlugin,
  reactJsxPlugin,
  solidJsxPlugin,
  sveltePlugin,
  type JsxFramework,
} from '@mission-platform/vite-plugin-forge';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

/**
 * `@mission-platform/qr-code` ships **three** distinct build artifacts from a
 * single Vite config, selected by `--mode`:
 *
 * - **default** — the dependency-free Rust/WebAssembly **encoder + decoder**
 *   (`src/index.ts`), emitted as the self-contained `dist/index.js` with the
 *   compiled wasm inlined as a base64 `data:` URI so `encodeQr` / `decodeQr`
 *   stay synchronous (SSR- and test-safe). This is the package's `.` export.
 * - **`vue` / `react`** — the write-once `BaseQrCode` **component** compiled to
 *   native Vue 3 / React by the two-stage compiler in
 *   `@mission-platform/vite-plugin-forge` (Stage 1 generates the per-framework
 *   source tree from the neutral barrel `src/component/index.ts`; Stage 2 is the
 *   framework's own toolchain). These are the package's `./vue` / `./react`
 *   exports. The component imports the encoder from the package's own `.` entry
 *   (`@mission-platform/qr-code`, kept external) and reuses `BaseButton` /
 *   `BaseTypography` from `@mission-platform/components`.
 */

const componentsModule = path.resolve(__dirname, 'src/component/index.ts');
const cacheRoot = path.resolve(__dirname, 'node_modules/.cache');

/**
 * The `vue-tsc` CLI used to emit the Vue build's declarations. It ships as a
 * dependency of `@mission-platform/forge` (a transitive dependency here), so it is
 * resolved from the jsx package directory rather than assumed hoisted.
 */
const vueTscBin = createRequire(path.join(__dirname, 'vite.config.ts')).resolve('vue-tsc/bin/vue-tsc.js', {
  paths: [path.join(__dirname, 'node_modules/@mission-platform/forge')],
});

/**
 * Strip the wasm-bindgen glue's default `init()` fallback that resolves the
 * binary via `new URL('<name>_bg.wasm', import.meta.url)`. We always drive
 * initialisation from the inlined `?url` `data:` bytes (see `src/index.ts`), so
 * that branch is dead code — and left in place Vite would inline the wasm a
 * *second* time (once for the `?url` import, once for this URL), doubling the
 * bundle. Removing the reference keeps exactly one inlined copy.
 *
 * The encoder and decoder are compiled into two separate wasm modules
 * (`generated/encode/qr-code-encode.js` and `generated/decode/qr-code-decode.js`),
 * so this runs for both.
 */
function stripWasmUrlFallback(): Plugin {
  return {
    name: 'mission-platform:qr-code-strip-wasm-url-fallback',
    enforce: 'pre',
    transform(code, id) {
      if (!/generated\/(encode|decode)\/qr-code-(encode|decode)\.js/.test(id)) {
        return null;
      }
      return code.replace(
        /\n\s*if \(module_or_path === undefined\) \{\s*module_or_path = new URL\('[^']+_bg\.wasm', import\.meta\.url\);\s*\}\n/,
        '\n',
      );
    },
  };
}

/** The self-contained encoder/decoder bundle (`dist/index.js`, the `.` export). */
function defineEncoderConfig(): UserConfig {
  return defineLibraryConfig({
    rootDir: __dirname,
    entry: {
      index: 'src/index.ts',
    },
    name: 'MissionPlatformQrCode',
    // The wasm-bindgen runtime + binary are emitted into `src/generated` by
    // `wasm-pack` (run via the `build:wasm` Turbo task). Keep each entry
    // self-contained rather than emitting a separate module graph.
    preserveModules: false,
    overrides: {
      plugins: [stripWasmUrlFallback()],
      build: {
        // Inline the compiled wasm (imported with `?url` from `src/index.ts`) as
        // a base64 `data:` URI rather than emitting a loose asset. This keeps the
        // encoder synchronous and the bundle self-contained — no runtime `fetch`,
        // so `encodeQr` works during SSR and in tests. The limit sits comfortably
        // above the ~40 KB wasm.
        assetsInlineLimit: 10 * 1024 * 1024,
      },
      assetsInclude: ['**/*.wasm'],
    },
  });
}

/** The per-framework `BaseQrCode` component build (`dist/react`, `dist/vue`, `dist/solid`, `dist/svelte`, `dist/web-components`). */
function defineFrameworkConfig(framework: JsxFramework): UserConfig {
  const cacheName = `qr-code-${framework}`;
  const generatedDir = path.join(cacheRoot, cacheName);
  const entry = generateFrameworkSources({
    framework,
    componentsModule,
    outDir: generatedDir,
  });

  const stagePlugins: Plugin[] =
    framework === 'vue'
      ? [vueJsx()]
      : framework === 'react'
        ? [reactJsxPlugin()]
        : framework === 'solid'
          ? solidJsxPlugin()
          : framework === 'svelte'
            ? sveltePlugin()
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
    rootDir: __dirname,
    name: `MissionPlatformQrCode${frameworkSuffix}`,
    entry,
    // Each component keeps its own JS chunk + CSS asset for tree shaking.
    preserveModules: true,
    preserveModulesRoot: path.join('node_modules/.cache', cacheName),
    // The encoder is consumed through the package's own `.` entry, kept external
    // so the shipped component references it rather than re-inlining the wasm.
    external: [...frameworkExternals, '@mission-platform/qr-code'],
    overrides: {
      build: {
        // Per-framework subtree, so the identically-named chunks never collide.
        outDir: `dist/${framework}`,
        // Emit one CSS asset per component module rather than one combined file.
        cssCodeSplit: true,
      },
      plugins: [
        ...stagePlugins,
        // Re-attach each component's extracted CSS to its JS chunk (Vite lib mode
        // emits the CSS asset but does not import it), so per-component styles load.
        jsxComponentsCssImportPlugin(),
        // Emit each framework's own genuine declarations from its generated tree
        // (React via the TS compiler API, Vue via `vue-tsc`).
        jsxComponentsDtsPlugin({
          framework,
          generatedDir,
          outDir: path.resolve(__dirname, `dist/${framework}`),
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
      return defineEncoderConfig();
    }
  }
});

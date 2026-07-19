import { createRequire } from 'node:module';
import path from 'node:path';

import { defineLibraryConfig } from '@mission-platform/vite-config';
import {
  generateFrameworkSources,
  jsxComponentsCssImportPlugin,
  jsxComponentsDtsPlugin,
  reactJsxPlugin,
} from '@mission-platform/vite-plugin-jsx';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

/**
 * `@mission-platform/barcode` ships **three** distinct build artifacts from a
 * single Vite config, selected by `--mode`:
 *
 * - **default** — the dependency-free Rust/WebAssembly **encoder + decoder**
 *   (`src/index.ts`), emitted as the self-contained `dist/index.js` with the
 *   compiled wasm inlined as a base64 `data:` URI so `encodeBarcode` stays
 *   synchronous (SSR- and test-safe). This is the package's `.` export.
 * - **`vue` / `react`** — the write-once `BaseBarcode` **component** compiled to
 *   native Vue 3 / React by the two-stage compiler in
 *   `@mission-platform/vite-plugin-jsx` (Stage 1 generates the per-framework
 *   source tree from the neutral barrel `src/component/index.ts`; Stage 2 is the
 *   framework's own toolchain). These are the package's `./vue` / `./react`
 *   exports. The component imports the encoder from the package's own `.` entry
 *   (`@mission-platform/barcode`, kept external) and reuses `BaseButton` /
 *   `BaseTypography` from `@mission-platform/components`.
 */

const componentsModule = path.resolve(__dirname, 'src/component/index.ts');
const cacheRoot = path.resolve(__dirname, 'node_modules/.cache');

/**
 * The `vue-tsc` CLI used to emit the Vue build's declarations. It ships as a
 * dependency of `@mission-platform/jsx` (a transitive dependency here), so it is
 * resolved from the jsx package directory rather than assumed hoisted.
 */
const vueTscBin = createRequire(path.join(__dirname, 'vite.config.ts')).resolve('vue-tsc/bin/vue-tsc.js', {
  paths: [path.join(__dirname, 'node_modules/@mission-platform/jsx')],
});

/**
 * Neutralise the wasm-bindgen glue's default `init()` fallback that resolves the
 * binary via `new URL('<name>_bg.wasm', import.meta.url)`. We always drive
 * initialisation from the inlined `?url` `data:` bytes (see `src/encoder` and
 * `src/decoder`), so that branch is dead code — and left in place the bundler
 * would emit a second reference to the binary. Replacing it with `undefined`
 * removes the loose asset reference while keeping the (unreachable) fallback
 * harmless.
 *
 * The encoder and decoder are compiled into two separate wasm modules
 * (`generated/encode/barcode-encode.js` and `generated/decode/barcode-decode.js`),
 * so this runs for both.
 */
function stripWasmUrlFallback(): Plugin {
  return {
    name: 'mission-platform:barcode-strip-wasm-url-fallback',
    enforce: 'pre',
    transform(code, id) {
      if (!/generated\/(encode|decode)\/barcode-(encode|decode)\.js/.test(id)) {
        return null;
      }
      return code.replace(/new URL\('[^']+_bg\.wasm', import\.meta\.url\)/, 'undefined');
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
    name: 'MissionPlatformBarcode',
    // The wasm-bindgen runtime + binary are emitted into `src/generated` by
    // `wasm-pack` (run via the `build:wasm` Turbo task). Keep each entry
    // self-contained rather than emitting a separate module graph.
    preserveModules: false,
    overrides: {
      plugins: [stripWasmUrlFallback()],
      build: {
        // Inline the compiled `barcode_bg.wasm` (imported with `?url` from
        // `src/encoder`) as a base64 `data:` URI rather than emitting a loose
        // asset. This keeps the encoder synchronous and the bundle self-contained
        // — no runtime `fetch`, so `encodeBarcode` works during SSR and in tests.
        assetsInlineLimit: 10 * 1024 * 1024,
      },
      assetsInclude: ['**/*.wasm'],
    },
  });
}

/** The per-framework `BaseBarcode` component build (`dist/react` / `dist/vue`). */
function defineFrameworkConfig(framework: 'react' | 'vue'): UserConfig {
  const cacheName = `barcode-${framework}`;
  const generatedDir = path.join(cacheRoot, cacheName);
  const entry = generateFrameworkSources({
    framework,
    componentsModule,
    outDir: generatedDir,
  });

  const stagePlugins: Plugin[] = framework === 'react' ? [reactJsxPlugin()] : [vueJsx()];

  return defineLibraryConfig({
    rootDir: __dirname,
    name: framework === 'react' ? 'MissionPlatformBarcodeReact' : 'MissionPlatformBarcodeVue',
    entry,
    // Each component keeps its own JS chunk + CSS asset for tree shaking.
    preserveModules: true,
    preserveModulesRoot: path.join('node_modules/.cache', cacheName),
    // The encoder is consumed through the package's own `.` entry, kept external
    // so the shipped component references it rather than re-inlining the wasm.
    external: [...(framework === 'react' ? ['react', 'react-dom'] : ['vue']), '@mission-platform/barcode'],
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
        }),
      ],
    },
  });
}

export default defineConfig(({ mode }): UserConfig => {
  switch (mode) {
    case 'react': {
      return defineFrameworkConfig('react');
    }
    case 'vue': {
      return defineFrameworkConfig('vue');
    }
    default: {
      return defineEncoderConfig();
    }
  }
});

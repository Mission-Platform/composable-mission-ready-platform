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
 * `@mission-platform/code-scanner` ships **three** distinct build artifacts from
 * a single Vite config, selected by `--mode`:
 *
 * - **default** — the dependency-free Rust/WebAssembly **scanner** façade
 *   (`src/index.ts`), emitted as `dist/index.js` with the compiled wasm inlined
 *   as a base64 `data:` URI so `scanImageData` stays synchronous (SSR- and
 *   test-safe). The sibling decoder packages (`@mission-platform/qr-code`,
 *   `-/matrix-code`, `-/barcode`) are kept external — each ships its own inlined
 *   wasm. This is the package's `.` export.
 * - **`vue` / `react`** — the write-once `BaseCodeScanner` **component** compiled
 *   to native Vue 3 / React by the two-stage compiler in
 *   `@mission-platform/vite-plugin-jsx`. These are the package's `./vue` /
 *   `./react` exports. The component consumes the scanner through the package's
 *   own `.` entry (`@mission-platform/code-scanner`, kept external) and reuses
 *   `BaseButton` / `BaseTypography` from `@mission-platform/components`.
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
 * Strip the wasm-bindgen glue's default `init()` fallback that resolves the
 * binary via `new URL('<name>_bg.wasm', import.meta.url)`. We always drive
 * initialisation from the inlined `?url` `data:` bytes (see `src/scanner`), so
 * that branch is dead code — and left in place Vite would inline the wasm a
 * *second* time (once for the `?url` import, once for this URL), doubling the
 * bundle. Removing the reference keeps exactly one inlined copy.
 */
function stripWasmUrlFallback(): Plugin {
  return {
    name: 'mission-platform:code-scan-strip-wasm-url-fallback',
    enforce: 'pre',
    transform(code, id) {
      if (!/generated\/scan\/code-scan\.js/.test(id)) {
        return null;
      }
      return code.replace(
        /\n\s*if \(module_or_path === undefined\) \{\s*module_or_path = new URL\('[^']+_bg\.wasm', import\.meta\.url\);\s*\}\n/,
        '\n',
      );
    },
  };
}

/** The self-contained scanner bundle (`dist/index.js`, the `.` export). */
function defineScannerConfig(): UserConfig {
  return defineLibraryConfig({
    rootDir: __dirname,
    entry: {
      index: 'src/index.ts',
    },
    name: 'MissionPlatformCodeScanner',
    // The wasm-bindgen runtime + binary are emitted into `src/generated` by
    // `wasm-pack` (run via the `build:wasm` Turbo task). Keep the entry
    // self-contained rather than emitting a separate module graph.
    preserveModules: false,
    // The decoders are consumed through their own packages (each ships its own
    // inlined wasm), so keep them external rather than re-inlining three binaries.
    external: ['@mission-platform/qr-code', '@mission-platform/matrix-code', '@mission-platform/barcode'],
    overrides: {
      plugins: [stripWasmUrlFallback()],
      build: {
        // Inline the compiled wasm (imported with `?url` from `src/scanner`) as a
        // base64 `data:` URI rather than emitting a loose asset. This keeps the
        // scanner synchronous and the bundle self-contained — no runtime `fetch`,
        // so `scanImageData` works during SSR and in tests. The limit sits
        // comfortably above the ~55 KB wasm.
        assetsInlineLimit: 10 * 1024 * 1024,
      },
      assetsInclude: ['**/*.wasm'],
    },
  });
}

/** The per-framework `BaseCodeScanner` component build (`dist/react` / `dist/vue`). */
function defineFrameworkConfig(framework: 'react' | 'vue'): UserConfig {
  const cacheName = `code-scanner-${framework}`;
  const generatedDir = path.join(cacheRoot, cacheName);
  const entry = generateFrameworkSources({
    framework,
    componentsModule,
    outDir: generatedDir,
  });

  const stagePlugins: Plugin[] = framework === 'react' ? [reactJsxPlugin()] : [vueJsx()];

  return defineLibraryConfig({
    rootDir: __dirname,
    name: framework === 'react' ? 'MissionPlatformCodeScannerReact' : 'MissionPlatformCodeScannerVue',
    entry,
    // Each component keeps its own JS chunk + CSS asset for tree shaking.
    preserveModules: true,
    preserveModulesRoot: path.join('node_modules/.cache', cacheName),
    // The scanner façade is consumed through the package's own `.` entry, kept
    // external so the shipped component references it rather than re-inlining the
    // wasm.
    external: [...(framework === 'react' ? ['react', 'react-dom'] : ['vue']), '@mission-platform/code-scanner'],
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
      return defineScannerConfig();
    }
  }
});

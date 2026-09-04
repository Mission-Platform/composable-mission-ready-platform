import { createRequire } from 'node:module';
import path from 'node:path';

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
import forgeWebScriptPlugin from '@mission-platform/vite-plugin-forge-web-script';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

/** FWS roots used to compile the self-contained scanner graph. */
const componentsModule = path.resolve(__dirname, 'src/components/index.ts');
const cacheRoot = path.resolve(__dirname, 'node_modules/.cache');
const scannerProjectRoots = [
  path.resolve(__dirname, 'src/fws'),
  path.resolve(__dirname, '../qr-code/src/fws'),
  path.resolve(__dirname, '../matrix-code/src/fws'),
  path.resolve(__dirname, '../barcode/src/fws'),
];

/** Resolve the Vue declaration compiler from the Forge dependency tree. */
const vueTscBin = createRequire(path.join(__dirname, 'vite.config.ts')).resolve('vue-tsc/bin/vue-tsc.js', {
  paths: [path.join(__dirname, 'node_modules/@mission-platform/forge-jsx')],
});

function scannerForgePlugin(linkProfile: 'static' | 'dynamic'): Plugin {
  return forgeWebScriptPlugin({
    root: __dirname,
    projectRoots: scannerProjectRoots,
    crossProjectLinkMode: linkProfile,
    defaultLinkMode: 'static',
    linkProfile,
    optimization: linkProfile === 'static' ? 'release' : 'debug',
    targetFeatures: { simd: true },
    requireExports: false,
    requestedCapabilities: (fileName) => (fileName.endsWith('/qr-decoder.fws') ? ['qr.decode.utf8'] : undefined),
  });
}

/** The neutral self-contained scanner bundle (`dist/index.js`, the `.` export). */
function defineScannerConfig(linkProfile: 'static' | 'dynamic' = 'static'): UserConfig {
  return defineLibraryConfig({
    rootDir: __dirname,
    entry: { index: 'src/index.ts' },
    name: 'MissionPlatformCodeScanner',
    // Static FWS links flatten the scanner and decoder graph into one artifact.
    preserveModules: false,
    overrides: {
      plugins: [scannerForgePlugin(linkProfile)],
      build: linkProfile === 'dynamic' ? { outDir: 'dist/dynamic' } : undefined,
    },
  });
}

/** The per-framework `ForgeCodeScanner` component build (`dist/react`, `dist/vue`, `dist/solid`, `dist/svelte`, `dist/web-components`). */
function defineFrameworkConfig(framework: JsxFramework): UserConfig {
  const cacheName = `code-scanner-${framework}`;
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
    name: `MissionPlatformCodeScanner${frameworkSuffix}`,
    entry,
    // Each component keeps its own JS chunk + CSS asset for tree shaking.
    preserveModules: true,
    preserveModulesRoot: path.join('node_modules/.cache', cacheName),
    // The scanner façade is consumed through the package's own `.` entry, kept
    // external so the shipped component references it rather than re-inlining the
    // wasm.
    external: [...frameworkExternals, '@mission-platform/code-scanner'],
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
    case 'dynamic': {
      return defineScannerConfig('dynamic');
    }
    case 'react':
    case 'vue':
    case 'solid':
    case 'svelte':
    case 'web-components': {
      return defineFrameworkConfig(mode);
    }
    default: {
      return defineScannerConfig();
    }
  }
});

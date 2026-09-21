import path from 'node:path';

import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineLibraryConfig } from '@mission-platform/vite-config';
import flintPlugin from '@mission-platform/vite-plugin-flint';
import { defineJsxLibraryConfig, type JsxFramework } from '@mission-platform/vite-plugin-forge';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

/** Flint roots used to compile the self-contained scanner graph. */
const componentsModule = path.resolve(import.meta.dirname, 'src/components/index.ts');
const scannerProjectRoots = [path.resolve(import.meta.dirname, 'src/fws')];

function scannerForgePlugin(linkProfile: 'static' | 'dynamic'): Plugin {
  return flintPlugin({
    root: import.meta.dirname,
    projectRoots: scannerProjectRoots,
    crossProjectLinkMode: linkProfile,
    defaultLinkMode: 'static',
    linkProfile,
    optimization: linkProfile === 'static' ? 'release' : 'debug',
    targetFeatures: { simd: true },
    requireExports: false,
    requestedCapabilities: (fileName) =>
      fileName.endsWith('/qr-decoder.flint') || fileName.endsWith('/qr-decoder.fws') ? ['qr.decode.utf8'] : undefined,
  });
}

/** The neutral self-contained scanner bundle (`dist/index.js`, the `.` export). */
function defineScannerConfig(linkProfile: 'static' | 'dynamic' = 'static'): UserConfig {
  return defineLibraryConfig({
    rootDir: import.meta.dirname,
    entry: { index: 'src/index.ts' },
    name: 'MissionPlatformCodeScanner',
    // Static Flint links flatten the scanner and decoder graph into one artifact.
    preserveModules: false,
    overrides: {
      plugins: [scannerForgePlugin(linkProfile)],
      build: linkProfile === 'dynamic' ? { outDir: 'dist/dynamic' } : undefined,
    },
  });
}

/** The per-framework `ForgeCodeScanner` component build (`dist/react`, `dist/vue`, `dist/solid`, `dist/svelte`, `dist/web-components`). */
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
    name: 'MissionPlatformCodeScanner',
    componentsModule,
    // The scanner façade is consumed through the package's own `.` entry, kept
    // external so the shipped component references it rather than re-inlining the
    // wasm.
    external: [...frameworkExternals, '@mission-platform/code-scanner'],
    overrides: {
      build: {
        cssCodeSplit: true,
      },
      plugins: [scannerForgePlugin(linkProfileForFramework(framework))],
    },
  });
}

function linkProfileForFramework(framework: JsxFramework): 'static' | 'dynamic' {
  return framework === 'web-components' ? 'dynamic' : 'static';
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

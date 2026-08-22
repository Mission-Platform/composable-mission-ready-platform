import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';

const appRoot = path.resolve(import.meta.dirname);
const distributionDirectory = path.resolve(appRoot, 'dist');

function inlineUiAssets(): Plugin {
  return {
    name: 'forge-inline-ui-assets',
    writeBundle() {
      const htmlPath = path.resolve(distributionDirectory, 'index.html');
      if (!existsSync(htmlPath)) return;

      const readAsset = (source: string): string | undefined => {
        const relativePath = source.startsWith('/') ? source.slice(1) : source.replaceAll(/^\.\//g, '');
        const assetPath = path.resolve(distributionDirectory, relativePath);
        if (!assetPath.startsWith(`${distributionDirectory}${path.sep}`) || !existsSync(assetPath)) return undefined;
        return readFileSync(assetPath, 'utf8');
      };

      let html = readFileSync(htmlPath, 'utf8');
      html = html.replaceAll(
        /<script([^>]+)src=["']([^"']+)["']([^>]*)><\/script>/g,
        (_match, before, source, after) => {
          const content = readAsset(source);
          return content === undefined ? _match : `<script${before}${after}>${content}</script>`;
        },
      );
      html = html.replaceAll(
        /<link([^>]+)href=["']([^"']+\.css)["']([^>]*)\/?>(?:<\/link>)?/g,
        (_match, before, source, after) => {
          const content = readAsset(source);
          return content === undefined
            ? _match
            : `<style${before.replaceAll(/\srel=["']stylesheet["']/g, '')}${after}>${content}</style>`;
        },
      );

      writeFileSync(path.resolve(distributionDirectory, 'ui.html'), html, 'utf8');
    },
  };
}

export default defineConfig(({ mode }) => {
  if (mode === 'main') {
    const uiHtmlPath = path.resolve(distributionDirectory, 'ui.html');
    if (!existsSync(uiHtmlPath)) throw new Error('The UI must be built before the main-thread bundle.');

    return {
      root: appRoot,
      define: {
        'globalThis.__html__': JSON.stringify(readFileSync(uiHtmlPath, 'utf8')),
      },
      build: {
        outDir: distributionDirectory,
        emptyOutDir: false,
        lib: {
          entry: path.resolve(appRoot, 'src/code.ts'),
          formats: ['iife'],
          name: 'ForgeFigmaPlugin',
          fileName: () => 'code.js',
        },
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
          },
        },
      },
    };
  }

  return {
    root: path.resolve(appRoot, 'src/ui'),
    plugins: [vue(), inlineUiAssets()],
    build: {
      outDir: distributionDirectory,
      emptyOutDir: true,
    },
  };
});

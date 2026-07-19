/// <reference types="vitest/config" />
import { defineAppConfig } from '@mission-platform/vite-config';
import { seoPlugin } from '@mission-platform/vite-plugin-seo';
import { type Plugin, type UserConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { APP_LOCALE_BCP47, APP_ORIGIN } from './src/seo-app';

// Stub `monaco-editor` itself (incl. its deep `esm/...` entries and `?worker`
// imports) — the sole source of the browser-only `.css` side-effect imports
// that break Node's ESM loader. The harper/hunspell packages only *re-export
// composables* and load `monaco-editor` lazily (dynamic `import()`), so they no
// longer drag Monaco into the SSR static graph and are intentionally left real
// so their named exports (e.g. `useHarperMonaco`, `useHunspellMonaco`) still
// resolve during the SSR build's static analysis.
function shouldStubForSsr(id: string): boolean {
  const base = id.split('?')[0] ?? id;
  return base === 'monaco-editor' || base.startsWith('monaco-editor/');
}

/**
 * During the `vite-ssg` *server* build (and the JSDOM prerender that follows),
 * Vite runs the app through Node. `monaco-editor` pulls in browser-only ESM
 * with `.css` side-effect imports that Node's ESM loader cannot link, crashing
 * the prerender. It can reach the SSR graph directly (the editor component) and,
 * defensively, via any transitive `monaco-editor` reference.
 *
 * The editor is rendered client-only (see `<ClientOnly>` + the async
 * `MonacoEditor`/`SnippetEditorModal`), so Monaco is never needed to produce
 * the prerendered HTML. This plugin replaces `monaco-editor` (and its deep
 * entries / `?worker` imports) with an inert stub in the SSR environment only,
 * leaving the client build (the real, shipped bundle) completely untouched.
 *
 * The exported named members below mirror Monaco's public API surface so any
 * top-level access (`monaco.editor`, `monaco.Range`, `monaco.MarkerSeverity`,
 * …) resolves to a harmless no-op when a chunk that references them is linked
 * under SSR.
 */
function ssrStubBrowserOnlyEditorPlugin(): Plugin {
  const STUB_ID = '\0mp-ssr-editor-stub';

  return {
    name: 'mp-ssr-stub-browser-only-editor',
    enforce: 'pre',
    resolveId(id, _importer, options) {
      if (options?.ssr && shouldStubForSsr(id)) return STUB_ID;
      return;
    },
    load(id) {
      if (id === STUB_ID) {
        // A self-returning Proxy that is callable / `new`-able, so any access
        // shape resolves to a harmless no-op during SSR. Anything importing
        // `monaco-editor` may touch `monaco.MarkerSeverity.Error`, `monaco.editor`,
        // `monaco.Range`, `monaco.languages`, etc., so those have to exist as named
        // exports on the stub namespace or the chunk throws when it is linked.
        return [
          'const handler = { get: () => stub, apply: () => stub, construct: () => ({}) };',
          'const stub = new Proxy(function stub() {}, handler);',
          'export default stub;',
          'export const editor = stub;',
          'export const languages = stub;',
          'export const Uri = stub;',
          'export const Range = stub;',
          'export const Position = stub;',
          'export const Selection = stub;',
          'export const KeyMod = stub;',
          'export const KeyCode = stub;',
          'export const MarkerSeverity = stub;',
          'export const MarkerTag = stub;',
          'export const Token = stub;',
        ].join('\n');
      }
      return;
    },
  };
}

const ROOT_URL = APP_ORIGIN.endsWith('/') ? APP_ORIGIN : `${APP_ORIGIN}/`;
const SITEMAP_URL = `${ROOT_URL}sitemap.xml`;

// `vite-ssg` reads `ssgOptions` off the resolved Vite config but does not ship
// a module augmentation for Vite's own `UserConfig` type, so we cast the final
// config through an intersection that includes the extra property.
interface BeastiesOptions {
  preload?: 'body' | 'media' | 'swap' | 'swap-high' | 'js' | 'js-lazy';
  pruneSource?: boolean;
  inlineFonts?: boolean;
  preloadFonts?: boolean;
  logLevel?: 'info' | 'warn' | 'error' | 'silent' | 'debug' | 'trace';
  [key: string]: unknown;
}

interface SsgUserConfig extends UserConfig {
  ssgOptions?: {
    includedRoutes?: () => string[] | Promise<string[]>;
    formatting?: 'minify' | 'prettify' | 'none';
    dirStyle?: 'flat' | 'nested';
    beastiesOptions?: BeastiesOptions | false;
  };
}

const config = defineAppConfig({
  overrides: {
    plugins: [
      // SSR-only: keep Monaco / harper / hunspell out of the prerender pass.
      ssrStubBrowserOnlyEditorPlugin(),
      // Single-route SPA: advertise the root URL with its locale alternate.
      seoPlugin({
        sitemap: {
          urls: [
            {
              loc: ROOT_URL,
              changefreq: 'weekly',
              priority: 1,
              alternates: [
                { hreflang: APP_LOCALE_BCP47, href: ROOT_URL },
                { hreflang: 'x-default', href: ROOT_URL },
              ],
            },
          ],
        },
        robots: {
          comments: ['My Care Notes', `Generated by @mission-platform/seo at ${new Date().toISOString()}`],
          groups: [{ userAgent: '*', allow: ['/'] }],
          sitemaps: [SITEMAP_URL],
          host: new URL(ROOT_URL).host,
        },
      }),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 64 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /\.wasm$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'wasm-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
        manifest: {
          name: 'My Care Notes',
          short_name: 'Care Notes',
          description: 'A clinical notes editor that works offline',
          theme_color: '#4a9ebe',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    build: {
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('monaco-editor')) {
              return 'monaco-editor';
            }
          },
        },
      },
    },
    worker: {
      format: 'es',
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.ts'],
    },
  },
});

// `vite-ssg build` prerenders the app's single `/` route to static HTML and
// hydrates it on the client. The extra `ssgOptions` key is read by `vite-ssg`
// at build time and is not part of Vite's own `UserConfig`.
const ssgConfig: SsgUserConfig = {
  ...config,
  ssgOptions: {
    // Single-route SPA — only the root needs prerendering.
    includedRoutes: () => ['/'],
    // Minify the generated HTML file.
    formatting: 'minify',
    // Inline critical CSS into the prerendered HTML and lazy-load the rest via
    // `beasties` (the maintained fork of `critters`). `vite-ssg` auto-detects
    // `beasties` from the workspace and runs it during the SSG pass; we pass
    // explicit options so the behaviour is pinned in config.
    beastiesOptions: {
      // Lazy-load the non-critical stylesheet via a media-swap `<link>`.
      preload: 'swap-high',
      // Keep the original full stylesheets so client-side hydration can apply
      // any styles that were not critical for the prerendered HTML.
      pruneSource: false,
      inlineFonts: false,
      preloadFonts: false,
      // Only surface real problems during the build log.
      logLevel: 'warn',
    },
  },
};

export default ssgConfig as UserConfig;

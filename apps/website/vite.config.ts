/// <reference types="vitest/config" />
import path from 'node:path';

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import postcssConfig from '@mission-platform/postcss-config';
import vue from '@vitejs/plugin-vue';
import { defineConfig, type UserConfig } from 'vite';

// `vite-ssg` reads `ssgOptions` off the resolved Vite config but does not
// ship a module augmentation for Vite's own `UserConfig` type, so we cast
// our config through an intersection that includes the extra property.
interface SsgUserConfig extends UserConfig {
  ssgOptions?: {
    includedRoutes?: () => string[] | Promise<string[]>;
    formatting?: 'minify' | 'prettify' | 'none';
    dirStyle?: 'flat' | 'nested';
  };
}

// We don't use `defineAppConfig` here because we need to customise the
// `VueI18nPlugin` `include` option so that the lazy-loaded standalone YAML
// bundles under `src/locales/` are compiled to locale-message modules.
// Merging would produce duplicate Vue / i18n plugin instances and break the
// SFC pipeline.
const config: SsgUserConfig = {
  css: {
    postcss: postcssConfig,
  },
  plugins: [
    vue(),
    VueI18nPlugin({
      include: [path.resolve(__dirname, 'src/locales/**/*.yaml')],
    }),
  ],
  // `vite-ssg` reads this property at build time. It is not part of Vite's
  // own `UserConfig`, so we extend the type locally via `SsgUserConfig`.
  ssgOptions: {
    // Default locale at `/`, plus one prerendered route per prefixed locale.
    // Keep this in sync with `SUPPORTED_LOCALES` / `PREFIXED_LOCALES` in
    // `src/router/index.ts`.
    includedRoutes: () => ['/', '/es', '/fr', '/nl'],
    // Emit `dist/es/index.html` (rather than `dist/es.html`) so prefixed
    // locales work cleanly behind a static file server / SPA worker.
    dirStyle: 'nested',
    // Minify each generated HTML file.
    formatting: 'minify',
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
};

export default defineConfig(config as UserConfig);

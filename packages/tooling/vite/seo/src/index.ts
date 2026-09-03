/**
 * `@mission-platform/vite-plugin-seo`
 *
 * A Vite plugin that generates a site's crawler-facing companion files —
 * `robots.txt` and `sitemap.xml` — from the deterministic builders in
 * `@mission-platform/seo`, so generation runs as part of `vite build` (and the
 * dev server) instead of a separate pre-build Node script.
 *
 * The files are written into the resolved Vite `publicDir` so they are served
 * verbatim by the dev server and copied into the build output (`outDir`)
 * alongside the rest of the static assets.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { buildRobotsTxt } from '@mission-platform/seo/robots';
import { buildSitemapXml } from '@mission-platform/seo/sitemap';

import type { RobotsTxtInput } from '@mission-platform/seo/robots';
import type { SitemapXmlInput } from '@mission-platform/seo/sitemap';
import type { Plugin } from 'vite';

/** Options for {@link seoPlugin}. */
export interface SeoPluginOptions {
  /** Sitemap description passed to {@link buildSitemapXml}. */
  sitemap: SitemapXmlInput;
  /**
   * Optional `robots.txt` policy passed to {@link buildRobotsTxt}. When
   * omitted, a permissive default (`User-agent: *` with no restrictions) is
   * emitted so the file is still valid.
   */
  robots?: RobotsTxtInput;
  /**
   * Directory the files are written to. Defaults to the resolved Vite
   * `publicDir` so the files are served in dev and copied into the build
   * output.
   */
  outDir?: string;
}

export type { RobotsTxtInput } from '@mission-platform/seo/robots';
export type { SitemapXmlInput } from '@mission-platform/seo/sitemap';

/**
 * Create a Vite plugin that writes `robots.txt` and `sitemap.xml` into the
 * project's `publicDir` (or {@link SeoPluginOptions.outDir}) at the start of
 * every build and dev-server run.
 *
 * @example
 * ```ts
 * import { seoPlugin } from '@mission-platform/vite-plugin-seo';
 *
 * export default defineConfig({
 *   plugins: [
 *     seoPlugin({
 *       sitemap: { urls: [{ loc: 'https://example.com/' }] },
 *       robots: { groups: [{ userAgent: '*', allow: ['/'] }] },
 *     }),
 *   ],
 * });
 * ```
 */
export function seoPlugin(options: SeoPluginOptions): Plugin {
  let resolvedOutputDirectory = '';

  return {
    name: '@mission-platform/vite-plugin-seo',
    configResolved(config) {
      resolvedOutputDirectory =
        options.outDir ??
        (typeof config.publicDir === 'string' && config.publicDir.length > 0
          ? config.publicDir
          : path.resolve(config.root, 'public'));
    },
    buildStart() {
      const sitemap = buildSitemapXml(options.sitemap);
      const robots = buildRobotsTxt(options.robots ?? {});

      mkdirSync(resolvedOutputDirectory, { recursive: true });
      writeFileSync(path.resolve(resolvedOutputDirectory, 'sitemap.xml'), sitemap, 'utf8');
      writeFileSync(path.resolve(resolvedOutputDirectory, 'robots.txt'), robots, 'utf8');

      this.info(`wrote ${resolvedOutputDirectory}/robots.txt and sitemap.xml (${options.sitemap.urls.length} URLs)`);
    },
  };
}

export default seoPlugin;

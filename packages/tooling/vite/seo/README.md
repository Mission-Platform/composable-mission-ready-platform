# @mission-platform/vite-plugin-seo

A Vite plugin that generates a site's crawler-facing companion files — `robots.txt` and `sitemap.xml` — at build time
(and on dev-server start), using the deterministic builders in [@mission-platform/seo](../../packages/seo).

It replaces the per-app `scripts/generate-seo-files.ts` + `prebuild` Node scripts, so generation runs as part of
`vite build` instead of a separate step.

The files are written into the resolved Vite `publicDir` so they are served verbatim by the dev server and copied into
the build output (`outDir`) alongside the rest of the static assets.

## Installation

Add the plugin as a dev dependency in your app's package.json:

```jsonc
// apps/<app>/package.json
{
  "devDependencies": {
    "@mission-platform/vite-plugin-seo": "workspace:*",
  },
}
```

`vite` is an optional peer dependency (already present in every app/package).

## Basic Setup

Add the SEO plugin to your Vite configuration:

```ts
// vite.config.ts
import { seoPlugin } from '@mission-platform/vite-plugin-seo';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    seoPlugin({
      sitemap: { urls: [{ loc: 'https://example.com/' }] },
    }),
  ],
});
```

## Advanced Configuration

Customize the robots.txt policy with user-agent groups, crawl delays, and additional directives:

```ts
// vite.config.ts
import { seoPlugin } from '@mission-platform/vite-plugin-seo';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    seoPlugin({
      sitemap: {
        urls: [{ loc: 'https://example.com/', changefreq: 'weekly', priority: 1 }],
      },
      robots: {
        groups: [
          { userAgent: '*', allow: ['/'] },
          { userAgent: 'Googlebot', disallow: ['/admin/'], crawlDelay: 2 },
        ],
        sitemaps: ['https://example.com/sitemap.xml'],
        host: 'https://example.com',
      },
    }),
  ],
});
```

## Options

### `seoPlugin(options): Plugin`

- `options.sitemap: SitemapXmlInput` — **required**. Passed to `buildSitemapXml` from `@mission-platform/seo`.
  - `urls`: Array of URL objects with properties like `loc`, `changefreq`, `priority`, `lang`
  - Optional: `lastmod`, `changefreq`, `priority`, `lang`, `lastmod`

- `options.robots?: RobotsTxtInput` — **optional**. Passed to `buildRobotsTxt`.
  - When omitted, a permissive default (`User-agent: *`) is emitted
  - Configure groups with user agents, disallow/allow rules, crawl delays, etc.
  - Add sitemaps and host directives

- `options.outDir?: string` — **optional**. Defaults to the resolved Vite `publicDir`.
  - Specify a custom output directory if needed
  - Must be within the project root

## Examples

### Simple Blog Example

```ts
import { seoPlugin } from '@mission-platform/vite-plugin-seo';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    seoPlugin({
      sitemap: {
        urls: [{ loc: 'https://my-blog.com/', changefreq: 'daily', priority: 1 }],
      },
    }),
  ],
});
```

### E-commerce Site Example

```ts
import { seoPlugin } from '@mission-platform/vite-plugin-seo';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    seoPlugin({
      sitemap: {
        urls: [
          { loc: 'https://shop.example.com/', changefreq: 'weekly', priority: 1 },
          { loc: 'https://shop.example.com/products/laptop', changefreq: 'weekly', priority: 0.9 },
        ],
      },
      robots: {
        groups: [
          { userAgent: '*', allow: [''] },
          { userAgent: 'Googlebot', disallow: ['/admin/'], crawlDelay: 2 },
        ],
        sitemaps: ['https://shop.example.com/sitemap.xml'],
        host: 'https://shop.example.com',
      },
    }),
  ],
});
```

### Multilingual Site Example

```ts
import { seoPlugin } from '@mission-platform/vite-plugin-seo';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    seoPlugin({
      sitemap: {
        urls: [
          { loc: 'https://example.com/en/', lang: 'en', changefreq: 'daily', priority: 1 },
          { loc: 'https://example.com/fr/', lang: 'fr', changefreq: 'daily', priority: 0.9 },
        ],
      },
      robots: {
        groups: [{ userAgent: '*', allow: ['/', '/en/', '/fr/'] }],
        sitemaps: ['https://example.com/sitemap-en.xml', 'https://example.com/sitemap-fr.xml'],
        host: 'https://example.com',
      },
    }),
  ],
});
```

## Troubleshooting

### robots.txt Not Updating in Development

The plugin writes files during the `buildStart` hook, which runs on both build and dev server start. If you're not
seeing updates:

1. Check that your Vite config is correctly set up
2. Verify the output directory is correct
3. Clear any cached builds with `rm -rf dist/public`

### Sitemap XML Validation Errors

If your sitemap fails validation:

1. Ensure all URLs are absolute
2. Check that priority values are between 0.0 and 1.0
3. Verify changefreq values are valid (daily, weekly, monthly, etc.)

## See Also

- [API Reference](../../docs/api-reference.md#mission-platformseo)
- [@mission-platform/seo](../../packages/seo) - The underlying SEO generation library
- [Documentation Best Practices](../../docs/best-practices.md#testing-and-documentation)

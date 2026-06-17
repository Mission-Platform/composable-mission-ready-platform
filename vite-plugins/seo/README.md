# @mission-platform/vite-plugin-seo

Vite plugin that generates `robots.txt` and `sitemap.xml` at build time (and on
dev-server start) from the deterministic builders in
[`@mission-platform/seo`](../../packages/seo).

It replaces the per-app `scripts/generate-seo-files.ts` + `prebuild` Node
scripts, so the crawler-facing companion files are produced as part of
`vite build` / `vite-ssg build`.

## Usage

```ts
// vite.config.ts
import { seoPlugin } from '@mission-platform/vite-plugin-seo';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    seoPlugin({
      sitemap: { urls: [{ loc: 'https://example.com/' }] },
      robots: {
        groups: [{ userAgent: '*', allow: ['/'] }],
        sitemaps: ['https://example.com/sitemap.xml'],
      },
    }),
  ],
});
```

See [`llms.txt`](./llms.txt) for the full API.

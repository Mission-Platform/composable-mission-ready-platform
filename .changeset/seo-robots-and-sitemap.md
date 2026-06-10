---
'@mission-platform/seo': minor
---

feat(seo): add `buildRobotsTxt`, `buildSitemapXml`, and `buildSitemapIndex` generators

The package now ships deterministic, SSR/SSG-safe builders for the two
crawler-facing companion files every public site is expected to ship:

- `buildRobotsTxt` — serialises a `robots.txt` policy (per-user-agent
  `Disallow` / `Allow` / `Crawl-delay` groups, `Host`, leading comments, and
  one or more `Sitemap:` discovery hints).
- `buildSitemapXml` — serialises a `sitemap.xml` URL set, including
  `<lastmod>`, `<changefreq>`, `<priority>` (clamped to `0.0`–`1.0`), and
  per-URL hreflang alternates via the Google `xhtml:link` extension.
- `buildSitemapIndex` — serialises a sitemap index for large sites that need
  to split URLs across multiple sub-sitemaps.

All three builders return XML/text strings, so they can be either written to
disk at build time (e.g. `apps/website/public/sitemap.xml`) or served
dynamically from a Cloudflare Worker.

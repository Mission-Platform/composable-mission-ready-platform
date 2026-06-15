# @mission-platform/seo

## 0.3.1

### Patch Changes

- 075a5a2: normalize source formatting and import ordering

  Apply the repo-wide Prettier/ESLint formatting pass (line reflow, attribute and import ordering, barrel-import paths, and simplified GeoJSON `Feature` typings in `map`). No runtime behaviour changes.

## 0.3.0

### Minor Changes

- f0a0e11: emit code-split, tree-shakeable library builds

  `defineLibraryConfig` now preserves the source module graph (one output file per
  module) and externalises each package's own `dependencies`/`peerDependencies` by
  default, so consumers get first-class tree shaking and code splitting. Packages
  that ship a single self-contained artifact (workers, WASM entries, the flat token
  bundle) opt out via the new `preserveModules: false` option. The main entry of
  each preserved-module package is now emitted as `dist/index.js`.

## 0.2.0

### Minor Changes

- c0c00d8: link json-ld structures together via stable `@id` references

  `webSite`, `organization`, `localBusiness` and `webPage` now emit deterministic
  `@id`s derived from their URLs (`#website`, `#organization`, `#webpage`), and
  cross-entity links (`WebSite.publisher`, `WebPage.isPartOf`,
  `Article.publisher` and `Article.mainEntityOfPage`) are now `{ "@id": ... }`
  references rather than inlined duplicates. This lets search engines merge the
  emitted JSON-LD nodes into a single linked graph, improving how `WebSite`,
  `Organization`, `WebPage` and `Article` entities relate to one another in rich
  results.

  New exports: `webSiteId`, `organizationId`, `webPageId` helpers for building
  the same `@id`s from outside the package (e.g. to reference an existing site
  node from a custom builder).

- c0c00d8: support multiple locales in json-ld structured data

  `WebSiteInput.inLanguage` and `WebPageInput.inLanguage` now accept either a
  single BCP-47 tag (existing behaviour) or an array, so a single site-wide
  `WebSite` node can advertise every locale a multilingual property is
  available in.

  `WebPageInput` also gains two new optional fields:

  - `workTranslation` — list of other-locale `WebPage` variants of this page,
    emitted as Schema.org `workTranslation` references (`@type: WebPage` with a
    stable `@id` via the existing `webPageId` helper).
  - `translationOfWork` — pointer at the source-of-truth variant if this page
    is itself a translation, emitted as Schema.org `translationOfWork`.

  Together these let prerendered multilingual sites emit a fully cross-linked
  JSON-LD graph so search engines can recognise locale variants as translations
  of the same logical work.

- c0c00d8: add new `@mission-platform/seo` package that unifies standard page metadata, Open Graph + Twitter Card
  metadata, and JSON-LD structured data (Schema.org `WebSite`, `WebPage`, `Organization`, `LocalBusiness`, `Person`,
  `BreadcrumbList`, `Article`/`BlogPosting`/`NewsArticle`, `Product`, `FAQPage`, `Event`, `VideoObject`, `ImageObject`,
  `SoftwareApplication`, `Recipe`, `Review`) behind a single Vue 3 `useSeo` composable and renderless `<Seo>` component,
  with SSR/SSG-safe head injection via `@unhead/vue`. Replaces and removes the previous `@mission-platform/page-meta`
  and `@mission-platform/open-graph` packages — migrate by passing their inputs as `page` / `openGraph` blocks to
  `useSeo`.
- c0c00d8: feat(seo): add `buildRobotsTxt`, `buildSitemapXml`, and `buildSitemapIndex` generators

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

### Patch Changes

- 9edf34d: rename local `doc` variable to `document` in `stripSsrJsonLdOnce`
- b5b4c0a: rename internal `ref` helper to `reference` in `build-json-ld` to avoid shadowing Vue's `ref` and satisfy
  lint; reformat README example and spec
- c62cd90: fix(seo): strip SSR-prerendered JSON-LD scripts on client hydration so unhead doesn't append duplicate
  `Organization` / `WebSite` / `WebPage` blocks on app load

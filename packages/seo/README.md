# `@mission-platform/seo`

Unified SEO surface for Mission Platform apps. Manages everything that drives
search-engine ranking and social-share previews from a single composable
(`useSeo`) or declarative component (`<Seo>`):

- **Standard page metadata** — `<title>`, `<html lang>`, `<meta>` tags
  (description, keywords, author, robots, theme-color, viewport,
  application-name, generator, charset, arbitrary `extra`), and
  `<link rel="canonical">` / `<link rel="alternate">` hreflang entries.
- **Open Graph + Twitter Card metadata** — full OG property graph (title,
  description, type, url, site_name, locale, locale alternates, images with
  sub-properties) and a Twitter Card overlay that falls back to OG fields.
- **JSON-LD structured data** — Schema.org builders for `WebSite`, `WebPage`,
  `Organization`, `LocalBusiness`, `Person`, `BreadcrumbList`, `Article`
  (`BlogPosting`, `NewsArticle`), `Product`, `FAQPage`, `Event`,
  `VideoObject`, `ImageObject`, `SoftwareApplication`, `Recipe`, `Review`.

Internally everything is wired through `@unhead/vue`, so the same definitions
drive client-side DOM mutation **and** server-side head serialisation (used
by `vite-ssg` and similar prerenderers to bake the tags into static HTML).

This package replaces the previous `@mission-platform/page-meta` and
`@mission-platform/open-graph` packages.

## Install

```bash
pnpm add @mission-platform/seo
```

## Component usage

```vue
<script setup lang="ts">
import { Seo, webSite, organization, breadcrumbList } from '@mission-platform/seo';
</script>

<template>
  <Seo
    :page="{
      title: 'About us',
      titleTemplate: '%s — Mission Platform',
      description: 'Who we are and what we build.',
      canonical: 'https://mission-platform.dev/about',
      language: 'en-AU',
    }"
    :open-graph="{
      title: 'About us',
      url: 'https://mission-platform.dev/about',
      siteName: 'Mission Platform',
      images: ['https://mission-platform.dev/og-image.svg'],
      twitter: { card: 'summary_large_image' },
    }"
    :json-ld="[
      webSite({ name: 'Mission Platform', url: 'https://mission-platform.dev/' }),
      organization({ name: 'Mission Platform', url: 'https://mission-platform.dev/' }),
      breadcrumbList({ items: [
        { name: 'Home', url: 'https://mission-platform.dev/' },
        { name: 'About' },
      ] }),
    ]"
  />
</template>
```

## Composable usage

```ts
import { useSeo, webSite } from '@mission-platform/seo';
import { effectScope } from 'vue';

effectScope(true).run(() => {
  useSeo(() => ({
    page: {
      title: 'Home',
      description: 'Composable. Mission Ready.',
      canonical: 'https://mission-platform.dev/',
      language: 'en-AU',
    },
    openGraph: {
      title: 'Home',
      url: 'https://mission-platform.dev/',
      siteName: 'Mission Platform',
    },
    jsonLd: webSite({
      name: 'Mission Platform',
      url: 'https://mission-platform.dev/',
      searchUrlTemplate: 'https://mission-platform.dev/?q={search_term_string}',
    }),
  }));
});
```

`useSeo` accepts a ref, a getter, or a plain object — so it works equally
well for static metadata and for reactive route-driven state.

## API

- `<Seo :page :open-graph :json-ld />` — renderless Vue 3 component.
- `useSeo(metadata)` — Vue 3 composable.
- `buildPageMeta(metadata)` — pure builder for `<title>` / `<meta>` / `<link>` descriptors.
- `buildOpenGraph(metadata)` — pure builder for Open Graph + Twitter `<meta>` descriptors.
- JSON-LD builders (also re-exported under the `jsonLd` namespace):
  `webSite`, `webPage`, `organization`, `localBusiness`, `person`,
  `breadcrumbList`, `article`, `product`, `faqPage`, `event`, `videoObject`,
  `imageObject`, `softwareApplication`, `recipe`, `review`.

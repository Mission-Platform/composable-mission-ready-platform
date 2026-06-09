# `@mission-platform/page-meta`

Standard page metadata generation and dynamic `<head>` injection for Mission
Platform apps. Manages `<title>`, `<html lang>`, `<meta>` tags (description,
keywords, author, robots, theme-color, viewport, application-name, generator,
charset, arbitrary `extra`), and `<link rel="canonical">` / `<link
rel="alternate">` hreflang entries.

Complementary to [`@mission-platform/open-graph`](../open-graph/README.md),
which owns Open Graph + Twitter Card tags. The two packages use different
ownership attributes (`data-mp-page-meta` vs `data-mp-open-graph`) so they can
be used together without stepping on each other.

## Install

```bash
pnpm add @mission-platform/page-meta
```

## Usage

```ts
import { usePageMeta } from '@mission-platform/page-meta';
import { effectScope } from 'vue';

effectScope(true).run(() => {
  usePageMeta({
    title: 'About us',
    titleTemplate: '%s — Mission Platform',
    description: 'Who we are and what we build.',
    keywords: ['vue', 'monorepo', 'composable'],
    author: 'Mission Platform',
    robots: 'index,follow',
    themeColor: '#4a9ebe',
    viewport: 'width=device-width, initial-scale=1.0, viewport-fit=cover',
    canonical: 'https://mission-platform.dev/about',
    language: 'en-AU',
    alternates: [
      { hreflang: 'es-ES', href: 'https://mission-platform.dev/es/about' },
      { hreflang: 'fr-FR', href: 'https://mission-platform.dev/fr/about' },
    ],
  });
});
```

`usePageMeta` accepts a ref, a getter, or a plain object — so it works equally
well for static page metadata and for reactive route-driven state.

## API

- `usePageMeta(metadata, options?)` — Vue 3 composable. Reactively syncs the
  document head and `document.title`. Cleans up its owned tags on scope
  dispose by default (disable with `{ cleanupOnDispose: false }`).
- `buildPageMeta(metadata)` — pure builder returning `{ title, language,
metaTags, linkTags }`.
- `applyPageMeta(built, options?)` — idempotent DOM applier. Reuses matching
  existing tags and prunes previously-owned tags that drop out.
- `clearPageMeta(options?)` — remove every package-owned meta/link tag.
- `PAGE_META_OWNER_ATTR` — the `data-mp-page-meta` attribute used to mark
  owned elements.

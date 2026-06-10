---
'@mission-platform/seo': minor
---

add new `@mission-platform/seo` package that unifies standard page metadata, Open Graph + Twitter Card metadata, and JSON-LD structured data (Schema.org `WebSite`, `WebPage`, `Organization`, `LocalBusiness`, `Person`, `BreadcrumbList`, `Article`/`BlogPosting`/`NewsArticle`, `Product`, `FAQPage`, `Event`, `VideoObject`, `ImageObject`, `SoftwareApplication`, `Recipe`, `Review`) behind a single Vue 3 `useSeo` composable and renderless `<Seo>` component, with SSR/SSG-safe head injection via `@unhead/vue`. Replaces and removes the previous `@mission-platform/page-meta` and `@mission-platform/open-graph` packages — migrate by passing their inputs as `page` / `openGraph` blocks to `useSeo`.

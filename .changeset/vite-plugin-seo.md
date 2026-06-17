---
'@mission-platform/vite-plugin-seo': minor
---

add vite plugin that generates robots.txt and sitemap.xml at build time

Introduces the `@mission-platform/vite-plugin-seo` workspace, whose `seoPlugin`
runs the deterministic `@mission-platform/seo` builders during `vite build` (and
on dev-server start), replacing the per-app `scripts/generate-seo-files.ts` +
`prebuild` Node scripts.

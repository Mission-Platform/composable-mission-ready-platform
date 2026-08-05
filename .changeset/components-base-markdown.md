---
'@mission-platform/components': minor
---

add `ForgeMarkdown` — a read-only, framework-neutral Markdown renderer that renders Markdown **as real components** (fenced code → `ForgeCodeBlock`, GFM tables → `ForgeTable`, headings/paragraphs/inline runs → `ForgeTypography`) driven by the `marked` token stream, so there is no `v-html`/`innerHTML` and the output is SSR-safe. Supports a `size` token, heading anchor ids, and an optional `resolveHref` hook for rewriting relative links to in-app routes.

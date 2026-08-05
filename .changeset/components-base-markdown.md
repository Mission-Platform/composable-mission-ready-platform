---
'@mission-platform/components': minor
---

add `BaseMarkdown` — a read-only, framework-neutral Markdown renderer that renders Markdown **as real components** (fenced code → `BaseCodeBlock`, GFM tables → `BaseTable`, headings/paragraphs/inline runs → `BaseTypography`) driven by the `marked` token stream, so there is no `v-html`/`innerHTML` and the output is SSR-safe. Supports a `size` token, heading anchor ids, and an optional `resolveHref` hook for rewriting relative links to in-app routes.

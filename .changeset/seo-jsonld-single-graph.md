---
'@mission-platform/seo': patch
---

emit all JSON-LD blocks as a single `@graph` document instead of one `<script type="application/ld+json">` per node — the shared `@context` is hoisted to the graph root and stripped from each node

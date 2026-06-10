---
'@mission-platform/seo': patch
---

fix(seo): strip SSR-prerendered JSON-LD scripts on client hydration so unhead doesn't append duplicate `Organization` / `WebSite` / `WebPage` blocks on app load

---
'@mission-platform/components': patch
---

fix(components): make `BaseDropdown` SSR/SSG-safe by guarding the `document`-touching `watch` callback against environments where `document` is undefined (e.g. `vite-ssg` prerendering). Behaviour is unchanged in the browser.

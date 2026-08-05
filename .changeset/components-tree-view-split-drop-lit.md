---
'@mission-platform/components': patch
---

Split `BaseTreeView` into `base-tree-view.tsx` + a recursive `base-tree-view-item.tsx` sibling (public API and rendered output unchanged), and drop the now-unused `lit` peer dependency now that the Web-Components build uses the native `@mission-platform/forge/web-components` runtime.

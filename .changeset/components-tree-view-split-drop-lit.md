---
'@mission-platform/components': patch
---

Split `ForgeTreeView` into `forge-tree-view.tsx` + a recursive `forge-tree-view-item.tsx` sibling (public API and rendered output unchanged), and drop the now-unused `lit` peer dependency now that the Web-Components build uses the native `@mission-platform/forge/web-components` runtime.

---
'@mission-platform/components': patch
---

fix accessibility violations in `BaseApplicationLayout` and `BaseTabs`:

- `BaseApplicationLayout` now wraps the `navbar` slot in a `<div>` rather than a `<header>` so that a slotted `BaseNavbar` (itself a `<header>` banner landmark) is not nested inside another banner landmark (`landmark-banner-is-top-level`).
- `BaseTabs`/`BaseVirtualTabs`: the individual tab element is now a `<div role="tab">` instead of a nested `<button>`, and the optional close affordance is a `<span aria-hidden="true">` inside the tab rather than a sibling `<button>` inside the `role="tablist"` container. This resolves `aria-required-children` (tablist children must all be tabs) and `nested-interactive` violations while preserving all existing keyboard, click, and emit behaviour.

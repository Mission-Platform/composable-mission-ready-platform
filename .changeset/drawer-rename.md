---
'@mission-platform/components': major
---

redo `BaseSidebar` as `BaseDrawer` with start/end/top/bottom placement

The `BaseSidebar` family is replaced by a more general `BaseDrawer` that can be anchored to any viewport edge. The `side` prop (`left`/`right`) is replaced by a `placement` prop accepting `start`/`end` (full-height side panels sized by width, using logical inline edges) and the new `top`/`bottom` (full-width panels sized by height). Sizing, slide transitions, and the optional draggable resize handle are all axis-aware, so a drag on a `top`/`bottom` drawer grows its height.

BREAKING CHANGE: `BaseSidebar`, `BaseSidebarHeader`, `BaseSidebarBody`, `BaseSidebarFooter` are renamed to `BaseDrawer`, `BaseDrawerHeader`, `BaseDrawerBody`, `BaseDrawerFooter`. The `side="left" | "right"` prop is replaced by `placement="start" | "end" | "top" | "bottom"` (default `start`). The `SidebarSide`, `SidebarSize`, `SidebarVariant`, `SidebarDraggable` types and the `SIDEBAR_SIZE_REM` export are renamed to `DrawerPlacement`, `DrawerSize`, `DrawerVariant`, `DrawerDraggable` and `DRAWER_SIZE_REM`. Update imports, tags, the `side` prop, and the CSS class hooks (`base-sidebar*` → `base-drawer*`, including the resize handle modifiers `--left`/`--right` → `--start`/`--end`).

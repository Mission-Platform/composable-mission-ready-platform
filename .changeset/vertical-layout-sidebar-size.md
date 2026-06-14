---
'@mission-platform/components': major
---

`BaseVerticalLayout` now sizes each side column via the canonical sidebar size scale. The free-form `startWidth`/`endWidth` CSS-length props are replaced with `startSize`/`endSize` (`SidebarSize`, `2xs`–`2xl`, default `md`), which are forwarded to the backing `BaseSidebar`'s `size` and used to derive the inline grid track widths from `SIDEBAR_SIZE_REM`.

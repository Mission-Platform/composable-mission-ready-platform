---
'@mission-platform/jsx': minor
'@mission-platform/vite-plugin-jsx': minor
'@mission-platform/components': minor
---

add a framework-neutral `Teleport`/portal primitive and migrate the popup overlays with CSS anchor positioning

- `@mission-platform/jsx`: add the neutral `<Teleport to="…">` portal element (`MpTeleportProperties`) — a compile-time/adapter marker like `Slot`. The runtime adapters render its children in place (SSR parity), and `@mission-platform/jsx/react` now also exports a real `createPortal`-backed `Teleport` component (SSR-safe; resolves its target after mount).
- `@mission-platform/vite-plugin-jsx`: remap the neutral `Teleport` import per framework — Vue resolves it from the `vue` runtime (built-in `<Teleport>`) and React imports it from `@mission-platform/jsx/react` (the `createPortal` wrapper) — while leaving the `<Teleport>` JSX usage intact.
- `@mission-platform/components`: migrate the `Components/Overlays` popups `BaseTooltip`, `BasePopover`, and `BaseDropdown` from `@mission-platform/components` to the write-once neutral package. Each teleports its panel to `document.body` and positions it with the CSS Anchor Positioning API (`anchor-name`/`position-anchor`/`position-area` + `position-try-fallbacks` + `@position-try`, plus `anchor-size(width)` for the dropdown's trigger-width match) instead of `@floating-ui`; `<Transition>` is dropped. The popover's and dropdown's compound (`-start`/`-end`) placements use **fully-logical** `position-area` values (e.g. `block-end span-inline-end`) — mixing a physical side keyword with a logical span (`bottom span-inline-end`) is an invalid value that browsers silently drop, which would leave the teleported panel un-anchored at its static position. The modal overlays (`BaseDialog`/`BaseModal`) remain Vue-only.

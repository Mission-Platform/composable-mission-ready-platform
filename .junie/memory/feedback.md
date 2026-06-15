## Environment

- **Always run `nvm use` before `pnpm`.** This repo pins its Node version via `.nvmrc`. Every new shell session must run `nvm use` before any `pnpm` command (install, build, test, dev, changeset, etc.) — otherwise commands may silently run under the wrong Node version and fail in confusing ways.

## Accessibility / markup

- **Prefer semantic HTML over ARIA roles.** When authoring or editing components, use the native element that already carries the semantics (`<button>`, `<ul>`/`<ol>`/`<li>`, `<a href>`, `<nav>`/`<header>`/`<footer>`/`<main>`/`<section>`, `<fieldset>`, `<dialog>`, `<table>`…) instead of putting a `role="…"` on a generic `<div>`/`<span>`. Only fall back to an explicit `role` when no native element provides the semantics (e.g. `slider`, `tab`/`tablist`/`tabpanel`, `menu`/`menuitem`, `alert`/`status`/`log`, `tooltip`, `img` on inline SVG).

- **Hold the WCAG 2.2 bar.** `packages/components` ships a global reduced-motion reset (`src/styles/a11y.scss`, bundled into `@mission-platform/components/styles`) so plain-CSS motion is neutralised everywhere — don't add per-component `@media (prefers-reduced-motion)` for CSS. Gate **JS-driven** motion (autoplay, smooth scroll, timers, programmatic animation) on the `useReducedMotion()` composable. Auto-moving content (>5s) needs an always-available pause/stop control (2.2.2). Interactive controls need a ≥24×24px hit area (2.5.8) and a visible `:focus-visible` indicator.

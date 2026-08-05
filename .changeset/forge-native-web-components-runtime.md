---
'@mission-platform/forge': minor
---

Add a native, dependency-free Web Components runtime exported as `@mission-platform/forge/web-components` (`ForgeElement`, `html`, `nothing`, `render`). It replaces Lit as the base for compiled custom elements: `ForgeElement` renders a lit-style tagged template into an open shadow root with reactive `static properties`/state and coalesced microtask updates.

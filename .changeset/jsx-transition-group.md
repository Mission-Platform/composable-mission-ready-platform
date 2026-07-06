---
'@mission-platform/jsx': minor
---

add the `TransitionGroup` neutral primitive (the keyed-list counterpart of `Transition`) — the React/Vue adapters intercept the marker for SSR (children rendered in place) and the React build ships a CSS-class group driver (per-item enter/leave + FLIP move, applied to DOM-element children), mirroring Vue's built-in `<TransitionGroup>`

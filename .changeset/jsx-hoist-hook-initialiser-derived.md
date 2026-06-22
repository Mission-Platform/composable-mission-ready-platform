---
'@mission-platform/vite-plugin-jsx': patch
---

fix a Vue compile bug where a derived local read by a hook initialiser was left out of `setup`

When a neutral component declared a derived `const` and then read it from a hook
initialiser — e.g. `const initial = parseTime(modelValue); const [h] = useState(initial.h)` —
the Vue emitter only hoisted derived declarations that a `useEffect` closed over.
Because `useState`/`useRef`/`useMemo`/`useCallback`/`useContext` initialisers are
also emitted in `setup`, the derived `const` stayed in the per-render closure and
resolved to an undefined name at runtime (`ReferenceError: initial is not defined`).

The hoist analysis now also seeds from hook-declaration initialisers, so a derived
value read by a hook is lifted into `setup` (as a `computed`) ahead of the hook
that consumes it.

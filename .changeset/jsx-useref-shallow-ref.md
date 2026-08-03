---
'@mission-platform/vite-plugin-forge': patch
---

Compile the neutral `useRef` to Vue's `shallowRef` instead of a deep `ref`.

`useRef` is a non-reactive, mutable container (React's `useRef` semantics), so a
deep, fully-reactive `ref` was the wrong mapping: assigning a large external
instance into `.current` (e.g. a Monaco editor) made Vue deep-proxy the whole
object, so every internal property access went through a reactivity trap and, when
read inside an effect, subscribed that effect to the instance's internals. In the
WYSIWYG code editor / schema-form `code` field this produced an unbounded
pre-flush watcher storm that silently froze the tab on the first keystroke (no Vue
"recursive updates" warning, since pre-flush jobs are not recursion-capped).

`useRef` now maps to `shallowRef`, which keeps `.value`-reassignment reactivity
(harmless) while leaving the stored object un-proxied. The component and hook
(composable) emitters both add the `shallowRef` import, and a `useRef` bound to an
element still becomes `useTemplateRef`.

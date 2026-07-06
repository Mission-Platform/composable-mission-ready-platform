---
'@mission-platform/jsx': minor
'@mission-platform/vite-plugin-jsx': minor
'@mission-platform/components': minor
---

add a framework-neutral `classNames` helper and move component CSS Modules to the `mp.components` layer

`@mission-platform/jsx` now exports a `classNames(...values)` helper (and its
`ClassValue` type) for assembling class names the same way on every framework
from the string (`'a b'`), object (`{ 'class': boolean }`), and array
(`['class']`) forms — falsy entries are dropped and duplicates de-duplicated.

`@mission-platform/vite-plugin-jsx`'s two-stage compiler now (1) preserves
neutral framework-agnostic value imports such as `classNames` verbatim (instead
of translating them like `h`/the hooks), and (2) carries each component's
own relative stylesheet imports (CSS Modules and bare CSS) onto both the React
and Vue generated source trees, so a neutral component can own and ship its own
CSS.

`@mission-platform/components`' co-located `.module.scss` files are now real
CSS Modules whose rules live in the shared `@layer mp.components` cascade layer
with no `:global`. The styled components (`BaseBadge`, `BaseButton`,
`BaseSeparator`) own their styling via the hashed class map + `classNames`, and
the package now ships that CSS through new `./vue.css` and `./react.css`
exports.

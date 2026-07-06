---
"@mission-platform/vite-plugin-jsx": patch
---

make the `<Dynamic is>` primitive accept hyphenated attributes and slotted children

`dynamicToHCall` now quotes non-identifier prop keys (e.g. `aria-current`,
`data-id`) as string-literal property names so the emitted `h(tag, { … })`
object literal is valid JS, and `jsxChildToArgument` unwraps the `{ … }`
`JsxExpression` wrapper produced by the `<Slot>` rewrite so a `<Dynamic>` may
carry `<Slot>` children (e.g. `<Dynamic is={tag}><Slot/></Dynamic>`). This
unblocks `BaseNavbarItem`'s dynamic-tag rendering on both frameworks.

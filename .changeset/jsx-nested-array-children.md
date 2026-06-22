---
"@mission-platform/jsx": patch
---

allow array children in any position in the neutral JSX child typing

The `jsx-globals` `IntrinsicElements` children type now accepts a nested array
(`MpChild | readonly (MpChild | readonly MpChild[])[]`) so a `{items.map(…)}`
list can sit **alongside** other children (e.g. a header element next to a list)
rather than only as the sole child. This is type-safe because the `h` factory
already flattens nested arrays recursively, and unblocks components like
`BaseTabs` that render a list of panels next to a tab bar.

---
'@mission-platform/tokens': minor
'@mission-platform/breakpoints': major
'@mission-platform/components': patch
---

move the breakpoint SCSS layer into the tokens package

The breakpoint SCSS variables (`$bp-*`, `$breakpoints`), the
`bp-up`/`bp-down`/`bp-between`/`bp-only` mixins, and the
`.bp-show-*`/`.bp-hide-*`/`.bp-only-*` visibility utility classes now live in
`@mission-platform/tokens`, exported as `@mission-platform/tokens/scss/breakpoints-mixins`
(variables + mixins, no emitted CSS) and `@mission-platform/tokens/scss/breakpoints`
(the above plus the utility classes).

BREAKING CHANGE: `@mission-platform/breakpoints` no longer exports
`./scss/breakpoints` or `./scss/mixins`; import the breakpoint SCSS from
`@mission-platform/tokens/scss/breakpoints-mixins` (or `.../scss/breakpoints`)
instead. The package continues to export the `useBreakpoints` composable and the
`<ShowAt>`/`<HideAt>`/`<BreakpointDebug>` components unchanged.

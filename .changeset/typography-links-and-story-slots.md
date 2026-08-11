---
'@mission-platform/storybook-framework': minor
'@mission-platform/components': minor
'@mission-platform/tokens': minor
'@mission-platform/icons': patch
'@mission-platform/map': patch
---

add link styles to `ForgeTypography` and a five-renderer story slot helper

`ForgeTypography` can now render a link two ways: `variant="link"` for
standalone link text, and `href` on **any** variant so a heading or caption can
be a link without leaving its own type scale. Links get the link colour, its
hover/active and `:visited` treatment, a visible focus ring and an
`underline?: 'always' | 'hover' | 'none'` mode (`'hover'` by default);
`target="_blank"` adds `rel="noopener noreferrer"` automatically, and an
explicit `color` still wins. Three new semantic tokens back it in both themes:
`color.text.link`, `color.text.link-hover` and `color.text.link-visited`.

`@mission-platform/storybook-framework` gains a `./slots` entry point exporting
`renderWithSlots(component, properties, slots, children?)` and a `node()` JSX
factory, with one implementation per renderer behind the `mp:vue`, `mp:react`,
`mp:solid`, `mp:svelte` and `mp:web-component` export conditions. It is the one
supported way to fill a component's **named slot** from a neutral story: passing
a node as a prop only works on the React and Solid builds, so the dropdown,
popover and navbar stories rendered blank on the other three. The Svelte and
Web-Component workbenches additionally now compile story JSX through that
factory, having previously had no JSX transform at all.

Visual fixes in `@mission-platform/components`: the breadcrumb's current crumb
now matches its sibling links (it inherits the trail's font and differs only in
colour, instead of being wrapped in a smaller typography variant); `ForgeMenu`
reads as a menu surface at rest and its `horizontal` orientation lays out as a
row with floating submenus; and the `line` tab variant draws its active
indicator inside the tab's own box, so the tab list's `overflow-x: auto` can no
longer clip it, with the active label's weight bound to the active state.

The icon overview gallery now finds every icon on every framework (the Vue build
exports `defineComponent` objects, not functions), and the map stories render a
live basemap again — their sized wrapper is an inline element rather than a local
component taking `children`, which the Vue JSX transform turns into a slot.

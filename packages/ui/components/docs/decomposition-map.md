# Components decomposition map

This document records the residual inventory after extracting `ForgeTag` to
`@mission-platform/select`, floating and notification UI to `@mission-platform/float`,
and theme UI/state to `@mission-platform/theme`. The neutral barrel at
`src/components/index.ts` currently exports **45** components; the lists below are
the recommended next-wave ownership boundaries, not additional packages created
by this migration.

## Recommended next-wave packages

### `@mission-platform/navigation`

`ForgeBreadcrumb`, `ForgeMenu`, `ForgeMenuItem`, `ForgeMenubar`, `ForgeNavbar`,
`ForgeNavbarItem`, `ForgePagination`, `ForgeTabs`, and `ForgeVirtualTabs`.

These components share keyboard navigation, roving focus, menu/tab state, and
navigation-oriented interaction contracts. Their neutral implementations depend
on `@mission-platform/forge-jsx`; menu and table-like controls also use
`@mission-platform/icons`, while breadcrumb/navbar content composes the owning
`@mission-platform/typography` package. `ForgeNavbar` currently composes the
residual `ForgeDrawer`, so extracting navigation requires either keeping that
dependency explicit or first deciding the drawer boundary; it must not introduce
a dependency from `@mission-platform/components` back into navigation.

### `@mission-platform/data-display`

`ForgeAccordion`, `ForgeList`, `ForgeTable`, `ForgeTreeView`, `ForgeVirtualList`,
`ForgeVirtualTable`, `ForgeVirtualTreeView`, `ForgeVirtualLogViewer`,
`ForgeTimeline`, `ForgeBadge`, `ForgeProgressBar`, and `ForgeStatusIcon`.

The common concern is rendering structured or high-volume data, including
windowing, sorting, tree expansion, and status presentation. The current source
uses `@mission-platform/forge-jsx` and, where text or glyphs are composed,
`@mission-platform/typography` and `@mission-platform/icons`; these should remain
lower-level dependencies of a future package. Virtual components should move with
their co-located styles/specs/stories so their neutral hook behavior and five
Forge targets remain tested together.

### `@mission-platform/layout`

`ForgeCard`, `ForgeGrid`, `ForgeMasonry`, `ForgeStack`, `ForgeSeparator`, and
`ForgeCollapse`.

These are structural primitives with no dependency on the extracted float, theme,
or select packages. `ForgeCard` and the spacing-bearing primitives currently use
package-local SCSS utilities, so a move must either carry those styles or promote
the utility to a stable lower-level package; it should not reach into another
domain package's source tree.

### `@mission-platform/media`

`ForgeBackgroundVideo`, `ForgeResponsiveImage`, `ForgeResponsiveVideo`,
`ForgeCarousel`, and `ForgeDeviceMock`.

The first three own media loading/rendering semantics, while carousel and device
mock add presentation around media. Their neutral source currently depends on
`@mission-platform/forge-jsx` and, for carousel controls, `@mission-platform/icons`;
there is no dependency on the extracted packages. Preserve reduced-motion and
per-component CSS as part of a future move rather than splitting media behavior
from its styles.

### `@mission-platform/communication`

`ForgeChatBubble` and `ForgeChatArea`.

These components share conversation semantics, live-region behavior, and message
layout. `ForgeChatBubble` composes `ForgeAvatar` and `@mission-platform/typography`
today, so the future package should depend on stable public contracts for those
primitives (or keep them in the foundation package) instead of importing residual
component source files through an alias.

## Components that remain together for now

Keep this small foundation/content/template set in `@mission-platform/components`
until it has enough API surface to justify another boundary:

`ForgeAvatar`, `ForgeButton`, `ForgeButtonGroup`, `ForgeIconButton`, `ForgeQuote`,
`ForgeSkeleton`, `ForgeSpinner`, and `ForgeHero`.

`ForgeInView` is also retained as a small interaction utility. `ForgeTypography`
is owned by `@mission-platform/typography` and is intentionally not part of the
residual barrel.

## Deferred overlay/window candidates

`ForgeDrawer` and `ForgeWindowPopout` are deliberately not moved in this change.
`ForgeDrawer` is overlay/window-adjacent and is currently composed by
`ForgeNavbar`; `ForgeWindowPopout` owns browser-window lifecycle and therefore
needs a separate SSR, focus, and cross-window contract decision. Evaluate both
with the navigation and float owners before creating a package, and do not keep
duplicate implementations as a compatibility shortcut.

## Boundary audit

The residual component source was checked for imports of the extracted packages:
there are no imports of `@mission-platform/theme`, `@mission-platform/float`, or
`@mission-platform/select` under `packages/ui/components/src`. Neutral components
use `@mission-platform/forge-jsx`, selected icons from `@mission-platform/icons`,
typography from `@mission-platform/typography`, and package-local styles/utilities.
Stories may import the package barrel to exercise the public surface; that is not
an implementation dependency or a package cycle.

Every residual component keeps its co-located `index.ts`, neutral source, SCSS,
spec, and Storybook story. The package manifest publishes `dist`, components,
styles, and utilities only; the extracted store tree is no longer included.

## Shared size utility contract

The `.forge-size--2xs` through `.forge-size--2xl` classes are intentionally
emitted by `@mission-platform/tokens/scss/tokens`, rather than by the residual
components package. Residual components and the extracted `float` and `theme`
packages all use these classes, while standalone Forge package output cannot
reliably include a CSS module owned by `@mission-platform/components`.

The tokens barrel includes `scss/_size.scss` once in the `mp.tokens` cascade
layer, alongside the token custom properties and base resets. This preserves
the existing precedence contract: unlayered application styles override the
utility rules, and every affected app/Storybook entry already imports the
tokens barrel. Components therefore keep emitting the stable global class
names without duplicating the size scale in each package.

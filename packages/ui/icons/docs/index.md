# @mission-platform/icons

`@mission-platform/icons` is a collection of framework-neutral SVG icon components for the Mission Platform. Each icon is
authored once and compiled into native Vue 3, React, Solid, Svelte, and Web Component builds at build time.

## Architecture & Distribution

The package leverages `@mission-platform/vite-plugin-forge` to provide high-performance, tree-shakable icons for all
supported frameworks:

- **Compilation**: A single `pnpm build` emits one framework-native bundle per target, a deterministic `dist/icons.svg`
  sprite, and per-icon CSS assets.
- **Single Entry, Conditional Resolution**: There is exactly one public entry point,
  `@mission-platform/icons`. It carries the `mp:vue`, `mp:react`, `mp:solid`, and
  `mp:web-component` export conditions; whichever one your toolchain activates decides which compiled build the bare
  specifier resolves to. With no condition set it falls back to the neutral forge source, which is what other
  "write-once" components consume.

## Usage

### Choosing a Framework

Select the framework **once**, not per import — in Vite through `resolve.conditions` (use
`defineFrameworkAppConfig` or `frameworkResolveConditions` from `@mission-platform/vite-config`) and in TypeScript
through `customConditions` (extend a `@mission-platform/typescript-config/framework-<name>`
preset):

```ts
resolve: {
  conditions: frameworkResolveConditions('mp:vue'),
}
```

### Imports

Every import is then bare and identical across frameworks:

**Vue 3** (`mp:vue` active):

```vue
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

**React** (`mp:react` active):

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

### Neutral Component Imports

When authoring a framework-neutral component (compiled by `vite-plugin-forge`), no `mp:*` condition is active and the
same specifier gives you the neutral source:

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

## Taxonomy and catalog

Authoring folders and Storybook titles follow `icons/<category>/<subcategory>/<icon-name>`. The reviewed catalog covers
`navigation`, `text`, `maps`, `routing`, `drawing`, `content`, `status`, `communication`, `media`, `security`, `data`,
`time`, and `objects`. The gap review is recorded in `src/catalog.ts`; it keeps country support data-driven and records
deferred application-specific artwork instead of creating one component per country.

## Sprite reuse

Every wrapper renders an accessible outer `<svg>` with a `<use href="#icon-id">` reference. `IconSpriteProvider` mounts
the canonical symbols once for an inline subtree:

```tsx
import { ForgeIconAlert, ForgeIconArrow, IconSpriteProvider } from '@mission-platform/icons';

export function Toolbar() {
  return (
    <IconSpriteProvider>
      <ForgeIconAlert ariaLabel="Alert" />
      <ForgeIconArrow
        direction="right"
        ariaLabel="Next"
      />
    </IconSpriteProvider>
  );
}
```

For an external, cacheable asset use `src="/assets/icons.svg"` with `inline={false}`. External SVG fragment references
require same-origin access or a compatible CORS policy; inline mode is the fallback for SSR, restrictive CSP, or browsers
that cannot resolve external fragments. The package build emits `dist/icons.svg`, also available as
`@mission-platform/icons/icons.svg`.

## Country and composition APIs

`ForgeIconFlag` and `ForgeIconCountryGlobe` accept uppercase ISO-style codes from `SUPPORTED_COUNTRY_CODES`, including
`US`, `CA`, `JP`, `GB`, and `ZA`. Unsupported runtime values throw a descriptive error. Country globes, route/waypoint
patterns, and future overlays are typed symbol compositions: they reference existing IDs with transforms and are checked
for missing references and cycles before sprite generation.

## API Reference

Each icon renders an `<svg role="img">` within a centering `<div>` wrapper that uses the `.forge-icon-<name>` BEM class.
All icons are based on a $24 \times 24$ viewbox.

### Universal Props

| Prop        | Type               | Default            | Description                                                                                                           |
| :---------- | :----------------- | :----------------- | :-------------------------------------------------------------------------------------------------------------------- |
| `size`      | `number \| string` | `'md'`             | Width and height. Supports named tokens (`'2xs'`, `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`, `'2xl'`) or a pixel number. |
| `color`     | `string`           | `'currentColor'`   | Stroke colour (and fill for filled-marker icons).                                                                     |
| `ariaLabel` | `string`           | _Per-icon default_ | Accessible name. If omitted, the icon is marked as `aria-hidden`.                                                     |

### Behavioural Icons

Certain icons include additional props to control their appearance:

| Icon               | Extra Props                                                           | Description                                                |
| :----------------- | :-------------------------------------------------------------------- | :--------------------------------------------------------- |
| `ForgeIconArrow`   | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (default `'up'`)   | Rotates the arrow via an inline transform.                 |
| `ForgeIconChevron` | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (default `'down'`) | Rotates the chevron via an inline transform.               |
| `ForgeIconSort`    | `active`: `boolean`, `direction`: `'asc' \| 'desc' \| undefined`      | Highlights the chevron matching the active sort direction. |

## Icon Library

The library includes a wide array of icons covering several categories:

- **State & Status**: `ForgeIconAlert`, `ForgeIconCheck`, `ForgeIconError`, `ForgeIconInfo`, `ForgeIconWarning`.
- **Navigation**: `ForgeIconArrow`, `ForgeIconChevron`, `ForgeIconHome`, `ForgeIconMenu`, `ForgeIconExternalLink`.
- **Media**: `ForgeIconCamera`, `ForgeIconImage`, `ForgeIconMail`, `ForgeIconPhone`.
- **UI Controls**: `ForgeIconClose`, `ForgeIconEdit`, `ForgeIconPlus`, `ForgeIconMinus`, `ForgeIconSearch`,
  `ForgeIconSettings`.
- **Content Formatting**: `ForgeIconBold`, `ForgeIconItalic`, `ForgeIconBulletList`, `ForgeIconNumberedList`,
  `ForgeIconHeadingOne`...
  `ForgeIconHeadingSix`.
- **Specialized Tools**: `ForgeIconWrench`, `ForgeIconPalette`, `ForgeIconDebug`, `ForgeIconQrCode`.

## Development & Maintenance

### Building icons

The package-owned build emits neutral declarations, all framework adapters, and the SVG sprite. After changing catalog or
sprite source, run:

```sh
pnpm exec turbo run build:check --filter @mission-platform/icons
pnpm exec turbo run build --filter @mission-platform/icons
```

### Storybook

Icons are catalogued under `icons/<category>/<subcategory>/<icon-name>`, while `icons/overview` remains the full gallery.
The overview also demonstrates repeated icons through one `IconSpriteProvider`; individual stories expose `size`,
`color`, country-code, and `ariaLabel` controls where applicable.

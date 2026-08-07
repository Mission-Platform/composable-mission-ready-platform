# @mission-platform/icons

`@mission-platform/icons` is a collection of "write once, run on both frameworks" SVG icon components for the Mission
Platform. Each icon is authored once in a framework-neutral JSX dialect and compiled into native **Vue 3** and **React**
components at build time.

## Architecture & Distribution

The package leverages `@mission-platform/vite-plugin-forge` to provide high-performance, tree-shakable icons for both
frameworks:

- **Compilation**: A single `pnpm build` emits one framework-native bundle per target. Each icon is split
  into its own JS chunk and CSS asset.
- **Single Entry, Conditional Resolution**: There is exactly one public entry point,
  `@mission-platform/icons`. It carries the `mp:vue`, `mp:react`, `mp:solid`, and
  `mp:web-component` export conditions; whichever one your toolchain activates decides which compiled
  build the bare specifier resolves to. With no condition set it falls back to the neutral forge source,
  which is what other "write-once" components consume.

## Usage

### Choosing a Framework

Select the framework **once**, not per import — in Vite through `resolve.conditions` (use
`defineFrameworkAppConfig` or `frameworkResolveConditions` from `@mission-platform/vite-config`) and in
TypeScript through `customConditions` (extend a `@mission-platform/typescript-config/framework-<name>`
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

When authoring a framework-neutral component (compiled by `vite-plugin-forge`), no `mp:*` condition is
active and the same specifier gives you the neutral source:

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

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
- **UI Controls**: `ForgeIconClose`, `ForgeIconEdit`, `ForgeIconPlus`, `ForgeIconMinus`, `ForgeIconSearch`, `ForgeIconSettings`.
- **Content Formatting**: `ForgeIconBold`, `ForgeIconItalic`, `ForgeIconBulletList`, `ForgeIconNumberedList`, `ForgeIconHeadingOne`...
  `ForgeIconHeadingSix`.
- **Specialized Tools**: `ForgeIconWrench`, `ForgeIconPalette`, `ForgeIconDebug`, `ForgeIconQrCode`.

## Development & Maintenance

### Regenerating Icons

The neutral icons are generated from source Vue SFCs using a build script. To update the library after changing source
icons, run:

```sh
node scripts/generate-icons.js
```

### Storybook

Icons are catalogued in both Vue and React Storybooks under the `Icons` section. Each icon has its own story allowing
for real-time testing of `size`, `color`, and `ariaLabel` props.

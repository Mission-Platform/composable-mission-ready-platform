# @mission-platform/icons

`@mission-platform/icons` is a collection of "write once, run on both frameworks" SVG icon components for the Mission Platform. Each icon is authored once in a framework-neutral JSX dialect and compiled into native **Vue 3** and **React** components at build time.

## Architecture & Distribution

The package leverages `@mission-platform/vite-plugin-jsx` to provide high-performance, tree-shakable icons for both frameworks:

- **Compilation**: A single `pnpm build` emits two distinct subpaths (`./vue` and `./react`). Each icon is split into its own JS chunk and CSS asset.
- **Neutral Entry**: The package provides a neutral root entry (`@mission-platform/icons`) that re-exports the neutral source. This is intended for use within other "write-once" components; standard app code should continue using the framework-specific subpaths.

## Usage

### Framework-Specific Imports

For standard Vue or React applications, import from the corresponding subpath:

**Vue 3:**

```vue
import { IconAlert, IconArrow } from '@mission-platform/icons/vue';
```

**React:**

```tsx
import { IconAlert, IconArrow } from '@mission-platform/icons/react';
```

### Neutral Component Imports

When authoring a framework-neutral component (compiled by `vite-plugin-jsx`):

```tsx
import { IconAlert, IconArrow } from '@mission-platform/icons';
```

## API Reference

Each icon renders an `<svg role="img">` within a centering `<div>` wrapper that uses the `.base-icon-<name>` BEM class. All icons are based on a $24 \times 24$ viewbox.

### Universal Props

| Prop        | Type               | Default            | Description                                                                                                           |
| :---------- | :----------------- | :----------------- | :-------------------------------------------------------------------------------------------------------------------- |
| `size`      | `number \| string` | `'md'`             | Width and height. Supports named tokens (`'2xs'`, `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`, `'2xl'`) or a pixel number. |
| `color`     | `string`           | `'currentColor'`   | Stroke colour (and fill for filled-marker icons).                                                                     |
| `ariaLabel` | `string`           | _Per-icon default_ | Accessible name. If omitted, the icon is marked as `aria-hidden`.                                                     |

### Behavioural Icons

Certain icons include additional props to control their appearance:

| Icon          | Extra Props                                                           | Description                                                |
| :------------ | :-------------------------------------------------------------------- | :--------------------------------------------------------- |
| `IconArrow`   | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (default `'up'`)   | Rotates the arrow via an inline transform.                 |
| `IconChevron` | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (default `'down'`) | Rotates the chevron via an inline transform.               |
| `IconSort`    | `active`: `boolean`, `direction`: `'asc' \| 'desc' \| undefined`      | Highlights the chevron matching the active sort direction. |

## Icon Library

The library includes a wide array of icons covering several categories:

- **State & Status**: `IconAlert`, `IconCheck`, `IconError`, `IconInfo`, `IconWarning`.
- **Navigation**: `IconArrow`, `IconChevron`, `IconHome`, `IconMenu`, `IconExternalLink`.
- **Media**: `IconCamera`, `IconImage`, `IconMail`, `IconPhone`.
- **UI Controls**: `IconClose`, `IconEdit`, `IconPlus`, `IconMinus`, `IconSearch`, `IconSettings`.
- **Content Formatting**: `IconBold`, `IconItalic`, `IconBulletList`, `IconNumberedList`, `IconHeadingOne`...`IconHeadingSix`.
- **Specialized Tools**: `IconWrench`, `IconPalette`, `IconDebug`, `IconQrCode`.

## Development & Maintenance

### Regenerating Icons

The neutral icons are generated from source Vue SFCs using a build script. To update the library after changing source icons, run:

```sh
node scripts/generate-icons.js
```

### Storybook

Icons are catalogued in both Vue and React Storybooks under the `Icons` section. Each icon has its own story allowing for real-time testing of `size`, `color`, and `ariaLabel` props.

# `@mission-platform/icons`

Write-once SVG icon components for Mission Platform, authored in a framework-neutral JSX dialect
(`@mission-platform/forge-jsx`) and compiled into native Vue 3, React, Solid, Svelte, and Web Component builds.

## Features

- **Write Once, Run Anywhere**: Neutral icon JSX compiled to framework-native builds with zero runtime overhead.
- **Tree-Shakable**: Each icon is compiled into its own module for minimal bundle footprint.
- **Universal Props**: Standardized `size` tokens (`2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl` or explicit numeric
  values), `color`, and accessibility `ariaLabel`.
- **Specialized Behavior**: Directional transforms (`ForgeIconArrow`, `ForgeIconChevron`) and state indicators (`ForgeIconSort`).
- **Categorized Catalog**: Source and Storybook paths use `icons/<category>/<subcategory>/<icon-name>` across navigation,
  text, maps, routing, drawing, content, status, communication, media, security, data, time, and objects.
- **Sprite Reuse**: Components reference canonical symbol IDs through `<use>`, and the package publishes `icons.svg` for
  repeated application-wide icon rendering.

## Installation

```bash
pnpm add @mission-platform/icons
```

## Usage

There is a single entry point: `@mission-platform/icons`. Pick the framework **once** — `resolve.conditions`
via `defineFrameworkAppConfig` / `frameworkResolveConditions` from `@mission-platform/vite-config`, and
`customConditions` via the `@mission-platform/typescript-config/framework-<name>` presets — and the
`mp:<framework>` export condition resolves the bare specifier to the matching native build.

### Vue 3 (`mp:vue`)

```vue
<script setup lang="ts">
  import { ForgeIconAlert, ForgeIconArrow, ForgeIconCheck, ForgeIconSearch } from '@mission-platform/icons';
</script>

<template>
  <div class="flex items-center gap-2">
    <ForgeIconAlert
      size="lg"
      color="#ef4444"
      aria-label="Warning"
    />
    <ForgeIconArrow
      direction="right"
      size="sm"
    />
    <ForgeIconCheck
      size="md"
      color="#22c55e"
    />
    <ForgeIconSearch size="20" />
  </div>
</template>
```

### React (`mp:react`)

```tsx
import { ForgeIconAlert, ForgeIconArrow, ForgeIconCheck, ForgeIconSearch } from '@mission-platform/icons';

export function IconBar() {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <ForgeIconAlert
        size="lg"
        color="#ef4444"
        ariaLabel="Warning"
      />
      <ForgeIconArrow
        direction="right"
        size="sm"
      />
      <ForgeIconCheck
        size="md"
        color="#22c55e"
      />
      <ForgeIconSearch size={20} />
    </div>
  );
}
```

### Framework-Neutral Components (no `mp:*` condition)

When authoring write-once components compiled by `@mission-platform/vite-plugin-forge`, the very same
import yields the neutral JSX source:

```tsx
import { ForgeIconAlert, ForgeIconCheck } from '@mission-platform/icons';
```

## Exports

- `@mission-platform/icons`: the only entry point. Resolves to the compiled native Vue 3, React, Solid,
  or web-component build according to the active `mp:<framework>` condition, and to the neutral
  JSX source barrel when none is set.
- `@mission-platform/icons/icons.svg`: the deterministic SVG symbol sprite emitted by the package build.
- `IconSpriteProvider`: mounts one inline symbol host for a subtree, or references an external sprite with `src`.

### Sprite provider

Use the provider when many icons repeat on a page. It mounts symbol definitions once while each icon keeps its
accessible outer `<svg>` and tree-shakable wrapper:

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

For a cacheable published asset, configure `src="/assets/icons.svg"` and `inline={false}`. External `<use>` URLs must
be same-origin or served with a compatible CORS policy; use inline mode for SSR, restrictive CSP, or environments that
cannot resolve external SVG fragments.

### Country icons and compositions

`ForgeIconFlag` and `ForgeIconCountryGlobe` accept a validated uppercase country code such as `US`, `CA`, or `JP`.
`SUPPORTED_COUNTRY_CODES` exposes the initial supported set; unsupported runtime values throw a clear error rather than
rendering an unresolved symbol. Composite symbols such as route/waypoint and country globes reuse existing symbol IDs
and validated transforms instead of copying path markup.

## Universal Props

| Prop        | Type               | Default            | Description                                                 |
| :---------- | :----------------- | :----------------- | :---------------------------------------------------------- |
| `size`      | `number \| string` | `'md'`             | Named token (`2xs`–`2xl`) or pixel number.                  |
| `color`     | `string`           | `'currentColor'`   | Icon stroke or fill color.                                  |
| `ariaLabel` | `string`           | _Default per icon_ | Accessible label (marks `aria-hidden="true"` when omitted). |

For complete icon lists and build script details, see [docs/index.md](docs/index.md).

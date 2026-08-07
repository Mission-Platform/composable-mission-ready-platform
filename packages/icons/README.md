# `@mission-platform/icons`

Write-once SVG icon components for Mission Platform, authored in a framework-neutral JSX dialect
(`@mission-platform/forge`) and compiled into native **Vue 3** and **React** components.

## Features

- **Write Once, Run Anywhere**: Neutral icon JSX compiled to framework-native builds with zero runtime overhead.
- **Tree-Shakable**: Each icon is compiled into its own module for minimal bundle footprint.
- **Universal Props**: Standardized `size` tokens (`2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl` or explicit numeric
  values), `color`, and accessibility `ariaLabel`.
- **Specialized Behavior**: Directional transforms (`ForgeIconArrow`, `ForgeIconChevron`) and state indicators (`ForgeIconSort`).

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

## Universal Props

| Prop        | Type               | Default            | Description                                                 |
| :---------- | :----------------- | :----------------- | :---------------------------------------------------------- |
| `size`      | `number \| string` | `'md'`             | Named token (`2xs`–`2xl`) or pixel number.                  |
| `color`     | `string`           | `'currentColor'`   | Icon stroke or fill color.                                  |
| `ariaLabel` | `string`           | _Default per icon_ | Accessible label (marks `aria-hidden="true"` when omitted). |

For complete icon lists and build script details, see [docs/index.md](docs/index.md).

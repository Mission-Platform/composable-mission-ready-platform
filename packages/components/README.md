# `@mission-platform/components`

Write-once, framework-neutral component library for Mission Platform. Components are authored once in JSX using
`@mission-platform/forge` and compiled into native **Vue 3** and **React** components.

## Features

- **Write Once, Run Anywhere**: Neutral source compiled into native Vue and React subpaths with zero runtime overhead.
- **Universal Sizing Scale**: Standardized `size` props (`2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`) across components.
- **Design Token Integration**: Built-in integration with `@mission-platform/tokens` and design system CSS variables.
- **Storyblok CMS Ready**: Automatically generates Storyblok blok configurations and wrappers.

## Installation

```bash
pnpm add @mission-platform/components
```

## Usage

### Vue 3

Import native Vue 3 components from `@mission-platform/components/vue`:

```vue
<script setup lang="ts">
  import { ForgeButton, ForgeCard, ForgeInput } from '@mission-platform/components/vue';
  import { ref } from 'vue';

  const text = ref('');
</script>

<template>
  <ForgeCard>
    <ForgeInput
      v-model="text"
      label="Username"
      placeholder="Enter username"
    />
    <ForgeButton
      variant="primary"
      size="md"
    >
      Submit
    </ForgeButton>
  </ForgeCard>
</template>
```

### React

Import native React components from `@mission-platform/components/react`:

```tsx
import { ForgeButton, ForgeCard, ForgeInput } from '@mission-platform/components/react';
import { useState } from 'react';

export function UserForm() {
  const [text, setText] = useState('');

  return (
    <ForgeCard>
      <ForgeInput
        value={text}
        onChange={(e) => setText(e.target.value)}
        label="Username"
      />
      <ForgeButton
        variant="primary"
        size="md"
      >
        Submit
      </ForgeButton>
    </ForgeCard>
  );
}
```

### Framework-Neutral Components

When building higher-level write-once components using `@mission-platform/forge`, import directly from
`@mission-platform/components`:

```tsx
import { ForgeButton, ForgeCard } from '@mission-platform/components';
```

### Per-Component Imports (avoid pulling in heavy optional components)

The framework barrels (`.../react`, `.../vue`, `.../solid`, `.../svelte`) re-export **every**
component. Some components are deliberately heavy — e.g. `ForgeMonacoEditor` / `ForgeMarkdownInput`
pull in `monaco-editor` and its web workers. A bundler that cannot fully tree-shake the barrel (or
any React Server Components / SSR setup that evaluates the module graph eagerly) may drag those
chunks into the client bundle even when they are never rendered.

To import a single component in isolation, use its **per-component subpath** —
`@mission-platform/components/<framework>/<path-to-component>` — which resolves to just that
component's compiled module (types still come from the framework barrel, so named imports stay fully
typed):

```tsx
// Only ForgeBadge's chunk is loaded — Monaco & workers never enter the graph.
import { ForgeBadge } from '@mission-platform/components/react/atoms/forge-badge/forge-badge';
```

```vue
<script setup lang="ts">
  import { ForgeBadge } from '@mission-platform/components/vue/atoms/forge-badge/forge-badge';
</script>
```

The subpath mirrors the source layout (`atoms` / `molecules` / `organisms` / `templates` +
`<component>/<component>`). The wildcard is available for the `react`, `vue`, `solid`, and `svelte`
framework builds.

### Typed `ForgeNavbar` slots

`ForgeNavbar` exposes typed named slots so consumers get autocomplete and type-checking for its
regions:

- `brand` — start-region brand. A `string` gets the default typographic treatment; pass arbitrary
  content (an `MpChild`, e.g. a logo) via the `brand` slot.
- default (`children`) — the centred navigation items (also mirrored into the mobile drawer).
- `end` — trailing-region content such as auth actions or a theme toggle (also mirrored into the
  mobile drawer).

```tsx
import { ForgeNavbar } from '@mission-platform/components/react/organisms/forge-navbar/forge-navbar';

<ForgeNavbar
  brand="Mission"
  end={<AuthMenu />}
>
  <a href="/dashboard">Dashboard</a>
</ForgeNavbar>;
```

## Subpath Exports

- `@mission-platform/components`: Neutral source barrel export for write-once components.
- `@mission-platform/components/vue`: Compiled native Vue 3 components (barrel).
- `@mission-platform/components/react`: Compiled native React components (barrel).
- `@mission-platform/components/solid`: Compiled native Solid components (barrel).
- `@mission-platform/components/svelte`: Compiled native Svelte components (barrel).
- `@mission-platform/components/<framework>/<path>`: **Per-component** subpath for `react`, `vue`,
  `solid`, and `svelte` (e.g. `@mission-platform/components/react/atoms/forge-badge/forge-badge`).
  Imports only that component's chunk — see [Per-Component Imports](#per-component-imports-avoid-pulling-in-heavy-optional-components).
- `@mission-platform/components/forge-drawer`: Subpath for `ForgeDrawer` component.
- `@mission-platform/components/storyblok/vue`: Storyblok wrappers for Vue 3.
- `@mission-platform/components/storyblok/react`: Storyblok wrappers for React.
- `@mission-platform/components/styles/a11y`: Shared SCSS accessibility helpers (`src/styles/_a11y.scss`).
- `@mission-platform/components/styles`: Alias of `./styles/a11y` (kept for backwards compatibility).
- `@mission-platform/components/styles/scss`: Alias of `./styles/a11y`.

## Component Categories

- **Layout & Structure**: `ForgeStack`, `ForgeGrid`, `ForgeSeparator`, `ForgeMasonry`
- **Application Shell & Navigation**: `ForgeApplicationLayout`, `ForgeNavbar`, `ForgeDrawer`, `ForgePagination`, `ForgeTabs`,
  `ForgeMenu`, `ForgeMenubar`, `ForgeBreadcrumb`
- **Typography & Content**: `ForgeTypography`, `ForgeHero`, `ForgeQuote`, `ForgeList`
- **Forms & Inputs**: `ForgeButton`, `ForgeIconButton`, `ForgeInput`, `ForgeTextarea`, `ForgeCheckbox`, `ForgeRadio`,
  `ForgeSwitch`, `ForgeNumberStepper`, `ForgeSlider`, `ForgeDateInput`, `ForgeColorInput`
- **Data Display**: `ForgeTable`, `ForgeVirtualList`, `ForgeVirtualTable`, `ForgeVirtualTreeView`, `ForgeTreeView`,
  `ForgeTimeline`
- **Feedback & Overlays**: `ForgeAlertBanner`, `ForgeToast`, `ForgeSpinner`, `ForgeSkeleton`, `ForgeProgressBar`,
  `ForgeStatusIcon`
- **Media & Theme**: `ForgeResponsiveImage`, `ForgeResponsiveVideo`, `ForgeBackgroundVideo`, `ForgeDeviceMock`,
  `ForgeThemeToggle`, `ForgeThemeProvider`

For detailed component props and architecture guides, see [docs/index.md](docs/index.md).

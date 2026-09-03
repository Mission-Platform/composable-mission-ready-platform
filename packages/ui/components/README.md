# `@mission-platform/components`

Write-once, framework-neutral component library for Mission Platform. Components are authored once in JSX using
`@mission-platform/forge` and compiled into native **Vue 3**, **React**, **Svelte**, **Solid**, and **Web Component**
outputs.

## Features

- **Write Once, Run Anywhere**: Neutral source compiled into native Vue, React, Svelte, Solid, and Web Component builds
  with zero target-side source reparsing.
- **Universal Sizing Scale**: Standardized `size` props (`2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`) across components.

## Building

The aggregate package build is the default and produces the complete published tree: neutral components and declarations,
all five framework targets, and the configured Storyblok output and shared manifest.

```bash
pnpm --filter @mission-platform/components run build
```

Forge output is staged in a package-local ignored cache and promoted only after the build completes. Aggregate promotion
replaces the complete Forge-owned `dist` tree, so stale files cannot satisfy an export. A failed build removes its stage
and leaves the previous `dist` tree untouched.

### Targeted framework builds

Use a compatibility alias when only one framework target is needed:

```bash
pnpm --filter @mission-platform/components run build:vue
pnpm --filter @mission-platform/components run build:react
pnpm --filter @mission-platform/components run build:svelte
pnpm --filter @mission-platform/components run build:solid
pnpm --filter @mission-platform/components run build:web-components
pnpm --filter @mission-platform/components run build:forge
```

These aliases all call the shared Forge runner. A targeted promotion replaces only its framework tree and matching CMS
wrapper tree; it preserves neutral output, declarations, sibling framework trees, email output, and CMS sidecars already
in `dist`. This makes Vue-only followed by React-only (or the reverse) safe and non-destructive. The runner scopes the
Storyblok selector to the requested framework so the matching `./cms/storyblok/<framework>` wrapper is rebuilt and
promoted alongside the framework tree; it never removes a sibling wrapper (e.g. `./cms/storyblok/react`) that the
current build did not regenerate.

### Selective Storyblok builds

Use the existing artifact-mode tasks when only one Storyblok projection or the shared assets are needed:

```bash
pnpm --filter @mission-platform/components run build:vue
pnpm --filter @mission-platform/components run build:cms-storyblok:solid
pnpm --filter @mission-platform/components run build:cms-storyblok:assets
```

The Storyblok exports are available at `./cms/storyblok/react`, `./cms/storyblok/vue`, `./cms/storyblok/svelte`,
`./cms/storyblok/solid`, and `./cms/storyblok/web-components`; `./cms/storyblok/components.json` is the shared manifest.
Build the shared assets once before independently building framework wrappers. The aggregate `build` handles the complete
set together and does not erase the sidecars during framework promotion.

After building, verify that every manifest target resolves to a file in the published tree:

```bash
pnpm validate:exports
```

- **Design Token Integration**: Built-in integration with `@mission-platform/tokens` and design system CSS variables.
- **Storyblok CMS Ready**: Automatically generates Storyblok blok configurations and wrappers.

## Installation

```bash
pnpm add @mission-platform/components
```

## Usage

### Framework Selection

Pick your framework **once** — there are no per-framework subpaths. The bare `@mission-platform/components`
specifier resolves to the native build for whichever `mp:<framework>` export condition your toolchain
activates (`mp:vue`, `mp:react`, `mp:svelte`, `mp:solid`, `mp:web-component`):

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: { conditions: frameworkResolveConditions('mp:vue') },
});
```

```json
// tsconfig.json
{ "extends": "@mission-platform/typescript-config/framework-vue" }
```

Every import below is a **bare** package specifier — the same source works for any framework once the
condition is set.

### Vue 3

With `mp:vue` active, `@mission-platform/components` resolves to native Vue 3 components:

```vue
<script setup lang="ts">
  import { ForgeButton, ForgeCard, ForgeInput } from '@mission-platform/components';
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

With `mp:react` active, the very same specifier resolves to native React components:

```tsx
import { ForgeButton, ForgeCard, ForgeInput } from '@mission-platform/components';
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

### Svelte, Solid, and Web Components

The same bare import resolves to the native target when the matching condition is active:

| Target         | Export condition   | Native output                           |
| :------------- | :----------------- | :-------------------------------------- |
| Vue 3          | `mp:vue`           | Vue SFCs and declarations               |
| React          | `mp:react`         | React JSX and declarations              |
| Svelte         | `mp:svelte`        | Svelte components and declarations      |
| Solid          | `mp:solid`         | Solid JSX and declarations              |
| Web Components | `mp:web-component` | Custom-element classes and declarations |

Configure `resolve.conditions` with the condition for the active application; do not import a generated `dist/<target>`
directory directly. This keeps runtime externals, declarations, and auxiliary modules aligned with the selected target.

### Framework-Neutral Components

When building higher-level write-once components using `@mission-platform/forge`, import from the same
bare specifier with no `mp:*` condition active — you get the neutral forge source:

```tsx
import { ForgeButton, ForgeCard } from '@mission-platform/components';
```

`ForgeTypography` is provided by the dedicated `@mission-platform/typography` package:

```tsx
import { ForgeTypography } from '@mission-platform/typography';
```

### Per-Component Imports (avoid pulling in heavy optional components)

The package barrel re-exports **every** component. Some components are deliberately heavy — e.g.
`ForgeMonacoEditor` / `ForgeMarkdownInput` pull in `monaco-editor` and its web workers. A bundler that
cannot fully tree-shake the barrel (or any React Server Components / SSR setup that evaluates the
module graph eagerly) may drag those chunks into the client bundle even when they are never rendered.

To import a single component in isolation, use its **per-component subpath** —
`@mission-platform/components/<path-to-component>` — which is condition-aware just like the barrel and
resolves to just that component's compiled module for the active framework (types still come from the
barrel, so named imports stay fully typed):

```tsx
// Only ForgeBadge's chunk is loaded — Monaco & workers never enter the graph.
import { ForgeBadge } from '@mission-platform/components/atoms/forge-badge/forge-badge';
```

```vue
<script setup lang="ts">
  import { ForgeBadge } from '@mission-platform/components/atoms/forge-badge/forge-badge';
</script>
```

The subpath mirrors the source layout (`atoms` / `molecules` / `organisms` / `templates` +
`<component>/<component>`). It honours every `mp:*` framework condition, so the import stays identical
across Vue, React, Svelte, Solid, and Web Components.

### Typed `ForgeNavbar` slots

`ForgeNavbar` exposes typed named slots so consumers get autocomplete and type-checking for its
regions:

- `brand` — start-region brand. A `string` gets the default typographic treatment; pass arbitrary
  content (an `MpChild`, e.g. a logo) via the `brand` slot.
- default (`children`) — the centred navigation items (also mirrored into the mobile drawer).
- `end` — trailing-region content such as auth actions or a theme toggle (also mirrored into the
  mobile drawer).

```tsx
import { ForgeNavbar } from '@mission-platform/components/organisms/forge-navbar/forge-navbar';

<ForgeNavbar
  brand="Mission"
  end={<AuthMenu />}
>
  <a href="/dashboard">Dashboard</a>
</ForgeNavbar>;
```

## Subpath Exports

- `@mission-platform/components`: Barrel export. Resolves to the compiled native Vue 3, React, Svelte, Solid,
  or web-component build according to the active `mp:<framework>` condition, or to the neutral
  forge source when none is set.
- `@mission-platform/components/<path>`: **Per-component** subpath, condition-aware in exactly the same
  way (e.g. `@mission-platform/components/atoms/forge-badge/forge-badge`). Imports only that
  component's chunk — see [Per-Component Imports](#per-component-imports-avoid-pulling-in-heavy-optional-components).
- `@mission-platform/components/forge-drawer`: Subpath for `ForgeDrawer` component.
- `@mission-platform/components/cms/storyblok/vue`: Storyblok wrappers for Vue 3.
- `@mission-platform/components/cms/storyblok/react`: Storyblok wrappers for React.
- `@mission-platform/components/styles/a11y`: Shared SCSS accessibility helpers (`src/styles/_a11y.scss`).
- `@mission-platform/components/styles`: Alias of `./styles/a11y` (kept for backwards compatibility).
- `@mission-platform/components/styles/scss`: Alias of `./styles/a11y`.

## Component Categories

- **Foundation/content**: `ForgeAvatar`, `ForgeButton`, `ForgeButtonGroup`, `ForgeIconButton`, `ForgeQuote`,
  `ForgeSkeleton`, `ForgeSpinner`, `ForgeHero`
- **Navigation**: `ForgeBreadcrumb`, `ForgeMenu`, `ForgeMenuItem`, `ForgeMenubar`, `ForgeNavbar`, `ForgeNavbarItem`,
  `ForgePagination`, `ForgeTabs`, `ForgeVirtualTabs`
- **Data display**: `ForgeAccordion`, `ForgeList`, `ForgeTable`, `ForgeTreeView`, `ForgeVirtualList`,
  `ForgeVirtualTable`, `ForgeVirtualTreeView`, `ForgeVirtualLogViewer`, `ForgeTimeline`, `ForgeBadge`,
  `ForgeProgressBar`, `ForgeStatusIcon`
- **Layout**: `ForgeCard`, `ForgeGrid`, `ForgeMasonry`, `ForgeStack`, `ForgeSeparator`, `ForgeCollapse`
- **Media**: `ForgeBackgroundVideo`, `ForgeResponsiveImage`, `ForgeResponsiveVideo`, `ForgeCarousel`, `ForgeDeviceMock`
- **Communication**: `ForgeChatBubble`, `ForgeChatArea`
- **Utilities/deferred boundaries**: `ForgeInView`, `ForgeDrawer`, `ForgeWindowPopout`

Theme UI and theme contracts are provided by `@mission-platform/theme`:
`ForgeThemeToggle`, `ForgeThemeProvider`, `ForgeThemeComposer`, and the shared theme stores.

The complete residual inventory and the dependency-aware recommendations for future domain packages are documented in
[the decomposition map](docs/decomposition-map.md).

For detailed component props and architecture guides, see [docs/index.md](docs/index.md).

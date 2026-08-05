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

## Subpath Exports

- `@mission-platform/components`: Neutral source barrel export for write-once components.
- `@mission-platform/components/vue`: Compiled native Vue 3 components.
- `@mission-platform/components/react`: Compiled native React components.
- `@mission-platform/components/forge-drawer`: Subpath for `ForgeDrawer` component.
- `@mission-platform/components/storyblok/vue`: Storyblok wrappers for Vue 3.
- `@mission-platform/components/storyblok/react`: Storyblok wrappers for React.
- `@mission-platform/components/styles`: Shared CSS accessibility helpers (`src/styles/_a11y.scss`).

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

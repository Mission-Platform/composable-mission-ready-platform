# `@mission-platform/components`

Write-once, framework-neutral component library for Mission Platform. Components are authored once in JSX using `@mission-platform/forge` and compiled into native **Vue 3** and **React** components.

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
  import { BaseButton, BaseCard, BaseInput } from '@mission-platform/components/vue';
  import { ref } from 'vue';

  const text = ref('');
</script>

<template>
  <BaseCard>
    <BaseInput
      v-model="text"
      label="Username"
      placeholder="Enter username"
    />
    <BaseButton
      variant="primary"
      size="md"
    >
      Submit
    </BaseButton>
  </BaseCard>
</template>
```

### React

Import native React components from `@mission-platform/components/react`:

```tsx
import { BaseButton, BaseCard, BaseInput } from '@mission-platform/components/react';
import { useState } from 'react';

export function UserForm() {
  const [text, setText] = useState('');

  return (
    <BaseCard>
      <BaseInput
        value={text}
        onChange={(e) => setText(e.target.value)}
        label="Username"
      />
      <BaseButton
        variant="primary"
        size="md"
      >
        Submit
      </BaseButton>
    </BaseCard>
  );
}
```

### Framework-Neutral Components

When building higher-level write-once components using `@mission-platform/forge`, import directly from `@mission-platform/components`:

```tsx
import { BaseButton, BaseCard } from '@mission-platform/components';
```

## Subpath Exports

- `@mission-platform/components`: Neutral source barrel export for write-once components.
- `@mission-platform/components/vue`: Compiled native Vue 3 components.
- `@mission-platform/components/react`: Compiled native React components.
- `@mission-platform/components/base-drawer`: Subpath for `BaseDrawer` component.
- `@mission-platform/components/storyblok/vue`: Storyblok wrappers for Vue 3.
- `@mission-platform/components/storyblok/react`: Storyblok wrappers for React.
- `@mission-platform/components/styles`: Shared CSS accessibility helpers (`src/styles/a11y.scss`).

## Component Categories

- **Layout & Structure**: `BaseStack`, `BaseGrid`, `BaseSeparator`, `BaseMasonry`
- **Application Shell & Navigation**: `BaseApplicationLayout`, `BaseNavbar`, `BaseDrawer`, `BasePagination`, `BaseTabs`, `BaseMenu`, `BaseMenubar`, `BaseBreadcrumb`
- **Typography & Content**: `BaseTypography`, `BaseHero`, `BaseQuote`, `BaseList`
- **Forms & Inputs**: `BaseButton`, `BaseIconButton`, `BaseInput`, `BaseTextarea`, `BaseCheckbox`, `BaseRadio`, `BaseSwitch`, `BaseNumberStepper`, `BaseSlider`, `BaseDateInput`, `BaseColorInput`
- **Data Display**: `BaseTable`, `BaseVirtualList`, `BaseVirtualTable`, `BaseVirtualTreeView`, `BaseTreeView`, `BaseTimeline`
- **Feedback & Overlays**: `BaseAlertBanner`, `BaseToast`, `BaseSpinner`, `BaseSkeleton`, `BaseProgressBar`, `BaseStatusIcon`
- **Media & Theme**: `BaseResponsiveImage`, `BaseResponsiveVideo`, `BaseBackgroundVideo`, `BaseDeviceMock`, `BaseThemeToggle`, `BaseThemeProvider`

For detailed component props and architecture guides, see [docs/index.md](docs/index.md).

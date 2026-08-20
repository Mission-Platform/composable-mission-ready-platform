# `@mission-platform/typography`

Write-once typography components for Mission Platform, authored with
`@mission-platform/forge` and compiled into native Vue 3, React, Svelte, Solid,
and Web Component builds.

## Installation

```bash
pnpm add @mission-platform/typography
```

## Usage

The bare package entry resolves to the native framework build selected by the
active `mp:<framework>` export condition:

```tsx
import { ForgeTypography } from '@mission-platform/typography';

export function Heading() {
  return (
    <ForgeTypography
      as="h1"
      variant="h1"
      size="xl"
    >
      Mission Platform
    </ForgeTypography>
  );
}
```

`ForgeTypography` supports the shared `2xs`–`2xl` size scale and the existing
variant, alignment, weight, line-height, color, and truncation props. Load the
`@mission-platform/tokens` stylesheet in the application so the shared size
utility classes are available.

## Framework outputs

Configure the application with the matching `mp:vue`, `mp:react`,
`mp:svelte`, `mp:solid`, or `mp:web-component` condition. The package also
provides a framework-neutral Forge source when no framework condition is set.
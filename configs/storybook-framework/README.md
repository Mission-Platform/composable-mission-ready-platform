# @mission-platform/storybook-framework

Env-driven Storybook framework preset for the Mission Platform write-once
ecosystem. One `apps/storybook` renders the platform's stories on any supported
framework — the renderer, story globs, and shared Vite wiring are all selected
by a single `STORYBOOK_FRAMEWORK` env var (or explicit option), removing the duplication
that previously lived in separate `apps/storybook` / `apps/storybook-react`
configs.

## Usage

```ts
// apps/storybook/.storybook/main.ts
import { createStorybookConfig } from '@mission-platform/storybook-framework';

export default createStorybookConfig({
  packages: [
    'components',
    'icons',
    'd3',
    'rxjs',
    'forms',
    'layout',
    'map',
    'qr-code',
    'barcode',
    'code-scanner',
    'matrix-code',
    'breakpoints',
    'wysiwyg',
  ],
});
```

```bash
STORYBOOK_FRAMEWORK=vue   pnpm --filter @mission-platform/storybook build-storybook
STORYBOOK_FRAMEWORK=react pnpm --filter @mission-platform/storybook build-storybook
```

## What it wires

- **Renderer** — maps the framework to its Storybook package
  (`@storybook/vue3-vite`, `@storybook/react-vite`, …).
- **Story globs** — the app's own stories plus each requested package's, matching
  both the per-framework infix (`*.<framework>.stories.*`) and neutral
  (`*.stories.*`) files so write-once neutral stories render on the active
  framework.
- **Shared `viteFinal`** — the i18n plugin, the Vue JSX transform (Vue only),
  ES-module workers (Monaco), and inlined CSS (Chromatic story extraction). Pass
  your own `viteFinal` to extend it.

## API

| Export                      | Purpose                                                        |
| --------------------------- | -------------------------------------------------------------- |
| `createStorybookConfig`     | Build a unified `StorybookConfig` for the active framework.    |
| `resolveStorybookFramework` | Resolve the framework from `STORYBOOK_FRAMEWORK` / explicit arg. |
| `storyGlobs`                | Build the per-framework + neutral story globs.                 |
| `StorybookFramework`        | The supported framework union type.                            |

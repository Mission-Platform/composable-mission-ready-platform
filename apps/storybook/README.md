# @mission-platform/storybook

The primary component workbench for the Mission Platform monorepo's framework-neutral **Forge JSX** UI components, previewed across their native render targets (Vue 3, React, Solid, Svelte, and Web Components). Built with **Storybook**, **TypeScript**, and **Vite**, it provides a live, interactive environment for developing, testing, and documenting shared design system building blocks.

## Purpose & Scope

In accordance with the monorepo's architecture, reusable components live in `packages/`, while `apps/storybook` acts as the workbench where those components are rendered, documented, and tested in isolation.

It catalogues components and composables from:

- `@mission-platform/components`
- `@mission-platform/forms`
- `@mission-platform/layouts`
- `@mission-platform/icons`
- `@mission-platform/tokens`
- `@mission-platform/breakpoints`
- `@mission-platform/map`
- `@mission-platform/qr-code`
- `@mission-platform/barcode`
- `@mission-platform/code-scanner`
- `@mission-platform/i18n`
- `@mission-platform/d3`
- `@mission-platform/rxjs`

The same Storybook app renders the shared story inventory through the Vue, React, Solid, Svelte, and Web Components
renderers. Select a renderer with `STORYBOOK_FRAMEWORK`; there is no separate per-framework Storybook app.

## Key Features & Configuration

- **Multi-framework Storybook + Vite**: Uses the renderer selected by `STORYBOOK_FRAMEWORK` (`vue`, `react`, `solid`,
  `svelte`, or `web-component`) with HMR and fast compilation.
- **Local HTTPS Development**: Auto-generates local SSL certificates (`storybook:cert`) using `scripts/generate-dev-cert.ts`; the root renderer shortcuts use ports `6006`–`6010`.
- **Accessibility Testing (`@storybook/addon-a11y`)**: Integrates automated accessibility checks in the Storybook test runner and UI panel.
- **Theme Switching (`@storybook/addon-themes`)**: Allows toggling between `light` and `dark` themes using design tokens from `@mission-platform/tokens`.
- **Custom Viewports**: Configured with Mission Platform breakpoint thresholds (`2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`) in `.storybook/preview.ts`.
- **Internationalization**: Pre-configured with `@mission-platform/i18n` and `i18next-vue` in `.storybook/preview.ts`.
- **Visual Regression Testing**: Integrated with Chromatic for automated visual regression testing and PR previews.

## Quick Start

### Dev Server

Run a supported renderer locally. The root shortcuts use ports `6006`–`6010` respectively:

```bash
pnpm storybook:vue
pnpm storybook:react
pnpm storybook:solid
pnpm storybook:svelte
pnpm storybook:web-component
```

The direct workspace form is also available when choosing a renderer explicitly:

```bash
STORYBOOK_FRAMEWORK=vue pnpm --filter @mission-platform/storybook storybook
```

### Static Storybook Build

Build static Storybook output for a specific renderer. Each build is written to `apps/storybook/storybook-static/`:

```bash
pnpm build-storybook:vue
pnpm build-storybook:react
pnpm build-storybook:solid
pnpm build-storybook:svelte
pnpm build-storybook:web-component
```

### Runtime Validation

The runtime validation CLI is intended to be run from the repository root. It inventories source stories and apps,
builds the selected targets, and records browser results in a JSON manifest.

#### Inventory

```bash
pnpm run validate:inventory
pnpm run validate:inventory -- --json
```

The `--json` form prints the inventory while still writing the manifest to `.artifacts/runtime-validation/`.

#### Per-framework Storybook validation

Validate one Storybook renderer at a time:

```bash
pnpm run validate:framework -- --framework vue
pnpm run validate:framework -- --framework react
pnpm run validate:framework -- --framework solid
pnpm run validate:framework -- --framework svelte
pnpm run validate:framework -- --framework web-component
```

#### Per-app validation

Validate an app, optionally limiting the run to one route. Supported app names are `docs`, `my-care-notes`,
`service-monitor`, `storybook`, and `website` (or their full workspace names).

```bash
pnpm run validate:app -- --app docs
pnpm run validate:app -- --app @mission-platform/website --route /
```

#### Focused target reruns

Use `validate:target` to rerun only a selected Storybook story or app route:

```bash
pnpm run validate:target -- --framework react --package @mission-platform/components --story <story-id>
pnpm run validate:target -- --app docs --route /overview
```

#### Full validation

Run every supported Storybook renderer and the full app validation lane:

```bash
pnpm run validate:runtime
```

Pass `--app <name>` to the full command to limit its app portion while retaining the Storybook matrix, for example
`pnpm run validate:runtime -- --app website`.

#### Runtime artifacts

- `apps/storybook/storybook-static/` — the static Storybook build, including `index.json` used by runtime validation.
- `.artifacts/runtime-validation/runtime-validation.json` — the aggregate validation manifest.
- `.artifacts/runtime-validation/runtime-validation-<framework>.json` — the per-framework Storybook manifests.
- `.artifacts/runtime-validation/story/` — Storybook screenshots and browser logs by renderer.
- `.artifacts/runtime-validation/app/` — app build, startup, and route logs.
- `.artifacts/runtime-validation/manifest/` — Storybook build/index comparison logs.
- Each validated app's `dist/` directory — the local production build consumed by app validation.

### Interaction & Accessibility Tests

Run Storybook tests via Vitest browser mode and Playwright:

```bash
# Using Turborepo
pnpm exec turbo run test --filter=@mission-platform/storybook

# Direct execution
pnpm --filter @mission-platform/storybook test
```

## Available Scripts

| Command                                   | Description                                                        |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `pnpm storybook:cert`                     | Generates self-signed SSL certificate in `.storybook/certs/`       |
| `pnpm storybook`                          | Generates certs and launches the selected workspace Storybook      |
| `pnpm storybook:<framework>`              | Launches a root Storybook renderer shortcut on ports `6006`–`6010` |
| `pnpm build-storybook`                    | Compiles the selected workspace Storybook into `storybook-static/` |
| `pnpm build-storybook:<framework>`        | Builds one renderer into `storybook-static/`                       |
| `pnpm deploy`                             | Deploys static build to Chromatic for visual testing               |
| `pnpm test`                               | Runs interaction/a11y tests with Vitest + Playwright browser mode  |
| `pnpm dev`                                | Runs Vite dev server for the landing page                          |
| `pnpm build`                              | Type-checks (`vue-tsc`) and builds Vite application bundle         |
| `pnpm preview`                            | Serves built application locally                                   |
| `pnpm lint` / `pnpm lint:fix`             | Lints code with ESLint                                             |
| `pnpm lint:style` / `pnpm lint:style:fix` | Lints styles with Stylelint                                        |
| `pnpm format` / `pnpm format:write`       | Checks or fixes code formatting with Prettier                      |
| `pnpm i18n:extract`                       | Extracts i18n translation keys with `i18next-cli`                  |

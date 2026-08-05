# @mission-platform/storybook

The primary component workbench for the Mission Platform monorepo's framework-neutral **Forge JSX** UI components, previewed across their native render targets (Vue 3, React, Solid, Svelte, and Web Components). Built with **Storybook**, **TypeScript**, and **Vite**, it provides a live, interactive environment for developing, testing, and documenting shared design system building blocks.

## Purpose & Scope

In accordance with the monorepo's architecture, reusable components live in `packages/`, while `apps/storybook` acts as the workbench where those components are rendered, documented, and tested in isolation.

It catalogues Vue 3 components and composables from:

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

For React component stories, see [`@mission-platform/storybook-react`](../storybook-react).

## Key Features & Configuration

- **Storybook + Vue 3 + Vite**: Powered by `@storybook/vue3-vite` with HMR and fast compilation.
- **Local HTTPS Development**: Auto-generates local SSL certificates (`storybook:cert`) using `scripts/generate-dev-cert.ts` to run on `https://localhost:6006`.
- **Accessibility Testing (`@storybook/addon-a11y`)**: Integrates automated accessibility checks in the Storybook test runner and UI panel.
- **Theme Switching (`@storybook/addon-themes`)**: Allows toggling between `light` and `dark` themes using design tokens from `@mission-platform/tokens`.
- **Custom Viewports**: Configured with Mission Platform breakpoint thresholds (`2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`) in `.storybook/preview.ts`.
- **Internationalization**: Pre-configured with `@mission-platform/i18n` and `i18next-vue` in `.storybook/preview.ts`.
- **Visual Regression Testing**: Integrated with Chromatic for automated visual regression testing and PR previews.

## Quick Start

### Dev Server

Run Storybook on `https://localhost:6006`:

```bash
# Using Turborepo (recommended from monorepo root)
pnpm exec turbo run storybook --filter=@mission-platform/storybook

# Or via root script shortcut
pnpm storybook

# Or directly in the workspace
pnpm --filter @mission-platform/storybook storybook
```

### Static Storybook Build

Build static Storybook output for deployment:

```bash
# Using Turborepo
pnpm exec turbo run build-storybook --filter=@mission-platform/storybook

# Or directly in workspace
pnpm --filter @mission-platform/storybook build-storybook
```

### Interaction & Accessibility Tests

Run Storybook tests via Vitest browser mode and Playwright:

```bash
# Using Turborepo
pnpm exec turbo run test --filter=@mission-platform/storybook

# Direct execution
pnpm --filter @mission-platform/storybook test
```

## Available Scripts

| Command                                                    | Description                                                            |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `pnpm storybook:cert`                                      | Generates self-signed SSL certificate in `.storybook/certs/`           |
| `pnpm storybook`                                           | Generates certs and launches HTTPS Storybook dev server on port `6006` |
| `pnpm build-storybook`                                     | Compiles static Storybook build into `storybook-static/`               |
| `pnpm deploy`                                              | Deploys static build to Chromatic for visual testing                   |
| `pnpm test`                                                | Runs interaction/a11y tests with Vitest + Playwright browser mode      |
| `pnpm dev`                                                 | Runs Vite dev server for the landing page                              |
| `pnpm build`                                               | Type-checks (`vue-tsc`) and builds Vite application bundle             |
| `pnpm preview`                                             | Serves built application locally                                       |
| `pnpm lint` / `pnpm lint:fix`                              | Lints code with ESLint                                                 |
| `pnpm lint:style` / `pnpm lint:style:fix`                  | Lints styles with Stylelint                                            |
| `pnpm format` / `pnpm format:write`                        | Checks or fixes code formatting with Prettier                          |
| `pnpm i18n:extract` / `pnpm i18n:types` / `pnpm i18n:lint` | i18n translation key extraction and type checking                      |

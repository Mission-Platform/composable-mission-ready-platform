# @mission-platform/storybook-react

The component workbench for **React** builds of cross-framework Mission Platform components. Built with **Storybook**, **React**, **TypeScript**, and **Vite**, it provides an interactive environment for developing, testing, and documenting React adaptations of shared design system components.

It is the React counterpart of [`@mission-platform/storybook`](../storybook) (which catalogues the Vue 3 builds). Both apps consume the exact same write-once component sources in `packages/` — this app imports `./react` subpaths (e.g. `@mission-platform/components/react`), while the Vue app imports `./vue` subpaths.

## Core Features & Configuration

- **Storybook + React + Vite**: Powered by `@storybook/react-vite` and `@vitejs/plugin-react`.
- **Local HTTPS Development**: Auto-generates local SSL certificates (`storybook:cert`) using `scripts/generate-dev-cert.ts` and runs on `https://localhost:6007` (port `6007` avoids conflict with Vue Storybook's `6006`).
- **Cross-Framework Alignment**: Story structures and component categories (`Components/<Category>/<Name>`) align directly with the Vue Storybook catalogue.
- **Accessibility & Interaction Testing**: Configured with `@storybook/addon-a11y` and `@storybook/addon-vitest` with Playwright browser mode.
- **Theme Support**: Uses `@storybook/addon-themes` with `@mission-platform/tokens` for `light` and `dark` theme switching.

## Quick Start

### Dev Server

Run the React Storybook dev server on `https://localhost:6007`:

```bash
# Using Turborepo (recommended from monorepo root)
pnpm exec turbo run storybook --filter=@mission-platform/storybook-react

# Or via root script shortcut
pnpm storybook-react

# Or directly in workspace
pnpm --filter @mission-platform/storybook-react storybook
```

### Static Storybook Build

Build static Storybook output:

```bash
# Using Turborepo
pnpm exec turbo run build-storybook --filter=@mission-platform/storybook-react

# Direct execution
pnpm --filter @mission-platform/storybook-react build-storybook
```

### Tests

Run interaction and accessibility tests:

```bash
# Using Turborepo
pnpm exec turbo run test --filter=@mission-platform/storybook-react

# Direct execution
pnpm --filter @mission-platform/storybook-react test
```

## Available Scripts

| Command                                                    | Description                                                            |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `pnpm storybook:cert`                                      | Generates self-signed SSL certificate in `.storybook/certs/`           |
| `pnpm storybook`                                           | Generates certs and launches HTTPS Storybook dev server on port `6007` |
| `pnpm build-storybook`                                     | Compiles static Storybook build into `storybook-static/`               |
| `pnpm deploy`                                              | Publishes static build to Chromatic                                    |
| `pnpm test`                                                | Runs interaction/a11y tests with Vitest + Playwright browser mode      |
| `pnpm dev`                                                 | Runs Vite dev server for the landing page                              |
| `pnpm build`                                               | Type-checks (`tsc`) and builds Vite application bundle                 |
| `pnpm preview`                                             | Serves built application locally                                       |
| `pnpm lint` / `pnpm lint:fix`                              | Lints code with ESLint                                                 |
| `pnpm lint:style` / `pnpm lint:style:fix`                  | Lints SCSS/CSS styles with Stylelint                                   |
| `pnpm format` / `pnpm format:write`                        | Checks or fixes code formatting with Prettier                          |
| `pnpm i18n:extract` / `pnpm i18n:types` / `pnpm i18n:lint` | i18n translation key extraction and type checking                      |

## Chromatic Deployment

Publishing to Chromatic is executed via `pnpm deploy`. Replace the placeholder `--project-token` in `package.json` with the token provided by Chromatic for `@mission-platform/storybook-react`.

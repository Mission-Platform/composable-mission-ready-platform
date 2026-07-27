# @mission-platform/my-care-notes

An offline-first clinical care notes application built with **Vue 3**, **TypeScript**, and **Vite**. It provides healthcare professionals with a distraction-free, localized Markdown editor equipped with real-time spellchecking, grammar linting, offline PWA support, and static site prerendering.

## Architecture & Features

- **Vue 3 Composition API**: Built using Vue 3 `<script setup lang="ts">` and composables.
- **Monaco Editor Integration**: Features a customized Monaco Editor with specialized language support for clinical notes.
- **Real-Time Grammar & Spellchecking**: Integrates `@mission-platform/harper` (grammar/style checking) and `@mission-platform/hunspell` (medical dictionary & spellchecking).
- **SSR / SSG Compatibility**: Custom Vite plugin (`ssrStubBrowserOnlyEditorPlugin`) stubs Monaco Editor during static site generation (`vite-ssg`), preventing DOM/browser API failures during prerendering.
- **Multilingual Support (12 Locales)**: Internationalized via `@mission-platform/i18n` with support for English (`en`), Arabic (`ar`), German (`de`), Spanish (`es`), French (`fr`), Hebrew (`he`), Italian (`it`), Japanese (`ja`), Korean (`ko`), Dutch (`nl`), and Chinese (`zh`).
- **Progressive Web App (PWA)**: Configured with `vite-plugin-pwa` for offline capability, Web Worker caching, and WebAssembly asset caching.
- **Cloudflare Workers Deployment**: Hosted on Cloudflare Workers Assets via `@mission-platform/base-spa`.

## Design System & Monorepo Packages

The application composes building blocks from across the `packages/` directory:

| Package                         | Purpose                                                |
| ------------------------------- | ------------------------------------------------------ |
| `@mission-platform/components`  | UI component library (buttons, modals, form controls)  |
| `@mission-platform/forms`       | Form state management and schema validation            |
| `@mission-platform/harper`      | Client-side grammar and prose linting                  |
| `@mission-platform/hunspell`    | Client-side spellchecking with medical dictionary      |
| `@mission-platform/i18n`        | Locale loading, translation keys, and locale switching |
| `@mission-platform/layouts`     | Page shells and responsive layouts                     |
| `@mission-platform/tokens`      | Design tokens (colors, typography, spacing)            |
| `@mission-platform/breakpoints` | Responsive breakpoint utilities                        |
| `@mission-platform/seo`         | Meta tag generation and sitemap configuration          |

## Quick Start

### Development Server

From the monorepo root:

```bash
# Start the Vite dev server via Turborepo
pnpm exec turbo run dev --filter=@mission-platform/my-care-notes

# Or run directly using pnpm workspace filtering
pnpm --filter @mission-platform/my-care-notes dev
```

### Local Cloudflare Preview

To run locally in a simulated Cloudflare Workers environment with Wrangler:

```bash
# Preview against staging environment configuration
pnpm --filter @mission-platform/my-care-notes cf:dev

# Preview against production environment configuration
pnpm --filter @mission-platform/my-care-notes cf:dev:production
```

## Build & Deployment

### Static Site Generation (SSG) & SPA Build

```bash
# Standard SSG build (vue-tsc + vite-ssg)
pnpm exec turbo run build --filter=@mission-platform/my-care-notes

# SPA-only build (vue-tsc + vite build)
pnpm --filter @mission-platform/my-care-notes build:spa

# Preview static build output
pnpm --filter @mission-platform/my-care-notes preview
```

### Cloudflare Workers Deployment

Deployment uses `wrangler.jsonc` which points to `@mission-platform/base-spa` as its worker entrypoint and serves the `./dist/` directory via the `ASSETS` binding.

```bash
# Deploy to staging environment (staging-care-notes.mission-platform.dev)
pnpm --filter @mission-platform/my-care-notes deploy:staging

# Deploy to production environment (care-notes.mission-platform.com)
pnpm --filter @mission-platform/my-care-notes deploy

# Upload new worker versions without changing active route
pnpm --filter @mission-platform/my-care-notes version:staging
pnpm --filter @mission-platform/my-care-notes version
```

## Configuration & Environment

Configuration is managed through `wrangler.jsonc` and `vite.config.ts`:

| Environment    | Host / Route                              | Wrangler Environment |
| -------------- | ----------------------------------------- | -------------------- |
| **Production** | `care-notes.mission-platform.com`         | `production`         |
| **Staging**    | `staging-care-notes.mission-platform.dev` | `staging`            |

## Available Scripts

| Command                                   | Description                                                |
| ----------------------------------------- | ---------------------------------------------------------- |
| `pnpm dev`                                | Starts Vite local dev server                               |
| `pnpm build`                              | Type-checks code (`vue-tsc`) and executes `vite-ssg build` |
| `pnpm build:spa`                          | Type-checks code and executes standard `vite build`        |
| `pnpm preview`                            | Serves local static build output                           |
| `pnpm test`                               | Runs unit and component tests with Vitest                  |
| `pnpm lint` / `pnpm lint:fix`             | Lints JavaScript/TypeScript code using ESLint              |
| `pnpm lint:style` / `pnpm lint:style:fix` | Lints Vue/SCSS/CSS styles using Stylelint                  |
| `pnpm format` / `pnpm format:write`       | Validates or applies formatting with Prettier              |
| `pnpm i18n:extract`                       | Extracts i18n translation strings                          |
| `pnpm i18n:types`                         | Generates TypeScript definitions for i18n keys             |
| `pnpm i18n:lint`                          | Lints i18n translation files                               |
| `pnpm cf:dev` / `pnpm cf:dev:production`  | Runs local Wrangler dev server for Cloudflare              |
| `pnpm deploy` / `pnpm deploy:staging`     | Deploys worker and assets to Cloudflare                    |

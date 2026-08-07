# @mission-platform/website

The main marketing and showcase website for **Mission Platform** — a composable, mission-ready Vue 3 platform. Built
with **Vue 3**, **TypeScript**, **Vite-SSG**, and **Cloudflare Workers**, it demonstrates how shared platform packages
are composed into a production application.

## Architecture & Features

- **Vue 3 Composition API**: Built using Vue 3 `<script setup lang="ts">` and composables.
- **Static Site Generation (SSG)**: Uses `vite-ssg` to prerender routes for fast initial page load and search engine
  indexing.
- **Multilingual Support (11 Locales)**: Configured with `@mission-platform/i18n` supporting English (`en`), Spanish
  (`es`), French (`fr`), Dutch (`nl`), Italian (`it`), German (`de`), Korean (`ko`), Japanese (`ja`), Chinese (`zh`),
  Arabic (`ar`), and Hebrew (`he`).
- **Automated SEO Engine**: Generates locale-aware `sitemap.xml` and `robots.txt` at build time via
  `@mission-platform/vite-plugin-seo`.
- **Critical CSS Inlining**: Integrates `beasties` (via `vite-ssg` configuration) to inline critical styling and defer
  non-critical CSS.
- **Cloudflare Workers Deployment**: Hosted on Cloudflare Workers Assets via `@mission-platform/forge-spa`.

## Monorepo Packages Used

| Package                         | Purpose                                     |
| ------------------------------- | ------------------------------------------- |
| `@mission-platform/components`  | Shared UI components                        |
| `@mission-platform/layouts`     | Page layouts and shells                     |
| `@mission-platform/i18n`        | Locale strings and translation management   |
| `@mission-platform/icons`       | Platform SVG icon set                       |
| `@mission-platform/tokens`      | Design tokens and theme CSS                 |
| `@mission-platform/breakpoints` | Responsive breakpoint logic                 |
| `@mission-platform/seo`         | SEO metadata and structured JSON-LD schemas |
| `@mission-platform/qr-code`     | QR code generation components               |
| `@mission-platform/hunspell`    | Spellchecking utilities                     |

## Quick Start

### Development Server

```bash
# Using Turborepo (recommended)
pnpm exec turbo run dev --filter=@mission-platform/website

# Or via workspace filter
pnpm --filter @mission-platform/website dev
```

### Local Cloudflare Workers Preview

```bash
# Preview against staging environment configuration
pnpm --filter @mission-platform/website cf:dev

# Preview against production environment configuration
pnpm --filter @mission-platform/website cf:dev:production
```

## Build & Deployment

### SSG & SPA Build Commands

```bash
# Standard SSG build (vue-tsc + vite-ssg)
pnpm exec turbo run build --filter=@mission-platform/website

# SPA build (vue-tsc + vite build)
pnpm --filter @mission-platform/website build:spa

# Preview static build output locally
pnpm --filter @mission-platform/website preview
```

### Cloudflare Deployment

Deployment uses `wrangler.jsonc` pointing to `@mission-platform/forge-spa` as its worker entrypoint and serving
`./dist/` via Cloudflare Workers Assets.

```bash
# Deploy to staging environment (staging.mission-platform.dev)
pnpm --filter @mission-platform/website deploy:staging

# Deploy to production environment (mission-platform.com)
pnpm --filter @mission-platform/website deploy

# Upload new worker version without modifying live traffic routes
pnpm --filter @mission-platform/website version:staging
pnpm --filter @mission-platform/website version
```

## Configuration & Environments

Configuration is managed via `wrangler.jsonc` and `vite.config.ts`:

| Environment    | Host / Route                   | Wrangler Environment |
| -------------- | ------------------------------ | -------------------- |
| **Production** | `mission-platform.com`         | `production`         |
| **Staging**    | `staging.mission-platform.dev` | `staging`            |

## Available Scripts

| Command                                                    | Description                                            |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| `pnpm dev`                                                 | Starts local Vite dev server                           |
| `pnpm build`                                               | Type-checks code (`vue-tsc`) and runs `vite-ssg build` |
| `pnpm build:spa`                                           | Type-checks code and runs standard `vite build`        |
| `pnpm preview`                                             | Serves local static build output                       |
| `pnpm test`                                                | Runs unit tests with Vitest                            |
| `pnpm lint` / `pnpm lint:fix`                              | Lints code using ESLint                                |
| `pnpm lint:style` / `pnpm lint:style:fix`                  | Lints Vue/SCSS/CSS styles using Stylelint              |
| `pnpm format` / `pnpm format:write`                        | Validates or updates code formatting with Prettier     |
| `pnpm i18n:extract` / `pnpm i18n:types` / `pnpm i18n:lint` | i18n extraction, type generation, and validation       |
| `pnpm cf:dev` / `pnpm cf:dev:production`                   | Runs local Wrangler dev server                         |
| `pnpm deploy` / `pnpm deploy:staging`                      | Deploys worker and assets to Cloudflare                |

# @mission-platform/docs

The documentation site for **Mission Platform**. It renders the canonical Markdown documents that live in the repository's top-level `docs/` directory as a browsable, full-text–searchable website.

Built with **Vue 3** (`<script setup lang="ts">`), **TypeScript**, **Vite**, **`vite-ssg`** (static-site generation), and the shared platform packages (`@mission-platform/components`, `@mission-platform/layouts`, `@mission-platform/seo`, `@mission-platform/tokens`). The application shell is the shared `ForgeApplicationLayout` and the header search field is the shared `ForgeSearchInput`, so the app composes existing platform components rather than bespoke ones.

## How it works

- **Single source of truth**: every file under `docs/**/*.md` is imported at build time via `import.meta.glob`, so the site always mirrors the repository documentation with no copy step.
- **Grouped navigation**: the sidebar groups documents (Getting Started, Architecture, Authoring, Build & Tooling, Quality, Troubleshooting, Reference) using the curated ordering in `src/documentation.ts`. Any document not explicitly listed is appended under an "Additional" group so nothing is hidden.
- **Rendering**: Markdown is converted with `marked`; code blocks are syntax-highlighted with a curated `highlight.js` language set; headings receive anchor ids and feed a per-page table of contents; relative `.md` links are rewritten to in-app routes and handled by the SPA router.
- **Indexed search**: an inverted tf-idf index is built once (at module load) from the same build-time `documents` manifest, so search needs no extra fetch. The header `ForgeSearchInput` drives the `/search?q=…` route (query in the URL, so results are shareable and reload-safe); each hit deep-links to the best-matching heading with a contextual excerpt. See `src/search.ts`.
- **Static-site generation (SSG)**: `pnpm build` runs `vite-ssg`, which prerenders one static `dist/<slug>/index.html` per documentation page (the default document is also emitted at the site root `dist/index.html`). Each page is hydrated into the full SPA on load, so client-side navigation and search continue to work. The prerender route list is derived from the `docs/` directory at build time in `vite.config.ts` (`ssgOptions.includedRoutes`). Use `pnpm build:spa` for a client-only build.
- **SEO**: SEO metadata is managed through the unified `@mission-platform/seo` surface (`useSeo`) so the same definitions are baked into the prerendered HTML **and** kept in sync during client navigation. `src/main.ts` emits the site-wide baseline (title template, description, theme colour) plus the `WebSite` + `Organization` JSON-LD graph; `src/views/doc-view.vue` emits each page's own title/description/canonical, Open Graph / Twitter Card tags, and a `WebPage` + `BreadcrumbList` JSON-LD pair linked into the site graph by stable `@id`. Site-wide constants and canonical-URL logic live in `src/seo-site.ts`.
- **`robots.txt` + `sitemap.xml`**: generated at build time by `@mission-platform/vite-plugin-seo` (wired in `vite.config.ts`) from the same document inventory, and copied into `dist/`. The query-driven `/search` route is excluded from the sitemap and marked `noindex`.

## Project structure

| Path                              | Purpose                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| `src/documentation.ts`            | Loads the `docs/` Markdown and builds the navigation manifest    |
| `src/composables/use-markdown.ts` | Renders Markdown to HTML (highlighting, anchors, link rewrite)   |
| `src/search.ts`                   | Builds the tf-idf inverted index and exposes the `search()` API  |
| `src/views/doc-view.vue`          | Renders a single document plus its table of contents             |
| `src/views/search-view.vue`       | Renders ranked search results (reuses `ForgeCard`/`ForgeBadge`)  |
| `src/components/app-sidebar.vue`  | Grouped documentation navigation                                 |
| `src/router/index.ts`             | Shared router options (`routerOptions`) for SPA + `vite-ssg`     |
| `src/seo-site.ts`                 | Site-wide SEO constants and canonical-URL helpers                |
| `src/main.ts`                     | `vite-ssg` entry; site-wide page meta + `WebSite`/`Organization` |
| `src/App.vue`                     | Shell via `ForgeApplicationLayout` (header search + sidebar)     |

## Available scripts

| Command                                   | Description                                                          |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `pnpm dev`                                | Start the local Vite dev server                                      |
| `pnpm build`                              | Type-check (`vue-tsc`) and prerender the static site with `vite-ssg` |
| `pnpm build:spa`                          | Type-check and build a client-only (non-prerendered) SPA             |
| `pnpm preview`                            | Preview the production build locally                                 |
| `pnpm test`                               | Run unit tests with Vitest                                           |
| `pnpm lint` / `pnpm lint:fix`             | Lint with ESLint                                                     |
| `pnpm lint:style` / `pnpm lint:style:fix` | Lint Vue/SCSS/CSS styles with Stylelint                              |
| `pnpm format` / `pnpm format:write`       | Check or apply Prettier formatting                                   |

Run any of these through Turborepo with a filter, e.g.:

```bash
pnpm exec turbo run build --filter @mission-platform/docs
```

# @mission-platform/docs

The documentation site for **Mission Platform**. It renders the canonical Markdown documents that live in the repository's top-level `docs/` directory and each publishable workspace package's `docs/` directory as a browsable, full-text–searchable website.

Built with **TypeScript**, **Vite**, a small Web Components application shell, and the shared platform packages (`@mission-platform/components`, `@mission-platform/layouts`, `@mission-platform/seo`, `@mission-platform/tokens`). The application shell is the shared `ForgeApplicationLayout` and the header search field is the shared `ForgeSearchInput`, so the app composes existing platform components rather than bespoke ones.

## How it works

- **Two documentation ownership tiers**: root `docs/` contains project-wide guidance and indexes; package-specific usage, development, and API pages live beside their owner under `<workspace>/<package>/docs/`. Package routes are namespaced by workspace path (for example, `/packages/barcode/index`).
- **Direct multi-root source of truth**: every English and translated Markdown file under the approved roots is imported at build time via `import.meta.glob`; the site never stages package pages into root `docs/`. Node route inventory and prerendering discover the same roots from workspace manifests.
- **Grouped navigation**: the sidebar preserves curated project groups (Getting Started, Architecture, Authoring, Build & Tooling, Quality, Troubleshooting, Reference) and adds one section per owning package for namespaced pages. Any project document not explicitly listed is appended under an "Additional" group so nothing is hidden.
- **Rendering**: Markdown is converted with `marked`; code blocks are syntax-highlighted with a curated `highlight.js` language set; headings receive anchor ids and feed a per-page table of contents; relative `.md` links are rewritten to in-app routes and handled by the SPA router.
- **Indexed search**: an inverted tf-idf index is built once (at module load) from the same build-time `documents` manifest, so search needs no extra fetch. The header `ForgeSearchInput` drives the `/search?q=…` route (query in the URL, so results are shareable and reload-safe); each hit deep-links to the best-matching heading with a contextual excerpt. See `src/search.ts`.
- **Static-site generation (SSG)**: `pnpm build` runs Vite followed by the package-local prerender script, which emits one static `dist/<slug>/index.html` per project and package documentation page (the default document is also emitted at the site root `dist/index.html`). Each page is hydrated into the full SPA on load, so client-side navigation and search continue to work. The prerender route list is derived from the shared multi-root inventory at build time in `vite.config.ts` and `scripts/prerender.ts`. Use `pnpm build:spa` for a client-only build.
- **SEO**: SEO metadata is managed through the unified `@mission-platform/seo` surface so the same definitions are baked into the prerendered HTML **and** kept in sync during client navigation. `src/main.ts` emits the site-wide baseline; `src/app/metadata.ts` applies each page's title/description/canonical metadata, and `src/ssg/seo.ts` emits the Open Graph / Twitter Card tags plus a `WebPage` + `BreadcrumbList` JSON-LD pair linked into the site graph by stable `@id`. Site-wide constants and canonical-URL logic live in `src/ssg/site-constants.ts`.
- **`robots.txt` + `sitemap.xml`**: generated at build time by `@mission-platform/vite-plugin-seo` (wired in `vite.config.ts`) from the same document inventory, and copied into `dist/`. The query-driven `/search` route is excluded from the sitemap and marked `noindex`.

## Project structure

| Path                              | Purpose                                                           |
| --------------------------------- | ----------------------------------------------------------------- |
| `src/documentation.ts`            | Loads project/package Markdown and builds the navigation manifest |
| `src/documentation-sources.ts`    | Shared ownership, package namespace, and source-path contract     |
| `src/composables/use-markdown.ts` | Renders Markdown to HTML (highlighting, anchors, link rewrite)    |
| `src/search.ts`                   | Builds the tf-idf inverted index and exposes the `search()` API   |
| `src/app/document-view.ts`        | Renders a single document plus its table of contents              |
| `src/app/search-view.ts`          | Renders ranked search results (reuses `ForgeCard`/`ForgeBadge`)   |
| `src/app/sidebar.ts`              | Grouped documentation navigation                                  |
| `src/app/router.ts`               | Shared router records for SPA + static prerender                  |
| `src/ssg/site-constants.ts`       | Site-wide SEO constants and canonical-URL helpers                 |
| `src/route-inventory.ts`          | Discovers roots and supplies routes/sitemap input                 |
| `src/main.ts`                     | Web Components entry; site-wide route metadata                    |
| `src/app/app-shell.ts`            | Shell via `ForgeApplicationLayout` (header search + sidebar)      |

## Available scripts

| Command                                   | Description                                                     |
| ----------------------------------------- | --------------------------------------------------------------- |
| `pnpm dev`                                | Start the local Vite dev server                                 |
| `pnpm build`                              | Type-check, build the SPA bundle, and prerender the static site |
| `pnpm build:spa`                          | Type-check and build a client-only (non-prerendered) SPA        |
| `pnpm preview`                            | Preview the production build locally                            |
| `pnpm test`                               | Run unit tests with Vitest                                      |
| `pnpm lint` / `pnpm lint:fix`             | Lint with ESLint                                                |
| `pnpm lint:style` / `pnpm lint:style:fix` | Lint Vue/SCSS/CSS styles with Stylelint                         |
| `pnpm format` / `pnpm format:write`       | Check or apply Prettier formatting                              |

Run any of these through Turborepo with a filter, e.g.:

```bash
pnpm exec turbo run build --filter @mission-platform/docs
```

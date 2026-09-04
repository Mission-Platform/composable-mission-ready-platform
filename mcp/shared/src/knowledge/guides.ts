/**
 * Curated, task-focused guidance for the Mission Platform workflows this server
 * assists with. The text is distilled from the repository's own documentation
 * (`docs/`, `AGENTS.md`, `CONTRIBUTING.md`) and the observed conventions of the
 * existing workspaces, so the advice matches how the monorepo actually works.
 */

export type GuideId =
  | "overview"
  | "conventions"
  | "component-usage"
  | "atomic-component-design"
  | "composable-authoring"
  | "store-authoring"
  | "util-authoring"
  | "package-creation"
  | "package-development"
  | "app-creation"
  | "app-development"
  | "worker-creation"
  | "worker-development"
  | "framework-vue"
  | "framework-react"
  | "framework-solid"
  | "framework-web-components"
  | "external-setup"
  | "design-token-overrides"
  | "fws-authoring"
  | "fws-security"
  | "fws-artifact-verification"
  | "fws-forensics";

export interface Guide {
  id: GuideId;
  title: string;
  body: string;
}

const OVERVIEW = `# Mission Platform — Overview

The Mission Platform is a **VueJS 3 monorepo** managed with **pnpm workspaces** and
orchestrated by **Turborepo**. It follows a composable, package-driven architecture:
reusable building blocks live in \`packages/\` and deployable applications are
assembled from those blocks in \`apps/\`.

## Workspace groups
- \`apps/\` — deployable applications (always \`"private": true\`).
- \`packages/\` — reusable, independently versioned building blocks.
- \`packages/edge/workers/\` — Cloudflare Workers (always \`"private": true\`).
- \`packages/tooling/vite/\` — Vite build plugins consumed by apps.
- \`packages/tooling/configs/\` — shared lint/format/build tooling (never imports from apps/packages).
- \`scripts/\` — repository-wide tooling scripts.

## Golden rules
1. **Dependency direction is one-way:** \`apps/\` → \`packages/\` and domain packages depend only on lower-level shared contracts.
   Code in \`packages/\`, \`packages/tooling/configs/\`, \`packages/tooling/vite/\`, and \`packages/edge/workers/\` must **never** import from \`apps/\`.
2. **TypeScript everywhere:** new files are \`.ts\`, \`.tsx\`, or \`.vue\` (\`<script setup lang="ts">\`). No plain \`.js\`/\`.jsx\` source.
3. **Isolation of concerns:** new UI/composables/utilities/tokens belong in \`packages/\`, not embedded in an app. New shared tooling belongs in \`packages/tooling/configs/\`.
4. **Storybook as workbench:** when adding/changing components in \`packages/\`, add or update stories in \`apps/storybook\`.
5. **Changesets:** every change to a published workspace needs a changeset (\`pnpm changeset\`).`;

const CONVENTIONS = `# Conventions & Naming

## Naming
- Folder per member: \`<group>/<name>/\` (kebab-case folder names).
- Package name is scoped: \`@mission-platform/<name>\`
  (vite plugins use \`@mission-platform/vite-plugin-<name>\`).
- Apps and workers are \`"private": true\` and never published.

## Dependency protocol
- Reference other workspace members with the \`workspace:*\` protocol.
- Pin third-party versions through the pnpm **catalog** (\`catalog:\`, \`catalog:vue\`,
  \`catalog:testing\`, \`catalog:cloudflare\`, …) defined in \`pnpm-workspace.yaml\` — do not hardcode versions.

## Shared tooling (re-export the base configs)
- \`eslint.config.js\`  → \`import baseConfig from '@mission-platform/eslint-config'; export default [...baseConfig];\`
- \`prettier.config.js\` → \`import baseConfig from '@mission-platform/prettier-config'; export default { ...baseConfig };\`
- \`stylelint.config.mjs\` → \`import baseConfig from '@mission-platform/stylelint-config'; export default { ...baseConfig };\`

## TypeScript project layout (packages)
- \`tsconfig.json\` references \`tsconfig.build.json\`, \`tsconfig.node.json\`, \`tsconfig.test.json\`.
- Each extends a base from \`@mission-platform/typescript-config\` (\`library\`, \`node\`, \`test\`, \`app\`).

## Turborepo
- Per-member \`turbo.json\` uses \`"extends": ["//"]\` and only adds member-specific task wiring.
- Common tasks: \`build\`, \`dev\`, \`test\`, \`lint\`, \`lint:style\`, \`format\`, \`storybook\`.
- Run from the root: \`pnpm build\`, \`pnpm test\`, \`pnpm lint\`, or scope with
  \`pnpm exec turbo run <task> --filter @mission-platform/<name>\`.`;

const COMPONENT_USAGE = `# Using Components

Components live in \`@mission-platform/components\`. They are **write-once**: authored
in the neutral JSX dialect (\`@mission-platform/forge-jsx\`) and compiled to **both Vue 3 and React**.

## Discover
- Use the \`list_components\` tool to enumerate every component and its exports.
- Use the \`get_component_usage\` tool for a specific component to see its props
  interface, doc comment, available stories, and import snippets.

## Import
There is **one** specifier for every framework. The framework build is selected
**once per consumer** through custom export conditions, never by the specifier:

- Vite: \`resolve.conditions\` — use \`defineFrameworkAppConfig({ framework: 'vue' })\`
  or \`frameworkResolveConditions('react')\` from \`@mission-platform/vite-config\`.
- TypeScript: \`customConditions\` — extend
  \`@mission-platform/typescript-config/tsconfig.framework-<name>.json\`.
- Vitest: pass \`framework\` to \`defineVitestConfig\` (or set \`resolve.conditions\`).

The conditions are \`mp:vue\`, \`mp:react\`, \`mp:solid\` and
\`mp:web-component\`. Framework subpaths such as \`@mission-platform/components/vue\`
do **not** exist — importing one is an error.

\`\`\`ts
// Any framework — resolves to the build your conditions select.
import { ForgeButton } from '@mission-platform/components';
// Per-component deep import (only this component's chunk); still no framework segment.
import { ForgeBadge } from '@mission-platform/components/atoms/forge-badge/forge-badge';
\`\`\`

## Use (Vue)
\`\`\`vue
<script setup lang="ts">
import { ForgeButton } from '@mission-platform/components';
</script>

<template>
  <ForgeButton variant="primary" size="md" @click="onClick">Save</ForgeButton>
</template>
\`\`\`

## Notes
- Props follow a canonical \`2xs → 2xl\` size scale and named design-token spacing.
- Styling ships with the component via co-located CSS Modules (\`@layer mp.components\`).
- Prefer existing components over re-implementing UI. If a component is missing,
  add it to \`packages/ui/components\` (see the package-development guide) and add a story.`;

const ATOMIC_COMPONENT_DESIGN = `# Atomic Component Design

Components in \`@mission-platform/components\` (and other component packages) are
organised by **atomic design**. Each component lives in its own folder under a
level directory, is authored **write-once** in the neutral JSX dialect
(\`@mission-platform/forge-jsx\`), and ships with a co-located story and test.

See also the repository doc: \`docs/atomic-component-design.md\`.

## Levels

| Level | Folder | Role |
| --- | --- | --- |
| **Atom** | \`src/components/atoms/<comp>/\` | Smallest UI primitive (button, input, badge, spinner). No business layout. |
| **Molecule** | \`src/components/molecules/<comp>/\` | Small composition of atoms (field set, search input, card header). |
| **Organism** | \`src/components/organisms/<comp>/\` | Distinct section of UI (navbar, table, dialog, form wizard). |
| **Template** | \`src/components/templates/<comp>/\` | Page-level layout shell with slots/regions (hero, app shell). |
| **Page** | \`src/components/pages/<comp>/\` | Page-scaffold component wired for a concrete route/screen composition. |

Choose the **lowest** level that still matches the component's responsibility.
Promote only when composition or layout complexity genuinely grows.

## Folder layout

\`\`\`
src/components/
├── atoms/
│   └── forge-input/
│       ├── forge-input.tsx          # write-once forge component
│       ├── forge-input.stories.tsx  # Storybook story
│       ├── forge-input.spec.ts      # Vitest unit/SSR parity test
│       ├── forge-input.module.scss  # optional co-located CSS module
│       └── index.ts                # re-exports public symbols
├── molecules/
├── organisms/
├── templates/
├── pages/
└── index.ts                        # package barrel — re-exports each via ./<level>/<comp>
\`\`\`

## Story title convention

Storybook titles follow:

\`\`\`
<Level>/<FunctionalArea>/<Component>
\`\`\`

Examples:
- \`Atoms/Forms/ForgeInput\`
- \`Atoms/Feedback/ForgeSpinner\`
- \`Molecules/Navigation/ForgeBreadcrumb\`
- \`Organisms/Data/ForgeVirtualTable\`
- \`Templates/Marketing/ForgeHero\`
- \`Pages/Settings/AccountSettingsPage\`

\`Level\` is the capitalised plural of the atomic folder (\`Atoms\`, \`Pages\`).
\`FunctionalArea\` groups related UI (Forms, Data, Navigation, Feedback, Display, …).
\`Component\` is the PascalCase component name.

## Authoring rules

1. **Write-once:** implement with \`@mission-platform/forge-jsx\` (\`h\`, \`MpElement\`, neutral hooks). Never hand-write separate Vue/React sources.
   Props interfaces inherit nothing — there is no shared props base. Declare exactly what the component accepts, adding
   \`children?: MpChild | readonly MpChild[]\` or \`className?: ClassValue\` only when it uses them; \`key\` and \`slot\` come free
   from \`MpReservedProperties\`.
2. **Barrel:** export the component and its \`*Properties\` type from the folder \`index.ts\`, and re-export from \`src/components/index.ts\` via \`./<level>/<comp>\`.
3. **Tests required:** every component ships a co-located \`<comp>.spec.ts\` (minimal passing skeleton is fine to start).
4. **Stories required:** co-located \`<comp>.stories.tsx\` with the atomic title convention above.
5. **Scaffolding:** use the \`scaffold_component\` tool (\`level\`, \`area\`, dry-run then \`apply: true\`).

## Discovery

- \`list_components\` returns each component's \`level\` (derived from its folder path).
- \`get_component_usage\` shows props, stories, and Vue/React import snippets.`;

const COMPOSABLE_AUTHORING = `# Authoring Composables

Composables hold reusable reactive logic. They are **write-once** against
\`@mission-platform/forge-jsx\` neutral hooks so the same source compiles to every
supported framework.

See also: \`docs/composable-authoring.md\`.

## Layout

\`\`\`
src/composables/
├── use-focus-trap/
│   ├── use-focus-trap.ts       # implementation
│   └── use-focus-trap.spec.ts  # required co-located test
└── index.ts                    # barrel re-exports
\`\`\`

Convention: \`src/composables/<name>/<name>.ts\` + \`<name>.spec.ts\`.
Names are kebab-case and should start with \`use-\` (the scaffold tool prefixes
\`use-\` when missing).

## Rules

1. Import hooks only from \`@mission-platform/forge-jsx\` (\`useState\`, \`useEffect\`,
   \`useMemo\`, \`type MpRef\`, …) — not from \`vue\` or \`react\` directly.
2. Keep composables pure and SSR-safe (guard \`window\`/\`document\` access).
3. **Every composable ships a co-located test** (\`.spec.ts\`).
4. Export from \`src/composables/index.ts\`, and from the package root barrel.
5. Scaffold with \`scaffold_composable\` (dry-run by default; \`apply: true\` to write).

## Example

\`\`\`ts
import { type MpRef, useEffect } from '@mission-platform/forge-jsx';

export function useEventListener(
  target: MpRef<EventTarget | null>,
  type: string,
  listener: EventListener,
): void {
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    element.addEventListener(type, listener);
    return () => element.removeEventListener(type, listener);
  }, [target, type, listener]);
}
\`\`\``;

const STORE_AUTHORING = `# Authoring Stores

Stores are **framework-neutral** observable modules shared by write-once
components and composables. Prefer plain module state + subscribe over
framework-specific stores (Pinia/Redux) inside portable packages.

See also: \`docs/store-authoring.md\`.

## Layout

\`\`\`
src/stores/
├── theme/
│   ├── theme.ts       # implementation
│   └── theme.spec.ts  # required co-located test
└── index.ts           # barrel re-exports
\`\`\`

Convention: \`src/stores/<name>/<name>.ts\` + \`<name>.spec.ts\`.

## Pattern

1. Hold state in module scope (plain values, not framework refs).
2. Expose \`get<Name>Snapshot()\`, mutators, and \`subscribe<Name>(listener)\`.
3. Notify listeners on every change; return an unsubscribe function.
4. Components bridge with forge hooks:

\`\`\`ts
const [snapshot, setSnapshot] = useState(getThemeSnapshot());
useEffect(() => subscribeTheme(() => setSnapshot(getThemeSnapshot())), []);
\`\`\`

5. **Every store ships a co-located test**.
6. Export from \`src/stores/index.ts\` and the package root barrel.
7. Scaffold with \`scaffold_store\` (dry-run by default; \`apply: true\` to write).

## Guardrails

- No Vue/React imports inside the store module.
- SSR-safe: guard \`document\`/\`localStorage\` access.
- Keep the public surface explicit and typed.`;

const UTIL_AUTHORING = `# Authoring Utils

Utils are pure, framework-agnostic helpers. They must not depend on DOM APIs
unless clearly named and documented as browser-only.

See also: \`docs/util-authoring.md\`.

## Layout

\`\`\`
src/utils/
├── format-date/
│   ├── format-date.ts       # implementation
│   └── format-date.spec.ts  # required co-located test
└── index.ts                 # barrel re-exports
\`\`\`

Convention: \`src/utils/<name>/<name>.ts\` + \`<name>.spec.ts\`.

## Rules

1. Prefer pure functions with explicit TypeScript types.
2. **Every util ships a co-located test** (\`.spec.ts\`).
3. Export from \`src/utils/index.ts\` and the package root barrel.
4. Do not pull in \`vue\`/\`react\` or forge hooks — those belong in composables.
5. Scaffold with \`scaffold_util\` (dry-run by default; \`apply: true\` to write).

## Example

\`\`\`ts
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
\`\`\``;

const PACKAGE_CREATION = `# Creating a Package

Packages are reusable building blocks in \`packages/<name>/\`, scoped as
\`@mission-platform/<name>\`, framework-agnostic where possible.

## Fastest path
Use the \`scaffold_package\` tool. Dry-run first and verify that a Vue package
preview includes \`stylelint.config.mjs\`, the shared config, and the direct
\`postcss-html\`, \`postcss-scss\`, \`stylelint\`,
\`stylelint-config-recommended-vue\`, and \`stylelint-config-standard-scss\`
catalog dependencies. It writes a convention-compliant skeleton (manifest with
\`catalog:\`/\`workspace:*\` deps, the \`tsconfig\` set, re-exported shared configs,
\`vite.config.ts\`, \`vitest.config.ts\`, \`turbo.json\`, \`src/index.ts\`, a spec,
\`llms.txt\`, and \`docs/index.md\`). Pass \`apply: true\` to write files.

## Manual steps
1. \`mkdir packages/<name>\` and add \`package.json\` (name \`@mission-platform/<name>\`,
   \`"type": "module"\`, \`exports\`/\`main\`/\`types\` pointing at \`dist\`, \`files: ["dist"]\`).
2. Add the \`tsconfig\` set (\`tsconfig.json\` + \`tsconfig.build.json\` + \`tsconfig.node.json\` + \`tsconfig.test.json\`).
3. Re-export the shared eslint/prettier/stylelint configs.
4. Add \`vite.config.ts\` (\`defineLibraryConfig\`) and \`vitest.config.ts\` (\`defineVitestConfig\`).
5. Add \`turbo.json\` with \`"extends": ["//"]\`.
6. Add \`src/index.ts\` as the public barrel, a unit spec, an \`llms.txt\`, and \`docs/index.md\`.
7. Run \`pnpm install\` (to link the workspace), then \`pnpm exec turbo run build lint test --filter @mission-platform/<name>\`.
8. Create a changeset: \`pnpm changeset\`.

## Guardrails
- Never import from \`apps/\`.
- Prefer \`catalog:\` versions and \`workspace:*\` for internal deps.
- If it renders UI, add a matching story in \`apps/storybook\`.`;

const PACKAGE_DEVELOPMENT = `# Developing a Package

## Layout
\`\`\`
packages/<name>/
├── src/
│   ├── components/              # atomic design: atoms|molecules|organisms|templates|pages
│   │   └── <level>/<comp>/      # <comp>.tsx + .stories.tsx + .spec.ts + index.ts
│   ├── composables/<name>/      # <name>.ts + <name>.spec.ts (forge-neutral)
│   ├── stores/<name>/           # <name>.ts + <name>.spec.ts (framework-neutral)
│   ├── utils/<name>/            # <name>.ts + <name>.spec.ts
│   ├── locales/
│   └── index.ts                 # public barrel — only export the public API
├── llms.txt                     # human/LLM usage doc
├── docs/index.md
├── package.json / tsconfig*.json / vite.config.ts / vitest.config.ts / turbo.json
\`\`\`

## Workflow
- Keep the public surface in \`src/index.ts\`; export explicit types for every public API.
- Build: \`pnpm exec turbo run build --filter @mission-platform/<name>\`
  (packages typically split into \`build:check\`, \`build:bundle\`, \`build:types\`).
- Test: \`pnpm exec turbo run test --filter @mission-platform/<name>\` (Vitest; Playwright for browser-level).
- Lint/format: \`pnpm exec turbo run lint lint:style format --filter @mission-platform/<name>\`.
- Framework-agnostic components: author with \`@mission-platform/forge-jsx\` so they compile to Vue and React.
- Prefer the scaffold tools for units: \`scaffold_component\`, \`scaffold_composable\`,
  \`scaffold_store\`, \`scaffold_util\` (see the atomic / composable / store / util guides).
- Update \`llms.txt\` whenever the public API changes, and add/refresh Storybook stories.
- Add a changeset for every published change and run downstream consumers' tests.`;

const APP_CREATION = `# Creating an App

Apps live in \`apps/<name>/\`, are \`"private": true\`, scoped \`@mission-platform/<name>\`,
and are thin orchestration layers that compose \`packages/\`.

## Fastest path
Use the \`scaffold_app\` tool (dry-run first; pass \`apply: true\` to write). Verify
the preview includes \`stylelint.config.mjs\`, the shared config, and the direct
\`postcss-html\`, \`postcss-scss\`, \`stylelint\`,
\`stylelint-config-recommended-vue\`, and \`stylelint-config-standard-scss\`
catalog dependencies. It creates a Vite + Vue 3 app skeleton: manifest with app
scripts, \`tsconfig\` set (app + node), re-exported configs, \`vite.config.ts\`
(\`defineFrameworkAppConfig\`), \`turbo.json\`, \`index.html\`, and \`src/\` entry.

## Manual steps
1. \`mkdir apps/<name>\`; add \`package.json\` (\`"private": true\`, app scripts:
   \`dev\`, \`build\`, \`preview\`, \`test\`, \`lint\`, \`format\`).
2. Add consumed packages as \`dependencies\` via \`workspace:*\` (e.g. components, tokens, i18n).
3. Add \`tsconfig.json\` referencing \`tsconfig.app.json\` and \`tsconfig.node.json\`.
4. Re-export shared eslint/prettier/stylelint configs.
5. Add \`vite.config.ts\` using \`defineFrameworkAppConfig({ framework: 'vue' })\` — this is the
   single switch that makes bare \`@mission-platform/*\` imports resolve to the chosen
   framework build — plus \`index.html\` and \`src/main.ts\`/\`src/App.vue\`.
6. Add \`turbo.json\` with \`"extends": ["//"]\`.
7. \`pnpm install\`, then \`pnpm exec turbo run build --filter @mission-platform/<name>\`.

## For Cloudflare deployment
Add a \`wrangler.jsonc\` and wire the \`@mission-platform/forge-spa\` worker (see the my-care-notes app).`;

const APP_DEVELOPMENT = `# Developing an App

## Principles
- Apps **compose** packages; they should contain orchestration, routing, and app-specific glue only.
- New reusable UI/logic belongs in a package, not in the app.
- Consume components from \`@mission-platform/components\`, tokens from \`@mission-platform/tokens\`, etc.
- Pick the framework **once** in \`vite.config.ts\` with
  \`defineFrameworkAppConfig({ framework: 'vue' })\` (and the matching
  \`tsconfig.framework-<name>.json\` preset); every bare \`@mission-platform/*\`
  import then resolves to that framework's build.

## Workflow
- Dev server: \`pnpm exec turbo run dev --filter @mission-platform/<name>\` (or \`pnpm --filter <name> dev\`).
- Build: \`pnpm exec turbo run build --filter @mission-platform/<name>\`.
- Test: \`pnpm exec turbo run test --filter @mission-platform/<name>\`.
- Lint/format & style checks mirror the package workflow.

## Deployment (Cloudflare)
- Apps deploy to Cloudflare via \`wrangler\` with a \`forge-spa\` worker serving static assets
  with an SPA fallback. See \`deploy\`/\`deploy:staging\` scripts and \`wrangler.jsonc\`.
- The app's \`turbo.json\` \`deploy\` task depends on \`@mission-platform/forge-spa#build\`.`;

const WORKER_CREATION = `# Creating a Worker

Workers live in \`packages/edge/workers/<name>/\`, are \`"private": true\`, scoped \`@mission-platform/<name>\`,
and serve static assets / handle SPA fallbacks (or proxy APIs) on Cloudflare.

## Fastest path
Use the \`scaffold_worker\` tool (\`apply: true\` to write). It creates the worker skeleton:
manifest, \`tsconfig.json\` + \`tsconfig.build.json\` (extends \`.../library\`, \`types: ["@cloudflare/workers-types"]\`),
re-exported eslint/prettier configs, and \`src/index.ts\` with a typed \`fetch\` handler.

## Manual steps
1. \`mkdir packages/edge/workers/<name>\`; add \`package.json\` (\`"private": true\`, \`"type": "module"\`,
   \`exports\`/\`types\` → \`dist\`, \`build\`: \`tsc --project tsconfig.build.json\`).
2. Add \`@cloudflare/workers-types\` (\`catalog:cloudflare\`) and the shared packages/tooling/configs/typescript-config as devDependencies.
3. Add \`tsconfig.json\` (references \`tsconfig.build.json\`) and \`tsconfig.build.json\`
   (extends \`@mission-platform/typescript-config/library\`, \`types: ["@cloudflare/workers-types"]\`).
4. Re-export eslint/prettier configs.
5. Add \`src/index.ts\` exporting \`{ async fetch(request, env) { ... } }\`.
6. \`pnpm install\`, then \`pnpm exec turbo run build --filter @mission-platform/<name>\`.

## Guardrails
- Workers may consume \`packages/\` at runtime and \`packages/tooling/configs/\` as devDependencies, but never import from \`apps/\`.`;

const WORKER_DEVELOPMENT = `# Developing a Worker

## Layout
\`\`\`
packages/edge/workers/<name>/
├── src/index.ts        # default export with an async fetch(request, env) handler
├── package.json
├── tsconfig.json / tsconfig.build.json
├── eslint.config.js / prettier.config.js
└── README.md
\`\`\`

## Workflow
- Type the handler with \`@cloudflare/workers-types\` (\`Request\`, \`Response\`, \`fetch\`).
- Build: \`pnpm exec turbo run build --filter @mission-platform/<name>\` (\`tsc --project tsconfig.build.json\`).
- Local dev / deploy is driven from the consuming app via \`wrangler\` (\`wrangler dev\`, \`wrangler deploy\`).
- Keep workers thin: asset serving, SPA fallback, or API proxying. Share logic via \`packages/\`.
- Lint/format: \`pnpm exec turbo run lint format --filter @mission-platform/<name>\`.`;

const EXTERNAL_SETUP = `# External Consumer Setup

This guide explains how to consume published \`@mission-platform/*\` packages in external (out-of-monorepo) projects.

## Framework Selection via Conditions
Mission Platform packages provide framework-specific implementations via **export conditions**. Configure your bundler and TypeScript to use the corresponding \`mp:<framework>\` condition.

### Vite Configuration
Use \`frameworkResolveConditions\` from \`@mission-platform/vite-config\`:
\`\`\`ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: {
    conditions: [...frameworkResolveConditions('mp:vue'), 'import', 'module', 'browser', 'default'],
  },
});
\`\`\`

### TypeScript Configuration
Extend a framework preset from \`@mission-platform/typescript-config\`:
\`\`\`json
{
  "extends": "@mission-platform/typescript-config/framework-vue",
  "compilerOptions": {
    "customConditions": ["mp:vue"]
  }
}
\`\`\`

## Package Installation
\`\`\`bash
pnpm add @mission-platform/components @mission-platform/tokens
\`\`\`

## Component Usage
With conditions set, use bare specifiers:
\`\`\`ts
import { ForgeButton } from '@mission-platform/components';
\`\`\`

## Design Token Overrides
Override via CSS custom properties (see the dedicated \`design-token-overrides\` guide
for the recommended JSON → SCSS workflow and the \`generate_token_override\` /
\`list_token_variables\` tools):
\`\`\`css
:root {
  --mp-color-primary-default: #ff0000;
}
\`\`\``;

const DESIGN_TOKEN_OVERRIDES = `# Design Token Overrides

Mission Platform ships its design decisions as **DTCG** design tokens
(\`@mission-platform/tokens\`), generated into \`--mp-*\` **CSS custom properties**
(colours, radii, shadows, spacing, typography, motion, …). To re-skin an app you
**override those custom properties** — you never fork or edit the tokens package.

## Recommended workflow: JSON → generated SCSS

Keep overrides declarative and reviewable by authoring a small **DTCG-style
override JSON** and transforming it into an SCSS/CSS \`:root { … }\` partial that
is imported *after* the base tokens (so it wins the cascade). This keeps the
override auditable, diffable, and regenerable.

1. **Author** \`design-tokens/overrides.tokens.json\` — a nested tree grouped by
   category, each leaf a \`{ "$value": …, "$description"?: … }\`:
   \`\`\`json
   {
     "color": {
       "primary": {
         "default": { "$value": { "light": "#8b7ff0", "dark": "#a99cf5" }, "$description": "Brand primary" }
       }
     },
     "radius": { "md": { "$value": "2px" } },
     "shadow": { "md": { "$value": "0 3px 2px 0 rgb(0 0 0 / 20%)" } },
     "font": { "family": { "sans": { "$value": "'Inter', ui-sans-serif, system-ui, sans-serif" } } }
   }
   \`\`\`
   - A \`{ "light", "dark" }\` object emits \`light-dark(<light>, <dark>)\` — scheme-aware,
     exactly like the base semantic colour tokens.
   - Any other scalar (hex, \`rem\`, a shadow list, a font-family stack, a number) is
     emitted verbatim.
   - The custom-property name is the DTCG path joined with \`-\`, prefixed \`--mp-\`
     (\`color.primary.default\` → \`--mp-color-primary-default\`).

2. **Transform** the JSON into an SCSS partial. Use the \`generate_token_override\`
   tool (pass the JSON, get back the \`:root { … }\` SCSS), or wire the same
   transform into a build script that writes \`overrides.generated.scss\`.

3. **Import** the generated partial *after* the base tokens so it overrides them:
   \`\`\`scss
   @use '@mission-platform/tokens/scss/tokens';
   @import './design-tokens/overrides.generated.scss';
   \`\`\`

## Discovering what you can override

Use the \`list_token_variables\` tool (optionally with a \`category\` such as
\`theme-light\`, \`radius\`, \`shadow\`, \`font\`) to enumerate every overridable
\`--mp-*\` custom property and its description, or \`get_tokens\` to read the raw
DTCG values.

## Validating the override document

A JSON Schema (Draft 2020-12) ships with
\`@mission-platform/vite-plugin-token-overrides\` (exported at \`./schema\`). It
enumerates every overridable token key, so editors give you validation and
autocomplete. Reference it from the document with a \`$schema\` key (a
\`$\`-prefixed key the transform ignores):
\`\`\`json
{
  "$schema": "../../node_modules/@mission-platform/vite-plugin-token-overrides/schema/token-overrides.schema.json",
  "color": { "primary": { "default": { "$value": { "light": "#8b7ff0", "dark": "#a99cf5" } } } }
}
\`\`\`
Fetch the schema with the \`get_token_override_schema\` tool. \`generate_token_override\`
also validates the keys you pass and warns (non-fatally) about any that don't
match a known \`--mp-*\` token — usually typos.

## Notes

- Override only the tokens you need — unspecified tokens keep their defaults.
- Font-family overrides just change \`--mp-font-family-sans\`/\`--mp-font-family-mono\`;
  remember to actually load the web font (e.g. a \`<link>\` or \`@font-face\`).
- Prefer overriding **semantic** tokens (\`--mp-color-primary-default\`,
  \`--mp-radius-md\`) over primitives so the whole component library follows.`;

const FWS_AUTHORING = `# Forge Web Script (FWS) Authoring

Forge Web Script (**FWS**) is the canonical name of the typed, ownership-safe
language. If a request says “FMS”, correct it to FWS; do not invent a separate
language or toolchain.

## Type, ownership, and ABI rules
- FWS is statically typed. Keep function parameters, returns, calls, numeric
  conversions, and collection element types explicit and compatible.
- Values crossing a module or host boundary have an ownership contract:
  \`borrowed\` values remain valid only for the call, \`owned\` values have one
  responsible releaser, and \`shared\` values require the declared shared
  contract. Never release a borrowed value or use an owned value after release.
- \`string\` and \`bytes\` use checked pointer-length pairs in Wasm linear
  memory. Prove that pointer and length are non-negative, representable, and
  within the allocation before reading or writing.
- The ABI manifest is authoritative for exports, imports, representations,
  memory layout, iterators, async boundaries, and required capabilities. Do not
  hand-edit generated adapters to bypass it.

## Safe defaults and optimization audit
- Locals and parameters are immutable unless declared \`mut\`; mutable borrows
  require explicit \`&mut\`. POD aggregates pass by value, while non-POD values
  pass by immutable reference unless an ownership mode is explicit.
- Region temporaries cannot escape their scope. Values crossing a scope require
  an explicit \`owned\` or \`shared\` boundary and checked ARC retain/release.
- Collection bounds checks use \`runtime\` by default. \`proven-safe\` requires
  static range facts; \`excluded-by-profile\` is explicit, auditable, and must
  appear in analysis, manifests, optimizer reports, and cache identity.
- The compiler optimizes a deterministic Sea-of-Nodes graph, then Wasm IR.
  Inspect \`.sonir.json\` with \`fws_inspect_sonir\`; it is bounded, root-safe,
  read-only metadata and must never be executed.

## Required workflow
1. Run \`fws_analyze_source\` or \`fws_analyze_workspace\` and inspect every
   blocking finding, including its evidence and source range.
2. Compile with the intended policy and run \`fws_verify_artifact\` on the
   resulting Wasm and manifest. Strict/release output must fail closed.
3. Only then suggest release code. Keep host effects as explicit declared
   capabilities; FWS has no ambient filesystem, network, DOM, or Node access.`;

const FWS_SECURITY = `# FWS Security and Threat Boundaries

FWS enforces a typed memory/ownership model and explicit capability imports;
these are compiler and runtime guarantees, not a claim that arbitrary host
implementations are safe. Capability imports are deny-by-default and must be
allowed by the source policy, manifest, artifact verifier, and runtime binding.

## Analysis expectations
The canonical analysis report checks control-flow and initialization facts,
pointer-length ranges, ownership transitions, integer/range overflow,
collection and iterator bounds, recursion/loops/allocations/async limits,
capability allow-lists, taint flows, and unsafe host-boundary patterns. A
property that cannot be proven is conservatively rejected in strict mode.

Findings use stable \`FWS-*\` codes, severity, UTF-16-compatible source spans,
evidence, remediation hints, and optional OWASP/CWE tags. Treat warnings as
review obligations and errors as release blockers under the strict profile.

## OWASP/CWE boundary
Tags help map a finding to risks such as injection, unrestricted resource
consumption, broken access control, or memory safety; they do not certify the
host. Review capability implementations, JavaScript glue, browsers, and the
Wasm engine separately. Never add ambient I/O or dynamic code execution to FWS
to “solve” a finding.`;

const FWS_ARTIFACT_VERIFICATION = `# FWS Wasm Artifact Verification

\`WebAssembly.validate\` is necessary but not sufficient. The FWS verifier also
performs bounded structural inspection and compares the artifact with its
manifest, deterministic metadata, target profile, and policy.

It checks the Wasm magic/version and section structure, exact capability import
names/signatures, export names/signatures, one linear memory and its limits,
address width, shared-memory policy, required target features, iterator/async
contracts, recognized custom metadata, source/graph/content hashes, and the
generated ESM adapter's checked pointer-length and cleanup paths. Optimized and
unoptimized variants are checked independently when both are available.

Artifact content identities use the versioned \`sha256-v1:<hex>\` format. A digest
detects accidental or unauthorized content changes when compared with a trusted
expected value; it does not authenticate the producer or replace signatures and
deployment access controls.

Use \`fws_inspect_manifest\` to understand a manifest and
\`fws_verify_artifact\` to obtain the canonical structured result. A mutated,
forged, unexpectedly imported/exported, or metadata-inconsistent artifact must
not be shipped, even if an engine accepts its binary form. Strict verification
returns no release artifact on blocking findings.`;

const FWS_FORENSICS = `# FWS Bounded Forensics

FWS traces are deterministic, source-mapped, and bounded. They contain sequence
numbers, instruction/call locations, capability decisions, redacted values,
memory/range and ownership events, traps, resource counters, termination, and a
trace hash. Replay identifiers and artifact/source hashes correlate a run
without exposing wall-clock data or unrestricted memory.

Use \`fws_run_trace\` only for the built-in capability-denied self-hosted
lex/parser probe. It is not an arbitrary Wasm executor: it accepts bounded
source, fixed execution limits, no host bindings, and capped events/bytes (with
optional bounded snapshots). A denied capability or guest trap is useful
evidence, not permission to retry with ambient imports.

Interpret \`droppedEvents\`, step-limit termination, and resource counters as
bounded-observation facts. Redaction failures must remain non-fatal, and trace
output must never be used to read raw secrets or request filesystem paths.
Follow the sequence **analyze → compile → verify → bounded trace → remediate**.`;

const FRAMEWORK_VUE = `# Vue 3 Best Practices

## Patterns
- **Composition API:** Use \`<script setup lang="ts">\`.
- **Composables:** Extract logic into \`useXxx\` functions.

## Performance
1. **\`shallowRef\`:** Use for large objects to reduce proxy overhead.
2. **\`v-memo\`:** Skip updates for expensive sub-trees.
3. **Async Components:** Use \`defineAsyncComponent\` for code-splitting.
4. **\`markRaw\`:** Use for third-party instances.
5. **Scoped CSS:** Use \`<style scoped>\` or CSS Modules.`;

const FRAMEWORK_REACT = `# React Best Practices

## Patterns
- **Functional Components:** Use Hooks (\`useState\`, \`useEffect\`).
- **Custom Hooks:** Extract reusable logic.

## Performance
1. **\`memo\`:** Skip re-renders if props haven't changed.
2. **\`useCallback\` / \`useMemo\`:** Maintain referential identity.
3. **\`useTransition\`:** Use for non-urgent updates.
4. **List Keys:** Use stable, unique keys.
5. **Virtualization:** Use \`react-window\` for long lists.`;

const FRAMEWORK_SOLID = `# SolidJS Best Practices

## Patterns
- **Signals:** Use \`createSignal\` for state.
- **Fine-grained Updates:** Updates happen at DOM node level.

## Performance
1. **Signal Granularity:** Keep signals focused.
2. **Batching:** Use \`batch()\` for multiple updates.
3. **\`For\` vs \`Index\`:** Use \`<For>\` for dynamic order, \`<Index>\` for stable order.
4. **Avoid Destructuring:** Access props as \`props.name\`.
5. **Untrack:** Read signals without creating dependencies.`;

const FRAMEWORK_WEB_COMPONENTS = `# Web Components (Lit) Best Practices

## Patterns
- **LitElement:** Extend for reactive components.
- **Shadow DOM:** Use for style isolation.

## Performance
1. **\`repeat\` directive:** Use for efficient list rendering.
2. **\`nothing\` sentinel:** Conditionally render nothing.
3. **Lightweight Styles:** Use static \`styles\` property.
4. **Attribute Reflection:** Reflect only when necessary.`;

const GUIDES: Record<GuideId, Guide> = {
  overview: { id: "overview", title: "Overview", body: OVERVIEW },
  conventions: {
    id: "conventions",
    title: "Conventions & Naming",
    body: CONVENTIONS,
  },
  "component-usage": {
    id: "component-usage",
    title: "Using Components",
    body: COMPONENT_USAGE,
  },
  "atomic-component-design": {
    id: "atomic-component-design",
    title: "Atomic Component Design",
    body: ATOMIC_COMPONENT_DESIGN,
  },
  "composable-authoring": {
    id: "composable-authoring",
    title: "Authoring Composables",
    body: COMPOSABLE_AUTHORING,
  },
  "store-authoring": {
    id: "store-authoring",
    title: "Authoring Stores",
    body: STORE_AUTHORING,
  },
  "util-authoring": {
    id: "util-authoring",
    title: "Authoring Utils",
    body: UTIL_AUTHORING,
  },
  "package-creation": {
    id: "package-creation",
    title: "Creating a Package",
    body: PACKAGE_CREATION,
  },
  "package-development": {
    id: "package-development",
    title: "Developing a Package",
    body: PACKAGE_DEVELOPMENT,
  },
  "app-creation": {
    id: "app-creation",
    title: "Creating an App",
    body: APP_CREATION,
  },
  "app-development": {
    id: "app-development",
    title: "Developing an App",
    body: APP_DEVELOPMENT,
  },
  "worker-creation": {
    id: "worker-creation",
    title: "Creating a Worker",
    body: WORKER_CREATION,
  },
  "worker-development": {
    id: "worker-development",
    title: "Developing a Worker",
    body: WORKER_DEVELOPMENT,
  },
  "framework-vue": {
    id: "framework-vue",
    title: "Vue 3 Best Practices",
    body: FRAMEWORK_VUE,
  },
  "framework-react": {
    id: "framework-react",
    title: "React Best Practices",
    body: FRAMEWORK_REACT,
  },
  "framework-solid": {
    id: "framework-solid",
    title: "SolidJS Best Practices",
    body: FRAMEWORK_SOLID,
  },
  "framework-web-components": {
    id: "framework-web-components",
    title: "Web Components (Lit) Best Practices",
    body: FRAMEWORK_WEB_COMPONENTS,
  },
  "external-setup": {
    id: "external-setup",
    title: "External Consumer Setup",
    body: EXTERNAL_SETUP,
  },
  "design-token-overrides": {
    id: "design-token-overrides",
    title: "Design Token Overrides",
    body: DESIGN_TOKEN_OVERRIDES,
  },
  "fws-authoring": {
    id: "fws-authoring",
    title: "FWS Authoring",
    body: FWS_AUTHORING,
  },
  "fws-security": {
    id: "fws-security",
    title: "FWS Security",
    body: FWS_SECURITY,
  },
  "fws-artifact-verification": {
    id: "fws-artifact-verification",
    title: "FWS Wasm Artifact Verification",
    body: FWS_ARTIFACT_VERIFICATION,
  },
  "fws-forensics": {
    id: "fws-forensics",
    title: "FWS Bounded Forensics",
    body: FWS_FORENSICS,
  },
};

export const GUIDE_IDS = Object.keys(GUIDES) as GuideId[];

export function getGuide(id: string): Guide | undefined {
  return GUIDES[id as GuideId];
}

export function allGuides(): Guide[] {
  return GUIDE_IDS.map((id) => GUIDES[id]);
}

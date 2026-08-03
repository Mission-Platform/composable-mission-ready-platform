/**
 * Curated, task-focused guidance for the seven workflows this server assists
 * with. The text is distilled from the repository's own documentation
 * (`docs/`, `AGENTS.md`, `CONTRIBUTING.md`) and the observed conventions of the
 * existing workspaces, so the advice matches how the monorepo actually works.
 */

export type GuideId =
  | 'overview'
  | 'conventions'
  | 'component-usage'
  | 'package-creation'
  | 'package-development'
  | 'app-creation'
  | 'app-development'
  | 'worker-creation'
  | 'worker-development';

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
- \`workers/\` — Cloudflare Workers (always \`"private": true\`).
- \`vite-plugins/\` — Vite build plugins consumed by apps.
- \`configs/\` — shared lint/format/build tooling (never imports from apps/packages).
- \`scripts/\` — repository-wide tooling scripts.

## Golden rules
1. **Dependency direction is one-way:** \`apps\` → \`packages\`/\`vite-plugins\`/\`workers\` → \`configs\`.
   Code in \`packages/\`, \`configs/\`, \`vite-plugins/\`, and \`workers/\` must **never** import from \`apps/\`.
2. **TypeScript everywhere:** new files are \`.ts\`, \`.tsx\`, or \`.vue\` (\`<script setup lang="ts">\`). No plain \`.js\`/\`.jsx\` source.
3. **Isolation of concerns:** new UI/composables/utilities/tokens belong in \`packages/\`, not embedded in an app. New shared tooling belongs in \`configs/\`.
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
- \`stylelint.config.js\`→ \`import baseConfig from '@mission-platform/stylelint-config'; export default { ...baseConfig };\`

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
in the neutral JSX dialect (\`@mission-platform/forge\`) and compiled to **both Vue 3 and React**.

## Discover
- Use the \`list_components\` tool to enumerate every component and its exports.
- Use the \`get_component_usage\` tool for a specific component to see its props
  interface, doc comment, available stories, and import snippets.

## Import
\`\`\`ts
// Vue app
import { BaseButton } from '@mission-platform/components/vue';
// React app
import { BaseButton } from '@mission-platform/components/react';
\`\`\`

## Use (Vue)
\`\`\`vue
<script setup lang="ts">
import { BaseButton } from '@mission-platform/components/vue';
</script>

<template>
  <BaseButton variant="primary" size="md" @click="onClick">Save</BaseButton>
</template>
\`\`\`

## Notes
- Props follow a canonical \`2xs → 2xl\` size scale and named design-token spacing.
- Styling ships with the component via co-located CSS Modules (\`@layer mp.components\`).
- Prefer existing components over re-implementing UI. If a component is missing,
  add it to \`packages/components\` (see the package-development guide) and add a story.`;

const PACKAGE_CREATION = `# Creating a Package

Packages are reusable building blocks in \`packages/<name>/\`, scoped as
\`@mission-platform/<name>\`, framework-agnostic where possible.

## Fastest path
Use the \`scaffold_package\` tool. It writes a convention-compliant skeleton
(manifest with \`catalog:\`/\`workspace:*\` deps, the \`tsconfig\` set, re-exported
shared configs, \`vite.config.ts\`, \`vitest.config.ts\`, \`turbo.json\`, \`src/index.ts\`,
a spec, \`llms.txt\`, and \`docs/index.md\`). Pass \`apply: true\` to write files.

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
│   ├── components/      # .vue / .tsx components
│   ├── composables/     # useXxx.ts
│   ├── utils/           # helpers
│   ├── index.ts         # public barrel — only export the public API
│   └── *.spec.ts        # Vitest unit tests
├── llms.txt             # human/LLM usage doc
├── docs/index.md
├── package.json / tsconfig*.json / vite.config.ts / vitest.config.ts / turbo.json
\`\`\`

## Workflow
- Keep the public surface in \`src/index.ts\`; export explicit types for every public API.
- Build: \`pnpm exec turbo run build --filter @mission-platform/<name>\`
  (packages typically split into \`build:check\`, \`build:bundle\`, \`build:types\`).
- Test: \`pnpm exec turbo run test --filter @mission-platform/<name>\` (Vitest; Playwright for browser-level).
- Lint/format: \`pnpm exec turbo run lint lint:style format --filter @mission-platform/<name>\`.
- Framework-agnostic components: author with \`@mission-platform/forge\` so they compile to Vue and React.
- Update \`llms.txt\` whenever the public API changes, and add/refresh Storybook stories.
- Add a changeset for every published change and run downstream consumers' tests.`;

const APP_CREATION = `# Creating an App

Apps live in \`apps/<name>/\`, are \`"private": true\`, scoped \`@mission-platform/<name>\`,
and are thin orchestration layers that compose \`packages/\`.

## Fastest path
Use the \`scaffold_app\` tool (\`apply: true\` to write). It creates a Vite + Vue 3 app
skeleton: manifest with app scripts, \`tsconfig\` set (app + node), re-exported configs,
\`vite.config.ts\` (\`defineAppConfig\`), \`turbo.json\`, \`index.html\`, and \`src/\` entry.

## Manual steps
1. \`mkdir apps/<name>\`; add \`package.json\` (\`"private": true\`, app scripts:
   \`dev\`, \`build\`, \`preview\`, \`test\`, \`lint\`, \`format\`).
2. Add consumed packages as \`dependencies\` via \`workspace:*\` (e.g. components, tokens, i18n).
3. Add \`tsconfig.json\` referencing \`tsconfig.app.json\` and \`tsconfig.node.json\`.
4. Re-export shared eslint/prettier/stylelint configs.
5. Add \`vite.config.ts\` using \`defineAppConfig\`, plus \`index.html\` and \`src/main.ts\`/\`src/App.vue\`.
6. Add \`turbo.json\` with \`"extends": ["//"]\`.
7. \`pnpm install\`, then \`pnpm exec turbo run build --filter @mission-platform/<name>\`.

## For Cloudflare deployment
Add a \`wrangler.jsonc\` and wire the \`@mission-platform/base-spa\` worker (see the my-care-notes app).`;

const APP_DEVELOPMENT = `# Developing an App

## Principles
- Apps **compose** packages; they should contain orchestration, routing, and app-specific glue only.
- New reusable UI/logic belongs in a package, not in the app.
- Consume components from \`@mission-platform/components/vue\`, tokens from \`@mission-platform/tokens\`, etc.

## Workflow
- Dev server: \`pnpm exec turbo run dev --filter @mission-platform/<name>\` (or \`pnpm --filter <name> dev\`).
- Build: \`pnpm exec turbo run build --filter @mission-platform/<name>\`.
- Test: \`pnpm exec turbo run test --filter @mission-platform/<name>\`.
- Lint/format & style checks mirror the package workflow.

## Deployment (Cloudflare)
- Apps deploy to Cloudflare via \`wrangler\` with a \`base-spa\` worker serving static assets
  with an SPA fallback. See \`deploy\`/\`deploy:staging\` scripts and \`wrangler.jsonc\`.
- The app's \`turbo.json\` \`deploy\` task depends on \`@mission-platform/base-spa#build\`.`;

const WORKER_CREATION = `# Creating a Worker

Workers live in \`workers/<name>/\`, are \`"private": true\`, scoped \`@mission-platform/<name>\`,
and serve static assets / handle SPA fallbacks (or proxy APIs) on Cloudflare.

## Fastest path
Use the \`scaffold_worker\` tool (\`apply: true\` to write). It creates the worker skeleton:
manifest, \`tsconfig.json\` + \`tsconfig.build.json\` (extends \`.../library\`, \`types: ["@cloudflare/workers-types"]\`),
re-exported eslint/prettier configs, and \`src/index.ts\` with a typed \`fetch\` handler.

## Manual steps
1. \`mkdir workers/<name>\`; add \`package.json\` (\`"private": true\`, \`"type": "module"\`,
   \`exports\`/\`types\` → \`dist\`, \`build\`: \`tsc --project tsconfig.build.json\`).
2. Add \`@cloudflare/workers-types\` (\`catalog:cloudflare\`) and the shared configs/typescript-config as devDependencies.
3. Add \`tsconfig.json\` (references \`tsconfig.build.json\`) and \`tsconfig.build.json\`
   (extends \`@mission-platform/typescript-config/library\`, \`types: ["@cloudflare/workers-types"]\`).
4. Re-export eslint/prettier configs.
5. Add \`src/index.ts\` exporting \`{ async fetch(request, env) { ... } }\`.
6. \`pnpm install\`, then \`pnpm exec turbo run build --filter @mission-platform/<name>\`.

## Guardrails
- Workers may consume \`packages/\` at runtime and \`configs/\` as devDependencies, but never import from \`apps/\`.`;

const WORKER_DEVELOPMENT = `# Developing a Worker

## Layout
\`\`\`
workers/<name>/
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

const GUIDES: Record<GuideId, Guide> = {
  overview: { id: 'overview', title: 'Overview', body: OVERVIEW },
  conventions: { id: 'conventions', title: 'Conventions & Naming', body: CONVENTIONS },
  'component-usage': { id: 'component-usage', title: 'Using Components', body: COMPONENT_USAGE },
  'package-creation': { id: 'package-creation', title: 'Creating a Package', body: PACKAGE_CREATION },
  'package-development': { id: 'package-development', title: 'Developing a Package', body: PACKAGE_DEVELOPMENT },
  'app-creation': { id: 'app-creation', title: 'Creating an App', body: APP_CREATION },
  'app-development': { id: 'app-development', title: 'Developing an App', body: APP_DEVELOPMENT },
  'worker-creation': { id: 'worker-creation', title: 'Creating a Worker', body: WORKER_CREATION },
  'worker-development': { id: 'worker-development', title: 'Developing a Worker', body: WORKER_DEVELOPMENT },
};

export const GUIDE_IDS = Object.keys(GUIDES) as GuideId[];

export function getGuide(id: string): Guide | undefined {
  return GUIDES[id as GuideId];
}

export function allGuides(): Guide[] {
  return GUIDE_IDS.map((id) => GUIDES[id]);
}

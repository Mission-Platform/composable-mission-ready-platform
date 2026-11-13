import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

interface IssueDefinition {
  originalNumber: number;
  title: string;
  track: string;
  priority: string;
  complexity: string;
  initialStatus: string;
  labels: string[];
  body: string;
}

const LABELS = [
  { name: 'area:tooling', color: '0075ca', description: 'Foundational tooling and shared configuration packages' },
  { name: 'track:foundation', color: '1d76db', description: 'Foundation and shared configs track' },
  { name: 'scope:config', color: '5319e7', description: 'Configuration files and workspace definitions' },
  {
    name: 'breaking-change',
    color: 'b60205',
    description: 'Changes that introduce breaking API or contract modifications',
  },
  { name: 'area:tokens', color: '008672', description: 'Design tokens and DTCG pipelines' },
  { name: 'track:design-system', color: '0e8a16', description: 'Design tokens and UI primitives track' },
  { name: 'scope:ui', color: '5319e7', description: 'UI components and design tokens' },
  { name: 'area:core', color: '1d76db', description: 'Core utilities and runtime libraries' },
  { name: 'area:i18n', color: '0e8a16', description: 'Internationalization and message catalogs' },
  { name: 'scope:core', color: '1d76db', description: 'Core packages and services' },
  { name: 'area:components', color: '5319e7', description: 'UI primitive components' },
  { name: 'area:compiler', color: '654ff0', description: 'Lathe multi-framework AST compiler' },
  { name: 'area:lathe', color: '654ff0', description: 'Lathe compiler and adapters' },
  { name: 'track:compiler', color: '654ff0', description: 'Compiler and framework adapters track' },
  { name: 'scope:engine', color: '654ff0', description: 'Compilation engine and AST lowering' },
  { name: 'area:runtime', color: 'b60205', description: 'Scribe execution runtime and Wasm ABI' },
  { name: 'area:scribe', color: 'b60205', description: 'Scribe scanner, DSL and Wasm engine' },
  { name: 'track:scanner', color: 'b60205', description: 'Scanner, DSL and Wasm runtime track' },
  { name: 'scope:wasm', color: '654ff0', description: 'WebAssembly compilation and runtime' },
  { name: 'area:extensions', color: 'd93f0b', description: 'IDE extensions and developer tooling' },
  { name: 'track:tooling', color: 'd93f0b', description: 'Developer tooling and extensions track' },
  { name: 'scope:lsp', color: 'd93f0b', description: 'Language Server Protocol' },
  { name: 'area:apps', color: 'fbca04', description: 'Applications and workbenches' },
  { name: 'track:applications', color: 'fbca04', description: 'Applications, workbenches and MCP track' },
  { name: 'scope:frontend', color: 'fbca04', description: 'Frontend applications' },
  { name: 'area:mcp', color: 'a2eeef', description: 'Model Context Protocol servers' },
  { name: 'scope:ai-agents', color: 'a2eeef', description: 'AI assistant and agent integration' },
  { name: 'area:docs', color: '0075ca', description: 'Documentation, guides and website content' },
  { name: 'track:documentation', color: '0075ca', description: 'Documentation and migration guides track' },
  { name: 'scope:content', color: '0075ca', description: 'Documentation content and guides' },
];

const ISSUES: IssueDefinition[] = [
  {
    originalNumber: 101,
    title: 'refactor(tooling): rename root configs and workspace scopes to @fabrica',
    track: 'Foundation & Tooling',
    priority: 'P0 - Critical',
    complexity: 'M',
    initialStatus: 'Ready',
    labels: ['area:tooling', 'track:foundation', 'scope:config', 'breaking-change', 'status: ready'],
    body: `### Summary & Overview
Rename all foundational configuration and tooling packages under \`packages/tooling/configs/\` from the legacy \`@mission-platform/*\` namespace to the new \`@fabrica/*\` namespace. Update root workspace package declarations in \`package.json\`, ensure workspace resolutions in \`pnpm-workspace.yaml\`, and configure Turborepo task pipeline definitions in \`turbo.json\`.

### Track & Metadata
- **Track**: \`Foundation & Tooling\`
- **Priority**: \`P0 - Critical\`
- **Complexity**: \`M\`
- **Milestone**: Milestone #3: Fabrica Rebrand & Multi-Framework Modernization

### Affected Packages & Files
- \`packages/tooling/configs/eslint-config/package.json\` (\`@mission-platform/eslint-config\` -> \`@fabrica/eslint-config\`)
- \`packages/tooling/configs/prettier-config/package.json\` (\`@mission-platform/prettier-config\` -> \`@fabrica/prettier-config\`)
- \`packages/tooling/configs/typescript-config/package.json\` (\`@mission-platform/tsconfig\` -> \`@fabrica/tsconfig\`)
- \`packages/tooling/configs/stylelint-config/package.json\` (\`@mission-platform/stylelint-config\` -> \`@fabrica/stylelint-config\`)
- \`packages/tooling/configs/i18n-config/package.json\` (\`@mission-platform/i18n-config\` -> \`@fabrica/i18n-config\`)
- \`packages/tooling/configs/postcss-config/package.json\` (\`@mission-platform/postcss-config\` -> \`@fabrica/postcss-config\`)
- \`packages/tooling/configs/tsdown-config/package.json\` (\`@mission-platform/tsdown-config\` -> \`@fabrica/tsdown-config\`)
- \`packages/tooling/configs/vite-config/package.json\` (\`@mission-platform/vite-config\` -> \`@fabrica/vite-config\`)
- \`packages/tooling/configs/storybook-framework/package.json\` (\`@mission-platform/storybook-framework\` -> \`@fabrica/storybook-framework\`)
- \`package.json\` (Root name: \`"mission-platform"\` -> \`"fabrica"\`, update devDependencies)
- \`turbo.json\` (Pipeline inputs, outputs, and globalEnv adjustments)

### Technical Requirements
1. **ESLint & Prettier Configurations:**
   - Update package names in configs.
   - Ensure \`@fabrica/eslint-config\` correctly exports parser configurations for TypeScript, Vue, and markdown.
   - Ensure import grouping rules recognise \`@fabrica/*\` as internal workspace packages.
2. **TypeScript Base Configs:**
   - Ensure \`@fabrica/tsconfig\` paths and base tsconfigs resolve cleanly.
3. **Workspace Integrity:**
   - Run \`pnpm install\` across all packages without phantom dependency warnings.

### Acceptance Criteria
- [ ] All packages in \`packages/tooling/configs/\` declare \`@fabrica/*\` in their \`package.json\` manifests.
- [ ] Root \`package.json\` devDependencies consume \`@fabrica/eslint-config\` and \`@fabrica/prettier-config\`.
- [ ] \`pnpm install\` succeeds cleanly with zero lockfile conflicts.
- [ ] \`pnpm exec turbo run check\` executes linting, typechecking, and tests using the new configuration packages.`,
  },
  {
    originalNumber: 102,
    title: 'refactor(tokens): migrate custom properties from --mp-* to --fb-* and publish @fabrica/tokens',
    track: 'Design Tokens & UI',
    priority: 'P0 - Critical',
    complexity: 'M',
    initialStatus: 'Backlog',
    labels: ['area:tokens', 'track:design-system', 'scope:ui', 'breaking-change', 'status: backlog'],
    body: `### Summary & Overview
Update the DTCG design token build pipeline in \`packages/ui/tokens/\` to generate custom CSS properties prefixed with \`--fb-*\` (replacing \`--mp-*\`) and publish the package as \`@fabrica/tokens\`.

### Track & Metadata
- **Track**: \`Design Tokens & UI\`
- **Priority**: \`P0 - Critical\`
- **Complexity**: \`M\`
- **Milestone**: Milestone #3: Fabrica Rebrand & Multi-Framework Modernization

### Affected Packages & Files
- \`packages/ui/tokens/package.json\` (\`@mission-platform/tokens\` -> \`@fabrica/tokens\`)
- \`packages/ui/tokens/src/**/*.tokens.json\`
- \`packages/ui/tokens/src/build.ts\`
- \`packages/ui/tokens/src/generated/scss/**/*.scss\`
- \`packages/ui/tokens/src/generated/css/**/*.css\`
- \`packages/ui/theme/package.json\` (\`@mission-platform/theme\` -> \`@fabrica/theme\`)
- \`packages/ui/typography/package.json\` (\`@mission-platform/typography\` -> \`@fabrica/typography\`)
- \`packages/ui/breakpoints/package.json\` (\`@mission-platform/breakpoints\` -> \`@fabrica/breakpoints\`)

### Technical Requirements
1. **CSS Variable Namespace Migration:**
   - \`--mp-color-*\` -> \`--fb-color-*\` (palette, surface, text, border, interactive, status)
   - \`--mp-space-*\` / \`--mp-spacing-*\` -> \`--fb-space-*\` (layout spacing, component padding, margins)
   - \`--mp-radius-*\` -> \`--fb-radius-*\` (sm, md, lg, xl, full)
   - \`--mp-font-*\` -> \`--fb-font-*\` (family, size, weight, line-height)
   - \`--mp-shadow-*\` / \`--mp-elevation-*\` -> \`--fb-elevation-*\` (elevation levels 1–5)
   - \`--mp-transition-*\` / \`--mp-duration-*\` -> \`--fb-motion-*\`
2. **Token Formatter & Codegen Updates:**
   - Update token formatters to emit \`--fb-*\` SCSS maps and CSS custom properties.
   - Generate TypeScript typed token constants (\`@fabrica/tokens\`).
3. **Backward-Compatibility Aliases:**
   - Provide an optional compatibility stylesheet mapping legacy \`--mp-*\` variables to \`--fb-*\` during transition.

### Acceptance Criteria
- [ ] Generated CSS/SCSS files emit \`--fb-*\` variables exclusively.
- [ ] \`pnpm --filter @fabrica/tokens run build\` succeeds and produces valid CSS, SCSS, and TypeScript declarations.
- [ ] Token unit tests and visual parity checks pass without regressions.`,
  },
  {
    originalNumber: 103,
    title: 'refactor(core): rename @mission-platform/i18n and @mission-platform/core to @fabrica/*',
    track: 'Design Tokens & UI',
    priority: 'P0 - Critical',
    complexity: 'M',
    initialStatus: 'Backlog',
    labels: ['area:core', 'area:i18n', 'track:design-system', 'scope:core', 'status: backlog'],
    body: `### Summary & Overview
Migrate core foundation libraries including internationalization catalogs, routing utilities, reactive state wrappers, and shared runtime observers to \`@fabrica/*\`.

### Track & Metadata
- **Track**: \`Design Tokens & UI\`
- **Priority**: \`P0 - Critical\`
- **Complexity**: \`M\`
- **Milestone**: Milestone #3: Fabrica Rebrand & Multi-Framework Modernization

### Affected Packages
- \`packages/core/i18n/package.json\` (\`@mission-platform/i18n\` -> \`@fabrica/i18n\`)
- \`packages/core/router/package.json\` (\`@mission-platform/router\` -> \`@fabrica/router\`)
- \`packages/core/observers/package.json\` (\`@mission-platform/observers\` -> \`@fabrica/observers\`)
- \`packages/core/rxjs/package.json\` (\`@mission-platform/rxjs\` -> \`@fabrica/rxjs\`)
- \`packages/core/scheduler/package.json\` (\`@mission-platform/scheduler\` -> \`@fabrica/scheduler\`)

### Technical Requirements
1. **Catalog & Localization Pipeline:**
   - Update message catalog extraction scripts (\`i18next-cli\`) to use \`@fabrica/i18n\`.
   - Update translation loaders and Vue / React / Solid i18n bindings.
2. **Reactive Runtime & Routing:**
   - Update package manifests and internal imports to \`@fabrica/*\`.

### Acceptance Criteria
- [ ] \`@fabrica/i18n\` extracts and compiles locale message catalogs correctly.
- [ ] \`pnpm --filter @fabrica/i18n run test\` passes 100%.
- [ ] All core packages type-check cleanly with \`@fabrica/tsconfig\`.`,
  },
  {
    originalNumber: 104,
    title:
      'refactor(components): rename @mission-platform/components to @fabrica/components and bind to @fabrica/tokens',
    track: 'Design Tokens & UI',
    priority: 'P0 - Critical',
    complexity: 'L',
    initialStatus: 'Backlog',
    labels: ['area:components', 'track:design-system', 'scope:ui', 'breaking-change', 'status: backlog'],
    body: `### Summary & Overview
Migrate all UI primitive components in \`packages/ui/components/\` and specialized UI packages to \`@fabrica/components\`, update styles and JSX templates to consume \`--fb-*\` CSS custom properties, update custom export conditions (\`fb:vue\`, \`fb:react\`, \`fb:solid\`, \`fb:svelte\`, \`fb:web-component\`), and update framework rendering wrappers.

### Track & Metadata
- **Track**: \`Design Tokens & UI\`
- **Priority**: \`P0 - Critical\`
- **Complexity**: \`L\`
- **Milestone**: Milestone #3: Fabrica Rebrand & Multi-Framework Modernization

### Affected Packages & Files
- \`packages/ui/components/package.json\` (\`@mission-platform/components\` -> \`@fabrica/components\`)
- \`packages/ui/float/package.json\` (\`@mission-platform/float\` -> \`@fabrica/float\`)
- \`packages/ui/forms/package.json\` (\`@mission-platform/forms\` -> \`@fabrica/forms\`)
- \`packages/ui/forms-core/package.json\` (\`@mission-platform/forms-core\` -> \`@fabrica/forms-core\`)
- \`packages/ui/select/package.json\` (\`@mission-platform/select\` -> \`@fabrica/select\`)
- \`packages/ui/layout/package.json\` (\`@mission-platform/layout\` -> \`@fabrica/layout\`)
- \`packages/ui/icons/package.json\` (\`@mission-platform/icons\` -> \`@fabrica/icons\`)
- \`packages/ui/resource-planner/package.json\` (\`@mission-platform/resource-planner\` -> \`@fabrica/resource-planner\`)
- \`packages/ui/components/src/**/*.scss\` (Replace all \`--mp-*\` references with \`--fb-*\`)
- \`packages/ui/components/src/**/*.tsx\`
- \`packages/ui/components/src/**/*.stories.tsx\`

### Technical Requirements
1. **Package Export Conditions:**
   - Update export conditions in \`package.json\` from \`mp:vue\`, \`mp:react\`, \`mp:solid\`, \`mp:svelte\`, \`mp:web-component\` to \`fb:vue\`, \`fb:react\`, \`fb:solid\`, \`fb:svelte\`, \`fb:web-component\`.
2. **Style Modernization:**
   - Global replacement of \`--mp-*\` with \`--fb-*\` in all module SCSS files.
3. **Multi-Framework Rendering & Stories:**
   - Ensure all stories in \`src/components/**/*.stories.tsx\` render across all 5 framework targets.

### Acceptance Criteria
- [ ] Zero occurrences of \`--mp-*\` remain in \`packages/ui/components/src/\`.
- [ ] All component stories render cleanly in Storybook across Vue, React, Solid, Svelte, and Web Components.
- [ ] Accessibility (WAI-ARIA) checks and unit test suites pass completely.
- [ ] \`pnpm --filter @fabrica/components run build\` outputs all framework bundles in \`dist/\`.`,
  },
  {
    originalNumber: 105,
    title: 'refactor(lathe): migrate Forge multi-framework compiler and target adapters to @fabrica/lathe-*',
    track: 'Compiler & Adapters',
    priority: 'P1 - High',
    complexity: 'XL',
    initialStatus: 'Backlog',
    labels: ['area:compiler', 'area:lathe', 'track:compiler', 'scope:engine', 'breaking-change', 'status: backlog'],
    body: `### Summary & Overview
Rebrand the \`Forge\` multi-framework AST compiler, plugin APIs, target adapters, router integrations, and CMS integration plugins to \`Lathe\` (\`@fabrica/lathe-*\`).

### Track & Metadata
- **Track**: \`Compiler & Adapters\`
- **Priority**: \`P1 - High\`
- **Complexity**: \`XL\`
- **Milestone**: Milestone #3: Fabrica Rebrand & Multi-Framework Modernization

### Affected Packages
- **Core Compiler & AST:**
  - \`packages/compiler/plugins/forge-plugin-api\` -> \`@fabrica/lathe-plugin-api\`
  - \`packages/compiler/plugins/forge-cst\` -> \`@fabrica/lathe-cst\`
  - \`packages/core/forge-jsx\` -> \`@fabrica/lathe-jsx\`
  - \`packages/core/forge-adapters\` -> \`@fabrica/lathe-adapters\`
  - \`packages/tooling/vite/forge\` -> \`@fabrica/vite-plugin-lathe\`
- **Target Framework Adapters:**
  - \`packages/compiler/plugins/forge-react\` -> \`@fabrica/lathe-react\`
  - \`packages/compiler/plugins/forge-vue\` -> \`@fabrica/lathe-vue\`
  - \`packages/compiler/plugins/forge-solid\` -> \`@fabrica/lathe-solid\`
  - \`packages/compiler/plugins/forge-svelte\` -> \`@fabrica/lathe-svelte\`
  - \`packages/compiler/plugins/forge-web-components\` -> \`@fabrica/lathe-web-components\`
- **Router Adapters:**
  - \`packages/compiler/plugins/forge-router-plugin-api\` -> \`@fabrica/lathe-router-plugin-api\`
  - \`packages/compiler/plugins/forge-router-react\` -> \`@fabrica/lathe-router-react\`
  - \`packages/compiler/plugins/forge-router-vue\` -> \`@fabrica/lathe-router-vue\`
  - \`packages/compiler/plugins/forge-router-solid\` -> \`@fabrica/lathe-router-solid\`
  - \`packages/compiler/plugins/forge-router-svelte\` -> \`@fabrica/lathe-router-svelte\`
  - \`packages/compiler/plugins/forge-router-redwood\` -> \`@fabrica/lathe-router-redwood\`
  - \`packages/compiler/plugins/forge-router-web-components\` -> \`@fabrica/lathe-router-web-components\`
- **CMS & Design Tool Integrations:**
  - \`packages/compiler/plugins/forge-cms-plugin-api\` -> \`@fabrica/lathe-cms-plugin-api\`
  - \`packages/compiler/plugins/forge-cms-storyblok\` -> \`@fabrica/lathe-cms-storyblok\`
  - \`packages/compiler/plugins/forge-cms-astro\` -> \`@fabrica/lathe-cms-astro\`
  - \`packages/compiler/plugins/forge-cms-ghost\` -> \`@fabrica/lathe-cms-ghost\`
  - \`packages/compiler/plugins/forge-cms-jekyll\` -> \`@fabrica/lathe-cms-jekyll\`
  - \`packages/compiler/plugins/forge-cms-webflow\` -> \`@fabrica/lathe-cms-webflow\`
  - \`packages/compiler/figma/forge-figma\` -> \`@fabrica/lathe-figma\`
  - \`packages/compiler/figma/forge-figma-bridge\` -> \`@fabrica/lathe-figma-bridge\`

### Technical Requirements
1. **Target Lowering Contract Preservation:**
   - Preserve \`TargetIntentions.lowered\` enforcement (\`assertTargetIntentionsLowered\`).
   - Validate that each target adapter (\`lathe-react\`, \`lathe-vue\`, \`lathe-solid\`, \`lathe-svelte\`, \`lathe-web-components\`) cleanly compiles universal JSX/CST into framework-native components.
2. **Atomic Artifact Generation:**
   - Maintain atomic generation patterns with temporary sibling staging directories (\`createLatheArtifactWriter\`).
3. **End-to-End Test Suite:**
   - Run multi-framework generation integration tests (\`generateFrameworkSources\`) across all targets.

### Acceptance Criteria
- [ ] All 22 compiler packages renamed to \`@fabrica/lathe-*\`.
- [ ] \`TargetIntentions.lowered\` contracts preserved and validated across all target adapters.
- [ ] End-to-end \`generateFrameworkSources\` passes across all 5 framework targets with zero symbol collisions.
- [ ] \`pnpm exec turbo run build --filter @fabrica/lathe-*\` succeeds without errors.`,
  },
  {
    originalNumber: 106,
    title: 'refactor(scribe): migrate Flint scanner, SonIR, and Wasm execution engine to @fabrica/scribe-*',
    track: 'Scanner & Runtime',
    priority: 'P1 - High',
    complexity: 'XL',
    initialStatus: 'Backlog',
    labels: ['area:runtime', 'area:scribe', 'track:scanner', 'scope:wasm', 'breaking-change', 'status: backlog'],
    body: `### Summary & Overview
Migrate the low-level scanner, DSL parser, Sea-of-Nodes IR (SonIR), and WebAssembly runtime execution engine from \`flint\` to \`scribe\` (\`@fabrica/scribe-*\`).

### Track & Metadata
- **Track**: \`Scanner & Runtime\`
- **Priority**: \`P1 - High\`
- **Complexity**: \`XL\`
- **Milestone**: Milestone #3: Fabrica Rebrand & Multi-Framework Modernization

### Affected Packages
- \`packages/core/flint-scanner\` -> \`@fabrica/scribe-scanner\`
- \`packages/core/flint-runtime\` -> \`@fabrica/scribe-runtime\`
- \`packages/core/flint-sonir\` -> \`@fabrica/scribe-sonir\`
- \`packages/core/flint-cli\` -> \`@fabrica/scribe-cli\`
- \`packages/tooling/vite/flint\` -> \`@fabrica/vite-plugin-scribe\`
- \`packages/ui/flint-graph-editor\` -> \`@fabrica/scribe-graph-editor\`
- \`benchmark/\` test suites referencing Flint
- \`examples/flint-runtime\` -> \`examples/scribe-runtime\`

### Technical Requirements
1. **Sea-of-Nodes IR & WebAssembly ABI:**
   - Maintain SonIR 2.0 graph schema and deterministic byte layouts.
   - Update ABI bindings in \`@fabrica/scribe-runtime\`.
2. **Scanner Validation & Benchmark Guardrails:**
   - Verify zero performance regression in scanner benchmarks.
   - Validate linear-time PikeVM/DFA regex engine and SIMD vectorization routines.

### Acceptance Criteria
- [ ] Scribe scanner benchmark graph tests execute and pass without performance regression.
- [ ] SonIR to WebAssembly compilation and runtime ABI tests pass 100%.
- [ ] \`pnpm exec turbo run test --filter @fabrica/scribe-*\` passes cleanly.`,
  },
  {
    originalNumber: 107,
    title: 'refactor(extensions): migrate VS Code tooling to Scribe',
    track: 'Scanner & Runtime',
    priority: 'P2 - Medium',
    complexity: 'M',
    initialStatus: 'Backlog',
    labels: ['area:extensions', 'area:scribe', 'track:tooling', 'scope:lsp', 'status: backlog'],
    body: `### Summary & Overview
Update the VS Code language extensions, LSP server launchers, and syntax grammar manifests from Flint to Scribe.

### Track & Metadata
- **Track**: \`Scanner & Runtime\`
- **Priority**: \`P2 - Medium\`
- **Complexity**: \`M\`
- **Milestone**: Milestone #3: Fabrica Rebrand & Multi-Framework Modernization

### Affected Packages
- \`extensions/flint-vscode\` -> \`extensions/scribe-vscode\`
- \`extensions/fws-vscode\` -> \`extensions/scribe-lsp\`
- Grammar definitions (\`flint.tmLanguage.json\` -> \`scribe.tmLanguage.json\`)
- LSP client manifests and activation events

### Acceptance Criteria
- [ ] Extension builds via \`pnpm --filter scribe-vscode run build\`.
- [ ] Scribe Language Server launches and provides syntax highlighting, hover documentation, and diagnostics.`,
  },
  {
    originalNumber: 108,
    title: 'refactor(apps): update applications and Storybook workbench to consume @fabrica/* packages',
    track: 'Applications & MCP',
    priority: 'P1 - High',
    complexity: 'L',
    initialStatus: 'Backlog',
    labels: ['area:apps', 'track:applications', 'scope:frontend', 'status: backlog'],
    body: `### Summary & Overview
Update all deployable applications and workbench environments in \`apps/\` to consume \`@fabrica/*\` packages, \`--fb-*\` token properties, and Lathe/Scribe toolchains.

### Track & Metadata
- **Track**: \`Applications & MCP\`
- **Priority**: \`P1 - High\`
- **Complexity**: \`L\`
- **Milestone**: Milestone #3: Fabrica Rebrand & Multi-Framework Modernization

### Affected Applications
- \`apps/storybook\` (Storybook multi-framework workbench for Vue, React, Solid, Svelte, Web Components)
- \`apps/docs\` (Documentation site: Vite + Vue)
- \`apps/website\` (Marketing and product website)
- \`apps/my-care-notes\` (Care-notes clinical application)
- \`apps/service-monitor\` (RedwoodSDK health dashboard with Durable Object backend)
- \`apps/figma-forge-plugin\` -> \`apps/figma-lathe-plugin\` (Figma code generation and design token bridge)

### Technical Requirements
1. **Dependency & Import Path Migration:**
   - Update \`package.json\` manifests across all 6 applications to depend on \`@fabrica/*\`.
   - Update import statements to use \`@fabrica/tokens\`, \`@fabrica/components\`, \`@fabrica/i18n\`, \`@fabrica/lathe-*\`, etc.
2. **Design Token Variables in Apps:**
   - Replace any lingering \`--mp-*\` CSS custom properties with \`--fb-*\`.
3. **Figma Plugin Migration:**
   - Rename plugin directory from \`figma-forge-plugin\` to \`figma-lathe-plugin\`.
   - Update manifest \`name\` and \`id\` to reference Fabrica Lathe.

### Acceptance Criteria
- [ ] \`pnpm exec turbo run build --filter="./apps/*"\` passes cleanly for all 6 applications.
- [ ] Storybook renders all framework workbench targets (\`build-storybook:vue\`, \`build-storybook:react\`, \`build-storybook:solid\`, \`build-storybook:svelte\`, \`build-storybook:web-component\`) with \`--fb-*\` tokens without runtime errors.
- [ ] \`service-monitor\` compiles and executes typechecks against \`@fabrica/*\` data contracts.`,
  },
  {
    originalNumber: 109,
    title: 'refactor(mcp): rebrand MCP developer and consumer servers to @fabrica/mcp-*',
    track: 'Applications & MCP',
    priority: 'P1 - High',
    complexity: 'M',
    initialStatus: 'Backlog',
    labels: ['area:mcp', 'track:applications', 'scope:ai-agents', 'status: backlog'],
    body: `### Summary & Overview
Rebrand Model Context Protocol (MCP) server packages (\`mcp/developer\`, \`mcp/consumer\`, \`mcp/shared\`), update CLI binary entries (\`fabrica-mcp\` and \`fabrica-mcp-consumer\`), and update tool registrations and schemas to reflect the Fabrica ecosystem.

### Track & Metadata
- **Track**: \`Applications & MCP\`
- **Priority**: \`P1 - High\`
- **Complexity**: \`M\`
- **Milestone**: Milestone #3: Fabrica Rebrand & Multi-Framework Modernization

### Affected Packages
- \`mcp/developer/package.json\` (\`@mission-platform/mcp-developer\` -> \`@fabrica/mcp-developer\`, binary \`mission-mcp\` -> \`fabrica-mcp\`)
- \`mcp/consumer/package.json\` (\`@mission-platform/mcp-consumer\` -> \`@fabrica/mcp-consumer\`, binary \`mission-mcp-consumer\` -> \`fabrica-mcp-consumer\`)
- \`mcp/shared/package.json\` (\`@mission-platform/mcp-shared\` -> \`@fabrica/mcp-shared\`)
- \`mcp/README.md\` and server documentation

### Technical Requirements
1. **Binary & Entrypoint Refactoring:**
   - Update \`bin\` configurations in \`package.json\`.
   - Update server startup commands and documentation snippets.
2. **Tool Definition & Catalog Updates:**
   - Update MCP tools (\`list_components\`, \`get_component_usage\`, etc.) to return \`@fabrica/*\` package names and \`--fb-*\` CSS properties.
   - Update Scribe/Lathe AST tool registrations.

### Acceptance Criteria
- [ ] \`pnpm exec turbo run build --filter @fabrica/mcp-*\` builds cleanly.
- [ ] \`node mcp/developer/dist/index.js\` and \`node mcp/consumer/dist/index.js\` initialize without errors.
- [ ] MCP tool endpoints respond with updated \`@fabrica/*\` component catalogs and AST tools.`,
  },
  {
    originalNumber: 110,
    title: 'docs(rebrand): update documentation, AGENTS.md, architectural guides, and website content to Fabrica',
    track: 'Documentation',
    priority: 'P2 - Medium',
    complexity: 'L',
    initialStatus: 'Backlog',
    labels: ['area:docs', 'track:documentation', 'scope:content', 'status: backlog'],
    body: `### Summary & Overview
Comprehensive documentation overhaul replacing legacy naming references across all markdown files, guides, AGENTS instructions, and website marketing copy.

### Track & Metadata
- **Track**: \`Documentation\`
- **Priority**: \`P2 - Medium\`
- **Complexity**: \`L\`
- **Milestone**: Milestone #3: Fabrica Rebrand & Multi-Framework Modernization

### Affected Files
- Root documentation: \`AGENTS.md\`, \`README.md\`, \`CONTRIBUTING.md\`, \`DESIGN.md\`, \`DOCUMENTATION.md\`, \`LICENSE\`
- Guides: \`docs/best-practices.md\`, \`docs/workspace-structure.md\`, \`docs/package-development.md\`, \`docs/api-reference.md\`, \`docs/troubleshooting.md\`, \`docs/build-system.md\`
- Worktree & Project Guides: \`docs/guides/project-and-worktree-setup.md\`, \`docs/migration-guides/fabrica-rebrand-backlog.md\`
- Multi-language docs: \`docs/locales/**/*.md\`
- Portable LSP definition: \`agent-lsp.json\`, \`agent-lsp.example.json\`

### Technical Requirements
1. **Terminology Standardization:**
   - Replace \`Mission Platform\` / \`composable-mission-ready-platform\` with \`Fabrica\`.
   - Replace \`Forge\` with \`Lathe\`.
   - Replace \`Flint\` with \`Scribe\`.
   - Replace \`--mp-*\` with \`--fb-*\`.
2. **Rule Verification:**
   - Preserve anti-invention policies and security compliance standards (OWASP 2025 / ISO 27001).

### Acceptance Criteria
- [ ] Zero stale references to \`Mission Platform\` or \`composable-mission-ready-platform\` in active developer guides.
- [ ] Documentation links, package import snippets, and CLI commands reflect \`@fabrica/*\`, \`Lathe\`, and \`Scribe\`.
- [ ] \`pnpm exec turbo run check\` passes across all docs packages.`,
  },
];

async function main(): Promise<void> {
  console.log('--- 1. Ensuring GitHub Labels exist ---');
  for (const label of LABELS) {
    try {
      await execFileAsync('gh', [
        'label',
        'create',
        label.name,
        '--color',
        label.color,
        '--description',
        label.description,
        '--force',
      ]);
      console.log(`✓ Label ensured: ${label.name}`);
    } catch (err) {
      console.warn(`! Failed to ensure label ${label.name}: ${String(err)}`);
    }
  }

  console.log('\n--- 2. Pushing Issues to GitHub under Milestone 3 ---');
  const createdMapping: { original: number; created: number; url: string; title: string }[] = [];

  for (const issue of ISSUES) {
    console.log(`Creating issue: ${issue.title}...`);
    const args = [
      'issue',
      'create',
      '--title',
      issue.title,
      '--body',
      issue.body,
      '--milestone',
      'Fabrica Rebrand & Multi-Framework Modernization',
    ];

    for (const label of issue.labels) {
      args.push('--label', label);
    }

    try {
      const { stdout } = await execFileAsync('gh', args);
      const url = stdout.trim();
      const match = url.match(/\/issues\/(\d+)$/);
      const createdNumber = match ? parseInt(match[1], 10) : issue.originalNumber;
      console.log(`✓ Created issue #${createdNumber}: ${url}`);
      createdMapping.push({
        original: issue.originalNumber,
        created: createdNumber,
        url,
        title: issue.title,
      });
    } catch (err) {
      console.error(`✗ Error creating issue "${issue.title}":`, err);
    }
  }

  console.log('\n--- 3. Created Issues Summary ---');
  console.table(createdMapping);

  // Update scripts/github-project-manager.ts if numbers differ
  const scriptPath = resolve(process.cwd(), 'scripts/github-project-manager.ts');
  let scriptContent = readFileSync(scriptPath, 'utf-8');

  // Also update project plan
  const planPath = resolve(process.cwd(), 'docs/fabrica-project-plan.json');
  const planContent = JSON.parse(readFileSync(planPath, 'utf-8'));

  for (const m of createdMapping) {
    if (m.original !== m.created) {
      console.log(`Updating mapping for #${m.original} -> #${m.created}`);
      // Replace issueNumber in plan
      const targetIssue = planContent.issues.find((i: { issueNumber: number }) => i.issueNumber === m.original);
      if (targetIssue) {
        targetIssue.issueNumber = m.created;
      }
    }
  }

  writeFileSync(planPath, JSON.stringify(planContent, null, 2), 'utf-8');
  console.log(`✓ Updated ${planPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

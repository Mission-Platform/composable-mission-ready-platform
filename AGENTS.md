# Agents Guidelines

This document provides guidelines for agents working on the Mission Platform.

## Project Overview

The Mission Platform is a multi-framework TypeScript monorepo managed with pnpm workspaces and Turborepo. Vue 3 is used by several applications and packages, while the Forge compiler and adapters also target React, Solid, Svelte, and Web Components; `service-monitor` uses RedwoodSDK/React. The repository follows a composable, package-driven architecture where reusable building blocks live in `packages/` and deployable applications and workbenches are assembled from those building blocks in `apps/`.

### Current Applications

The `apps/` workspace currently contains:

- `docs/`: Vite + Vue documentation site.
- `figma-forge-plugin/`: Figma plugin for Forge workflows.
- `my-care-notes/`: Care-notes application.
- `service-monitor/`: RedwoodSDK service health dashboard backed by a Durable Object.
- `storybook/`: Multi-framework component workbench and visual testing suite.
- `website/`: Mission Platform marketing and product website.

## Key Documentation Resources

### Essential Guides

- **[Best Practices](docs/best-practices.md)**: Essential guidelines for developing, testing, and maintaining applications in the Mission Platform monorepo
- **[Migration Guide](docs/migration-guides/vue2-to-vue3.md)**: Step-by-step guide for migrating from Vue 2 to Vue 3
- **[API Reference](docs/api-reference.md)**: References for all Mission Platform packages and framework adapters
- **[Troubleshooting](docs/troubleshooting.md)**: Common issues and solutions for debugging and performance optimization

### Development Setup

- **[Development Setup](docs/development-setup.md)**: Detailed instructions for setting up your development environment
- **[Workspace Structure](docs/workspace-structure.md)**: Overview of the repository's directory structure
- **[Package Development](docs/package-development.md)**: Guidelines for developing and publishing packages
- **[Project and Worktree Setup](docs/guides/project-and-worktree-setup.md)**: Provisioning isolated worktrees and project board tracking

### Testing

- **[Testing](docs/testing.md)**: Comprehensive testing strategies and tools
- **[Build System](docs/build-system.md)**: Overview of the build system and configuration

### MCP Server

- **[MCP Server](mcp/README.md)**: Model Context Protocol servers (`mcp/developer` and `mcp/consumer`) that help AI assistants use the monorepo. Build them with `pnpm exec turbo run build --filter @mission-platform/mcp-*`, then run the compiled output with `node mcp/developer/dist/index.js` or `node mcp/consumer/dist/index.js`.

## Core Principles

### Dependency Direction

Code in `packages/` must never import from `apps/`. The dependency flow is strictly one-way: `apps/` consume reusable members from `packages/`, while domain packages may depend on lower-level `core`, `tooling`, and compiler contracts without importing applications.

### Asset Discovery & Anti-Invention Policy

Before writing any new code, assistants must inspect existing monorepo assets using MCP tools (`list_components`, `get_component_usage`, `lsp_find_symbol`, `lsp_list_symbols`) and filesystem inspection. Inventing duplicate components, custom color hexes/spacings, or redundant utility functions is strictly prohibited:

1. **Zero Redundant Primitives**: Never invent custom buttons, modals, dropdowns, or tooltips; reuse `@mission-platform/components`.
2. **Design Tokens First**: Never hardcode colors, spacing, radii, or shadows; always reference `--mp-*` CSS custom properties from `@mission-platform/tokens`.
3. **Shared Utilities**: Search `packages/` before writing custom helper routines for data transformation, math, dates, or strings.
4. **Localization**: Never hardcode user-facing strings; declare them in YAML message catalogs and use `@mission-platform/i18n`.

### Secure Coding & Compliance (OWASP 2025, CWE Top 25 & ISO 27001)

All code and configurations in the monorepo must adhere to **ISO/IEC 27001:2022 Control A.8.28 (Secure Coding)** and eliminate vulnerabilities cataloged in the **OWASP Top 10 (2025)** and **CWE Top 25**:

1. **Zero Secret Leaks (ISO A.8.12 / CWE-798)**: Never commit credentials, private keys, or cloud tokens.
2. **Injection Defense (OWASP A05 / CWE-79, CWE-78, CWE-89)**: Always sanitize HTML markup (`DOMPurify.sanitize`), parameterize queries, and use vector arguments (`execFile`) instead of string shell interpolation.
3. **Cryptographic & Supply Chain Rigor (OWASP A04, A03 / ISO A.8.20, A.8.25)**: Use modern cryptography (SHA-256, `crypto.getRandomValues`), avoid `Math.random()` for security, avoid unvetted `postinstall` lifecycle scripts, and pin dependencies via catalog references.
4. **Automated Verification**: Run `security_scan_secrets`, `security_analyze_code`, `security_audit_dependencies`, and `security_collect_compliance_evidence` to verify zero security regressions before proposing PRs.

### Isolation of Concerns

New UI components, composables, utilities, or design tokens belong in `packages/`, not embedded inside an app. New shared lint/format/build tooling belongs in `packages/tooling/configs/`.

### Storybook as Workbench

When adding or modifying components in `packages/`, always add or update corresponding stories (`.stories.tsx`) colocated in the component directory. The Storybook workbench in `apps/storybook` automatically discovers package stories and executes them across all five supported framework renders (Vue, React, Solid, Svelte, Web Components).

### Multi-Worktree Execution & Upstream Build Dependencies

1. **Worktree Isolation**: Parallel workstreams must use isolated Git worktrees provisioned via `node --experimental-strip-types scripts/worktree-manager.ts create <branch>`.
2. **Upstream Build Priming**: In freshly provisioned worktrees, `node_modules` is linked via APFS, but internal workspace compilation artifacts in `dist/` may be missing. Before running unit tests or typechecks for a specific package, always build its upstream workspace dependencies:
   ```bash
   pnpm exec turbo run build --filter <package-name>^...
   ```
3. **Shared Turbo Cache**: All worktrees share `.turbo/cache` with the root workspace. Avoid wiping or bypassing `.turbo/cache`.

### Portable Language Server Configuration

All LSP server definitions in `agent-lsp.json` must be portable:

- Never hardcode absolute system paths (e.g. `/Users/...` or `<workspace>`).
- Use relative executable invocations: `["pnpm", "exec", "<server>", "--stdio"]` or `["pnpm", "--dir", "relative/path", ...]`.
- The MCP LSP server automatically executes language server processes within the detected repository or worktree root.

### Forge Web Script and scanner validation

- Treat Forge Web Script LSP diagnostics as source-level feedback only; they do not prove that a linked multi-module graph emits valid Wasm or that its runtime ABI executes correctly.
- For scanner graph changes, run the focused graph suite, package `build:check`, and the package Vitest suite; record artifact-emission failures separately from source diagnostics.
- Passing a fixture or reduced decoder path does not establish full ZXing parity. Mark unsupported modes, format subsets, metadata, retries, and public-contract migrations explicitly in the plan and pull request.
- When static linking fails, capture the graph module/edge counts, emitter diagnostic, and the smallest isolated reproducer before changing algorithm code or weakening tests.

### Continuous Improvement

Each run should improve the efficiency, effectiveness, and reliability of future runs. Use the smallest evidence-based scope that can validate the requested change, reuse repository conventions and existing tooling, record meaningful verification results, and refine the approach when a command, assumption, or workflow proves unreliable. Do not trade away correctness, coverage, or required validation for speed.

## Mode Selection Guidelines

### Decision Tree for Interaction Mode

1. Greetings, small talk, quick factual questions, simple math → `[CHAT]`
2. Requests to explain, analyze, find relevant information/code, or propose options, without asking for project changes → `[ADVANCED_CHAT]`
3. Run app/tests or short safe commands (no edits) → `[RUN_VERIFY]`
4. Truly trivial edit or micro-refactor, done in 1–3 steps, single file, without additional context gathering → `[FAST_CODE]`
5. Build, install, configure infrastructure, fix broken environment, check system state → `[SETUP]`
6. Any non-trivial project changes (more than 1–3 steps, multiple files, needs investigation) → `[CODE]`
7. ONLY when NO other mode fits: forensics, reverse engineering, data recovery, security research — minimal or no code writing → `[NICHE]`

### Mode Persistence Rules

- `[CHAT]` → switching modes is strictly forbidden
- `[ADVANCED_CHAT]` → switch to `[CODE]` if, after analysis/answer, user explicitly asks to implement changes or modify project
- `[FAST_CODE]` → must switch to `[CODE]` if can't finish after 3 steps
- `[CODE]` → switching modes is strictly forbidden
- `[RUN_VERIFY]` → must switch to `[CODE]` if can't finish after 3 steps
- `[SETUP]` → may switch to `[CODE]` if modification code is required after setup
- `[NICHE]` → may switch to `[CODE]` if task reveals need for significant code implementation

## Code Style Standards

### TypeScript Everywhere

All new files must be `.ts` or `.vue` (using `<script setup lang="ts">`). Avoid plain `.js`/`.jsx` for new source code. Provide explicit types for public APIs, exported functions, and composables, and prefer type-safe patterns over `any`.

### Coding & Linting Conventions

- **Undefined vs Null**: Adhere to `unicorn/no-useless-undefined` and repo style by strictly using `undefined` for absent or cleared values unless an external protocol explicitly requires `null`.
- **Event Handler Casing in Forge JSX**: Always use standard camelCase event props on JSX elements (e.g. `onKeyDown`, `onPointerDown`, `onMouseDown`) so that compiled adapters for React, Vue, and Solid attach native event listeners properly.
- **Import Ordering & Grouping (`import-x/order`)**:
  - Group imports strictly: (1) Built-in node modules (`node:*`), (2) External dependencies, (3) Internal workspace packages (`@mission-platform/*`), (4) Relative sibling/parent files (`./*`, `../*`).
  - **Zero blank lines within any single import group**: An empty line inside an import group triggers an ESLint error and breaks CI lint gates. Separate distinct groups with exactly one blank line.
- **Pre-Commit Verification**: Run `pnpm --filter <pkg> run lint` and `pnpm --filter <pkg> run lint:style`. If import order or style errors occur, run `pnpm --filter <pkg> exec eslint --fix <file>`. Prettier formatting (`format:write`) applies to stories and Markdown documentation.

### Verification Strategy & Test Architecture

- **End-to-End Generation vs Isolated Unit Tests**:
  - Compiler, transpiler, AST transformation, and code generation changes (e.g., Forge Vite compiler, CMS drivers, entry synthesis) cannot be validated by unit testing discovery or lowering in isolation.
  - Always implement end-to-end integration tests (e.g. `generateFrameworkSources`) proving that:
    1. Components with identical basenames in different directories emit to separate, non-colliding output files.
    2. Entry points generate unambiguous, correctly resolved re-exports.
    3. Emitted file contents survive without clobbering.
- **Forge Target Lowering Contract**:
  - In `@mission-platform/forge-plugin-api`, `TargetIntentions.lowered` is mandatory (`assertTargetIntentionsLowered`).
  - Target plugins (`forge-react`, `forge-vue`, `forge-solid`, `forge-svelte`, `forge-web-components`) strictly require lowered plans and no longer support direct-generation fallback lowering.
  - Test fixtures, mocks, and CMS integration plugins (`forge-cms-plugin-api`) must supply a valid `lowered` plan object (`{ framework, appliedOptimizations: [] }`) or execute `lower -> optimize -> generate` in sequence.
- **Test Timeouts under Parallel Load**:
  - Running full workspace tests (`pnpm test` / `turbo run test` across 90+ packages) creates intense CPU and I/O concurrency.
  - Tests performing multi-framework compilations, documentation extractions, or large AST fixtures must specify explicit timeouts of `60_000` to `120_000` ms (e.g., `{ timeout: 60_000 }` or `it(..., 120_000)` in Vitest).
- **Subagent Implementation & Review Workflow**:
  - For plan steps touching cross-cutting subsystems, pair coding passes with an independent review subagent.
  - Reviewers should focus specifically on end-to-end behavioral verification, missing negative tests, and package-scoped lint gates before marking steps complete.

### Robust Generation & File Management

- **Atomic Staging**: Never wipe or delete target directories (`rmSync`) before generation completes. Always stage artifacts in a sibling attempt directory (`createForgeArtifactWriter` or `.forge-attempt/`), run pre-commit diagnostic checks, and atomically swap into place only when all checks pass.
- **Preserve Repository Dotfiles**: When synchronizing or pruning build target directories (e.g. `dist/cms/<target>`), preserve repository dotfiles (`.gitkeep`, `.gitignore`) and in-flight staging directories.

### Language Server Protocol (LSP) Resilience

- **Active Session Requirement**: Tools that query or execute via LSP (such as `lsp_run_tests`, `lsp_get_diagnostics`, or symbol inspection) require an active session for the given language. Verify with `lsp_status` and initialize with `lsp_start` when no session is active.
- **TypeScript 7 Experimental Native LSP**: The `typescript` server runs `tsc --lsp --stdio` (`typescript-go` 7.0.2). It provides fast, zero-configuration diagnostics via `get_diagnostics`. However, whole-workspace document symbol queries or hover requests may time out during indexing in large monorepos; configure protocol timeouts to 15,000–30,000 ms (`DEFAULT_TIMEOUT_MS`) and complement with package-scoped typecheck (`pnpm --filter <pkg> run build:check`) and Vitest.
- **Monorepo Startup Latency**: In large workspaces with multiple project references, TypeScript language server startup may exceed 5 seconds. Configure protocol client timeouts to at least 15,000–30,000 ms (`DEFAULT_TIMEOUT_MS`).
- **Graceful Diagnostic Fallback**: If an LSP server times out during initial startup or file discovery, fall back to package-scoped typecheck (`pnpm --filter <pkg> run build:check`) and Vitest to avoid blocking workflow progress.

<!-- agent-lsp:rules:start -->

## agent-lsp Skills

agent-lsp provides 66 code intelligence tools and 23 workflow skills.
Prefer these tools over text search for code intelligence tasks.

**Before editing code:** call `blast_radius` for blast-radius analysis.
**Before applying edits:** call `preview_edit` to preview the diagnostic delta.
**After any change:** call `get_diagnostics`, then `run_build` and `run_tests`.

**Task-to-tool mapping (use these instead of Read/Grep for code):**

| Task                     | Use this              | Not this                  |
| ------------------------ | --------------------- | ------------------------- |
| See file structure       | `list_symbols`        | `Read` + manual scanning  |
| Find a symbol by name    | `find_symbol`         | `Grep` across files       |
| Find all usages          | `find_references`     | `Grep` for the name       |
| Understand a symbol      | `inspect_symbol`      | `Read` the file           |
| What calls this function | `find_callers`        | `Grep` for the name       |
| Replace a function body  | `replace_symbol_body` | `Edit` with text matching |
| Delete unused symbol     | `safe_delete_symbol`  | `Edit` to remove lines    |

| Skill                    | Description                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `/lsp-architecture`      | Generate a structural architecture overview of a codebase: languages, package map, entry points, dependency graph, an... |
| `/lsp-concurrency-audit` | Concurrency safety audit for a type or file. Maps all fields, traces which are accessed from concurrent contexts (gor... |
| `/lsp-cross-repo`        | Cross-repository analysis — find all callers of a library symbol in one or more consumer repos. Use when refactorin...   |
| `/lsp-dead-code`         | Enumerate exported symbols in a file and surface those with zero references across the workspace. Use when auditing f... |
| `/lsp-docs`              | Three-tier documentation lookup for any symbol — hover → offline toolchain doc → source definition. Use when ho...       |
| `/lsp-edit-export`       | Safe workflow for editing exported symbols or public APIs. Use when changing a function signature, modifying a public... |
| `/lsp-edit-symbol`       | Edit a named symbol without knowing its file or position. Use when you want to change a function, type, or variable b... |
| `/lsp-explore`           | Tell me about this symbol": hover + implementations + call hierarchy + references in one pass — for navigating unfa...   |
| `/lsp-extract-function`  | Extract a selected code block into a named function. Primary path uses the language server's extract-function code ac... |
| `/lsp-fix-all`           | Apply available quick-fix code actions for all current diagnostics in a file, one at a time with re-collection betwee... |
| `/lsp-format-code`       | Format a file or selection using the language server's formatter. Use before committing to apply consistent style, or... |
| `/lsp-generate`          | Trigger language server code generation — implement interface stubs, generate test skeletons, add missing methods, ...   |
| `/lsp-impact`            | Blast-radius analysis for a symbol or file — shows all callers, type supertypes/subtypes, and reference count befor...   |
| `/lsp-implement`         | Find all concrete implementations of an interface or abstract type. Use when you need to know what types satisfy an i... |
| `/lsp-inspect`           | Full code quality audit for a file, package, or directory. Supports batch mode (directory walk with --top ranking), c... |
| `/lsp-local-symbols`     | Fast file-scoped symbol analysis — find all usages of a symbol within the current file, list all symbols defined in...   |
| `/lsp-onboard`           | First-session project onboarding. Explores the project structure, detects build system, test runner, entry points, an... |
| `/lsp-refactor`          | End-to-end safe refactor workflow — blast-radius analysis, speculative preview, apply to disk, verify build, run af...   |
| `/lsp-rename`            | Two-phase safe rename across the entire workspace. Use when renaming any symbol, function, method, variable, type, or... |
| `/lsp-safe-edit`         | Wrap any code edit with before/after diagnostic comparison. Speculatively previews the change first (preview_edit), t... |
| `/lsp-simulate`          | Speculative code editing session — simulate changes in memory before touching disk. Use when planning edits that mi...   |
| `/lsp-test-correlation`  | Find and run the tests that cover a source file. Use after editing a file to discover exactly which test files and te... |
| `/lsp-understand`        | Deep-dive exploration of unfamiliar code — given a symbol or file, builds a complete Code Map showing type info, im...   |
| `/lsp-verify`            | Full three-layer verification after any change — LSP diagnostics + compiler build + test suite, ranked by severity....   |

Call `prompts/get` with any skill name for full workflow instructions.
<!-- agent-lsp:rules:end -->

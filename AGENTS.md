# Agents Guidelines

This document provides guidelines for agents working on the Mission Platform.

## Project Overview

The Mission Platform is a VueJS 3 monorepo managed with pnpm workspaces. It follows a composable, package-driven architecture where reusable building blocks live in `packages/` and deployable applications are assembled from those building blocks in `apps/`.

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

### Testing
- **[Testing](docs/testing.md)**: Comprehensive testing strategies and tools
- **[Build System](docs/build-system.md)**: Overview of the build system and configuration

### MCP Server
- **[MCP Server](mcp/README.md)**: Model Context Protocol servers (`mcp/developer` and `mcp/consumer`) that help AI assistants use the monorepo. Build them with `pnpm exec turbo run build --filter @mission-platform/mcp-*`, then run the compiled output with `node mcp/developer/dist/index.js` or `node mcp/consumer/dist/index.js`.

## Core Principles

### Dependency Direction
Code in `packages/`, `configs/`, `vite-plugins/`, and `workers/` must never import from `apps/`. The dependency flow is strictly one-way: `apps` → `packages`/`vite-plugins`/`workers` → `configs` (and `apps` → `configs` directly for tooling).

### Isolation of Concerns
New UI components, composables, utilities, or design tokens belong in `packages/`, not embedded inside an app. New shared lint/format/build tooling belongs in `configs/`.

### Storybook as Workbench
When adding or modifying components in `packages/`, add or update corresponding stories in `apps/storybook`.

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

<!-- agent-lsp:rules:start -->
## agent-lsp Skills

agent-lsp provides 66 code intelligence tools and 23 workflow skills.
Prefer these tools over text search for code intelligence tasks.

**Before editing code:** call `blast_radius` for blast-radius analysis.
**Before applying edits:** call `preview_edit` to preview the diagnostic delta.
**After any change:** call `get_diagnostics`, then `run_build` and `run_tests`.

**Task-to-tool mapping (use these instead of Read/Grep for code):**

| Task | Use this | Not this |
|------|----------|----------|
| See file structure | `list_symbols` | `Read` + manual scanning |
| Find a symbol by name | `find_symbol` | `Grep` across files |
| Find all usages | `find_references` | `Grep` for the name |
| Understand a symbol | `inspect_symbol` | `Read` the file |
| What calls this function | `find_callers` | `Grep` for the name |
| Replace a function body | `replace_symbol_body` | `Edit` with text matching |
| Delete unused symbol | `safe_delete_symbol` | `Edit` to remove lines |

| Skill | Description |
|-------|-------------|
| `/lsp-architecture` | Generate a structural architecture overview of a codebase: languages, package map, entry points, dependency graph, an... |
| `/lsp-concurrency-audit` | Concurrency safety audit for a type or file. Maps all fields, traces which are accessed from concurrent contexts (gor... |
| `/lsp-cross-repo` | Cross-repository analysis — find all callers of a library symbol in one or more consumer repos. Use when refactorin... |
| `/lsp-dead-code` | Enumerate exported symbols in a file and surface those with zero references across the workspace. Use when auditing f... |
| `/lsp-docs` | Three-tier documentation lookup for any symbol — hover → offline toolchain doc → source definition. Use when ho... |
| `/lsp-edit-export` | Safe workflow for editing exported symbols or public APIs. Use when changing a function signature, modifying a public... |
| `/lsp-edit-symbol` | Edit a named symbol without knowing its file or position. Use when you want to change a function, type, or variable b... |
| `/lsp-explore` | Tell me about this symbol": hover + implementations + call hierarchy + references in one pass — for navigating unfa... |
| `/lsp-extract-function` | Extract a selected code block into a named function. Primary path uses the language server's extract-function code ac... |
| `/lsp-fix-all` | Apply available quick-fix code actions for all current diagnostics in a file, one at a time with re-collection betwee... |
| `/lsp-format-code` | Format a file or selection using the language server's formatter. Use before committing to apply consistent style, or... |
| `/lsp-generate` | Trigger language server code generation — implement interface stubs, generate test skeletons, add missing methods, ... |
| `/lsp-impact` | Blast-radius analysis for a symbol or file — shows all callers, type supertypes/subtypes, and reference count befor... |
| `/lsp-implement` | Find all concrete implementations of an interface or abstract type. Use when you need to know what types satisfy an i... |
| `/lsp-inspect` | Full code quality audit for a file, package, or directory. Supports batch mode (directory walk with --top ranking), c... |
| `/lsp-local-symbols` | Fast file-scoped symbol analysis — find all usages of a symbol within the current file, list all symbols defined in... |
| `/lsp-onboard` | First-session project onboarding. Explores the project structure, detects build system, test runner, entry points, an... |
| `/lsp-refactor` | End-to-end safe refactor workflow — blast-radius analysis, speculative preview, apply to disk, verify build, run af... |
| `/lsp-rename` | Two-phase safe rename across the entire workspace. Use when renaming any symbol, function, method, variable, type, or... |
| `/lsp-safe-edit` | Wrap any code edit with before/after diagnostic comparison. Speculatively previews the change first (preview_edit), t... |
| `/lsp-simulate` | Speculative code editing session — simulate changes in memory before touching disk. Use when planning edits that mi... |
| `/lsp-test-correlation` | Find and run the tests that cover a source file. Use after editing a file to discover exactly which test files and te... |
| `/lsp-understand` | Deep-dive exploration of unfamiliar code — given a symbol or file, builds a complete Code Map showing type info, im... |
| `/lsp-verify` | Full three-layer verification after any change — LSP diagnostics + compiler build + test suite, ranked by severity.... |

Call `prompts/get` with any skill name for full workflow instructions.
<!-- agent-lsp:rules:end -->

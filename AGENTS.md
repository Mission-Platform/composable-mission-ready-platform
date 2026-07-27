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
- **[MCP Server](mcp/README.md)**: A Model Context Protocol server (`mcp/`) that helps AI assistants use the monorepo — component usage, and package/app/worker creation and development. Build it with `pnpm exec turbo run build --filter @mission-platform/mcp`, then run the compiled output with `node mcp/dist/index.js`.

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
# Mission Platform Best Practices

This document outlines the core principles, architecture, and coding standards for the Mission Platform monorepo. It serves as an **Explanation** of why we follow certain patterns and a **Guideline** for day-to-day development.

## Core Principles

### Composable Architecture
Mission Platform follows a package-driven, composable architecture. Reusable building blocks (UI components, composables, utilities) live in `packages/`, while deployable applications are assembled from these blocks in `apps/`.

### Dependency Discipline
To maintain a maintainable monorepo, we enforce a strict one-way dependency flow:
- **`apps`** → **`packages`** / **`vite-plugins`** / **`workers`**
- **`packages`** / **`vite-plugins`** / **`workers`** → **`configs`**
- **`apps`** → **`configs`** (Directly for tooling/build config)

**Rule:** Code in `packages/` must **never** import from `apps/`. This prevents circular dependencies and ensure packages remain truly reusable.

### Storybook as Workbench
When adding or modifying components in `packages/`, use the Storybook app (`apps/storybook`) as your primary development environment. The `apps/storybook` app does not contain the stories itself — it is the aggregating workbench that discovers and renders the stories that live alongside their components.
- Co-locate each `.stories.tsx` file with its component inside that component's package directory (e.g. `packages/components/src/components/**/<component>/<component>.stories.tsx`), not under `apps/storybook`. This matches the convention in [Atomic Component Design](atomic-component-design.md).
- Verify component behavior across different frameworks by switching the `STORYBOOK_FRAMEWORK` environment variable.

## Development Standards

### TypeScript Everywhere
All new source code must be written in TypeScript (`.ts`) or Vue SFCs with `<script setup lang="ts">`.
- **Strict Mode**: `strict: true` is enforced across all `tsconfig.json` files.
- **Explicit Types**: Provide explicit types for all public APIs, exported functions, and composables.
- **Avoid `any`**: Use precise types or generics. If a type is truly unknown, use `unknown` and perform type narrowing.

### Framework-Neutral Components
Whenever possible, author UI components using the `@mission-platform/forge` dialect. This allows components to be compiled and used in multiple frameworks (Vue, React, Solid, etc.) without rewriting the core logic.

### Reactivity Patterns (Vue 3)
- Use the **Composition API** exclusively.
- Prefer `ref()` for most state to maintain consistency.
- Extract complex stateful logic into **Composables** (`useXxx`).
- Ensure all side effects (watchers, intervals, event listeners) are properly cleaned up in `onUnmounted`.

## Monorepo Workflow

### Isolation of Concerns
- **New UI Components**: Belong in `packages/`.
- **Shared Utilities**: Belong in `packages/`.
- **Lint/Format/Build Tooling**: Shared configurations belong in `configs/`.

### Linting and Formatting
Consistent code style is enforced via ESLint and Prettier.
- Run `pnpm lint` to check for violations.
- Run `pnpm format:write` to automatically fix formatting issues.
- Commit messages must follow the **Conventional Commits** specification.

## Performance Optimization

- **Code Splitting**: Use dynamic `import()` for non-critical features and large libraries.
- **Asset Optimization**: Prefer modern image formats (WebP/AVIF) and ensure all static assets are compressed.
- **Reactivity Overhead**: Use `shallowRef` for large objects that do not require deep reactivity.

## Testing and Documentation

- **Test-Driven Development**: Every new feature or bug fix should be accompanied by unit tests (`.spec.ts`).
- **Diátaxis Documentation**: Author documentation following the Diátaxis framework (Tutorials, How-to, Reference, Explanation).
- **TSDoc**: Use TSDoc/JSDoc for all public-facing methods and properties to power IDE intelligence.

## Related Resources
- [Testing Guide](testing.md)
- [Framework Best Practices](framework-best-practices.md)
- [Workspace Structure](workspace-structure.md)
- [Troubleshooting](troubleshooting.md)
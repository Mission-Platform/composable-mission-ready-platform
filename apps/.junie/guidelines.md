# Mission Platform – Apps Guidelines

> These guidelines cover the `apps/` workspace layer.
> For monorepo-wide conventions (packages, tokens, i18n, components, icons) see the root `.junie/guidelines.md`.

---

## Package Manager

**Always use `pnpm`.** Never use `npm` or `yarn`.

```bash
# Install all workspace dependencies from the repo root
pnpm install

# Add a dependency to a specific app
pnpm --filter @mission-platform/<app-name> add <package>

# Add a dev dependency to a specific app
pnpm --filter @mission-platform/<app-name> add -D <package>
```

---

## Apps in this workspace

| App                               | Path                 | Description                                                                         |
|-----------------------------------|----------------------|-------------------------------------------------------------------------------------|
| `@mission-platform/my-care-notes` | `apps/my-care-notes` | My Care Notes application                                                           |
| `@mission-platform/storybook`     | `apps/storybook`     | Storybook instance for developing, documenting, and visually testing Vue components |

---

## Development Workflow

```bash
# Run dev server for an app (from repo root)
pnpm --filter @mission-platform/my-care-notes dev
pnpm --filter @mission-platform/storybook storybook

# Run tests for an app
pnpm --filter @mission-platform/my-care-notes test

# Run tests across all apps
pnpm --filter "./apps/**" test

# Build all apps
pnpm --filter "./apps/**" build

# Lint an app
pnpm --filter @mission-platform/my-care-notes lint

# Format an app
pnpm --filter @mission-platform/my-care-notes format
```

---

## App Conventions

- Each app lives in `apps/<app-name>/` with its own `package.json`, `tsconfig.json`, and `vite.config.ts`.
- App package names follow the scoped convention `@mission-platform/<app-name>`.
- Apps are **always `"private": true`** — they are never published to a registry.
- Shared packages are referenced as workspace dependencies: `"@mission-platform/components": "workspace:*"`.
- All source files must be `.ts` or `.vue` (using `<script setup lang="ts">`). No plain `.js` files.
- Linting, formatting, and stylelint configs must extend the shared `@mission-platform/eslint-config`,
  `@mission-platform/prettier-config`, and `@mission-platform/stylelint-config` packages.

---

## Adding a new app

1. Create `apps/<app-name>/`.
2. Add `package.json` with `"name": "@mission-platform/<app-name>"` and `"private": true`.
3. Wire up shared configs: `eslint.config.js`, `prettier.config.js`, `stylelint.config.js`.
4. Add workspace dependencies in `package.json` using `"workspace:*"` protocol.
5. Run `pnpm install` from the repo root to link workspace packages.
6. Add Storybook stories in `apps/storybook` for any new components introduced.

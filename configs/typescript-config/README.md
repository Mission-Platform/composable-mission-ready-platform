# @mission-platform/typescript-config

Shared TypeScript base configurations for every Mission Platform workspace.

This package exposes a set of `tsconfig.*.json` presets that capture the project-wide TypeScript standards (target,
libs, linting flags, Vue/DOM types, declaration emit settings, etc.). Apps and packages **must** extend these presets
rather than redefining the same options locally.

## Presets

| Preset                        | Subpath import                                      | Use case                                            |
| ----------------------------- | --------------------------------------------------- | --------------------------------------------------- |
| `tsconfig.base.json`          | `@mission-platform/typescript-config`               | Shared linting flags only — building block          |
| `tsconfig.app.json`           | `@mission-platform/typescript-config/app`           | Vue 3 / DOM app source — type-checks `src/**`       |
| `tsconfig.react.json`         | `@mission-platform/typescript-config/react`         | React / DOM app source — type-checks React JSX      |
| `tsconfig.library.json`       | `@mission-platform/typescript-config/library`       | Library source — emits `.d.ts` to `dist/`           |
| `tsconfig.node.json`          | `@mission-platform/typescript-config/node`          | Node tooling — `vite.config.ts`, `vitest.config.ts` |
| `tsconfig.test.json`          | `@mission-platform/typescript-config/test`          | Vitest specs — pulls in `vitest/globals` types      |
| `tsconfig.stories.json`       | `@mission-platform/typescript-config/stories`       | Vue Storybook stories — `src/**/*.stories.{ts,tsx}` |
| `tsconfig.stories-react.json` | `@mission-platform/typescript-config/stories-react` | React Storybook stories                             |

## Usage

Add the package as a `devDependency`:

```jsonc
{
  "devDependencies": {
    "@mission-platform/typescript-config": "workspace:*",
  },
}
```

### App (`apps/<app-name>`)

```jsonc
// tsconfig.json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}

// tsconfig.app.json
{
  "extends": "@mission-platform/typescript-config/app",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo"
  }
}

// tsconfig.node.json
{
  "extends": "@mission-platform/typescript-config/node",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo"
  }
}
```

### Library package (`packages/<name>`)

```jsonc
// tsconfig.json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.test.json" }
  ]
}

// tsconfig.app.json — use the library preset when building .d.ts files
{
  "extends": "@mission-platform/typescript-config/library",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo"
  }
}

// tsconfig.test.json
{
  "extends": "@mission-platform/typescript-config/test",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.test.tsbuildinfo"
  }
}
```

## Conventions

- Always set a workspace-local `tsBuildInfoFile` so incremental builds are isolated per workspace.
- Do **not** redefine `lib`, `types`, `noUnusedLocals`, `noUnusedParameters`,
  `erasableSyntaxOnly`, or `noFallthroughCasesInSwitch` — they come from the preset and are part of the platform
  standard.
- Override locally only what is genuinely workspace-specific (e.g. `paths`, extra `types`, `rootDir`).

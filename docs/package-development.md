# Package Development

This guide describes how to create, develop, and publish reusable packages within the Mission Platform monorepo. Packages are the foundational building blocks of the platform, residing in the `packages/` directory and managed via pnpm workspaces and Turborepo.

## Creating a New Package

The recommended way to create a package is using the Mission Platform Developer MCP tool, which ensures all configurations, scripts, and folder structures follow the platform's standards.

### 1. Scaffold with MCP

Use the `scaffold_package` tool to generate the skeleton.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

This generates a convention-compliant `packages/date-utils/` directory with:
- `package.json` with workspace-ready scripts and shared configurations.
- `tsconfig.json` extending the platform defaults.
- `vite.config.ts` for optimized builds.
- `src/index.ts` barrel file.
- `llms.txt` for AI-assisted documentation.

### 2. Manual Setup (Optional)

If you are not using the MCP tool, ensure your `package.json` uses [pnpm catalogs](https://pnpm.io/catalogs) for dependency management and follows the scoped naming convention:

```json
{
  "name": "@mission-platform/your-package-name",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "pnpm exec turbo run build --filter @mission-platform/your-package-name",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --check ."
  },
  "devDependencies": {
    "@mission-platform/eslint-config": "workspace:*",
    "@mission-platform/prettier-config": "workspace:*"
  }
}
```

## Package Structure

Each package follows a strict internal layout. Units of code (components, composables, stores, or utils) MUST live in their own named subdirectories with co-located tests.

```text
packages/<name>/
├── src/
│   ├── components/                 # Atomic components (atoms, molecules, etc.)
│   │   ├── atoms/
│   │   │   └── forge-button/        # forge-button.tsx + .stories.tsx + .spec.ts
│   │   └── index.ts                # Component re-exports
│   ├── composables/
│   │   └── use-date-format/        # use-date-format.ts + .spec.ts
│   ├── stores/
│   │   └── date-store/             # date-store.ts + .spec.ts
│   ├── utils/
│   │   └── date-validator/         # date-validator.ts + .spec.ts
│   ├── locales/                    # i18n JSON files
│   └── index.ts                    # Package public API (barrel)
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Development Workflow

### Authoring Rules

1.  **TypeScript Everywhere**: All source code must be in `.ts` or `.tsx` (using `@mission-platform/forge`).
2.  **Framework Neutrality**: Favor framework-agnostic logic. Components should be authored once in Forge JSX to target multiple frameworks.
3.  **Isolation**: Packages must never import from `apps/`.
4.  **Testing**: Every unit (composable, store, util, component) MUST have a co-located `.spec.ts` file.

For detailed authoring instructions, see:
- [Atomic Component Design](atomic-component-design.md)
- [Composable Authoring](composable-authoring.md)
- [Store Authoring](store-authoring.md)
- [Util Authoring](util-authoring.md)

### Building

Build the package using Turbo to ensure dependencies are built in the correct order:

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### Testing

Run tests using Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

## Documentation (`llms.txt`)

Every package includes an `llms.txt` file at its root. This file provides a concise, technical description of the package's APIs, components, and behavior, enabling AI assistants to better understand and use the package.

- **Title**: Use the scoped package name.
- **Components/APIs**: Table or list of available symbols with their props and responsibilities.
- **Examples**: Short code snippets for common use cases.

## Publishing

The Mission Platform uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

1.  **Add a Changeset**: After making changes, run:
    ```bash
    pnpm changeset
    ```
    Select the package and the type of change (patch, minor, major).
2.  **Commit the Changeset**: Commit the generated `.changeset/*.md` file.
3.  **Version and Publish**: CI/CD handles the actual publishing, but you can locally preview versions with:
    ```bash
    pnpm changeset version
    ```

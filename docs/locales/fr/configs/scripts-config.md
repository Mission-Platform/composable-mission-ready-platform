# Shared Utility Scripts

This guide intentionally remains in the project documentation tier: `scripts/`
is a private workspace package containing repository orchestration rather than a
publishable library.
Package- and application-specific commands remain documented beside their
owning workspace.

The Mission Platform maintains a set of shared utility scripts in the root
`scripts/` directory. Their package scripts are registered as Turbo tasks, while
the root `package.json` exposes convenience wrappers that delegate to Turbo.

## Overview

These scripts automate common monorepo tasks, such as local development setup and build verification. Translation
extraction is defined by each app or package and orchestrated from the repository root with Turborepo.

## Available Scripts

### Turbo task families

Use the root wrappers for the repository utilities below. Each command is a
separate task, so Turbo can hash and schedule it independently:

| Command                              | Purpose                                                                           | Cache policy                                                                |
| :----------------------------------- | :-------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| `pnpm validate`                      | Run the standalone component-property static check through Turbo. | The task is cached independently.                           |
| `pnpm docs:generate`                 | Generate package and extension reference documentation.           | Generated reference files are cached.                       |
| `pnpm validate:exports`              | Verify package export maps and built targets.                     | Cacheable when its inputs are unchanged.                    |
| `pnpm validate:component-properties` | Check component property declarations against source styles.      | Cacheable and output-free.                                  |
| `pnpm validate:inventory`            | Produce the runtime validation inventory.                         | Cacheable artifacts under `.artifacts/runtime-validation/`. |
| `pnpm validate:framework`            | Validate framework runtime coverage.                              | Cacheable artifacts under `.artifacts/runtime-validation/`. |
| `pnpm validate:app`                  | Validate application runtime coverage.                            | Cacheable artifacts under `.artifacts/runtime-validation/`. |
| `pnpm validate:target`               | Validate configured Storybook targets.                            | Cacheable artifacts under `.artifacts/runtime-validation/`. |
| `pnpm validate:runtime`              | Run the full runtime validation suite.                            | Not cached because it starts external runtime processes.    |
| `pnpm visual:parity`                 | Compare rendered Storybook output across frameworks.              | Not cached because it starts development servers.           |
| `pnpm test:runtime-validation`       | Run the focused runtime-validation unit tests.                    | Cacheable according to the test task inputs.                |

The utility task inputs are declared in `turbo.json`; repository-wide inputs use
`$TURBO_ROOT$` so they remain correct when the task runs from the `scripts/`
workspace. Generated runtime and visual artifacts are written beneath
`.artifacts/` and are not treated as source inputs.

`pnpm validate:exports` is intentionally a separate post-build gate because it
checks files in package `dist/` directories. Run it after `pnpm build`, as the
Chromatic static-gates job does.

### i18n Extraction (`i18n:extract`)

Each app or package that owns translations provides an `i18n:extract` script and `i18next.config.ts`. The command writes
namespace bundles under each workspace's `locales/<locale>/` directory. Run extraction for all configured workspaces from
the repository root:

```bash
pnpm i18n:extract
```

### Dev Certificate Generation (`generate-dev-cert.ts`)

Generates local SSL/TLS certificates for HTTPS development. This is useful for testing features that require a secure
context (e.g., camera access via `@mission-platform/code-scanner`).

```bash
pnpm exec tsx scripts/generate-dev-cert.ts
```

### Framework Resolution Verification (`verify-framework-resolution.mjs`)

Verifies that `@mission-platform/*` package exports correctly resolve to the intended framework build (Vue, React, etc.)
based on the environment's export conditions.

```bash
node scripts/verify-framework-resolution.mjs
```

### Documentation generation (`docs:generate`)

Documentation generation is a Turbo task owned by `@mission-platform/scripts`.
The docs application depends on that task explicitly, so development and build
commands do not start a nested Turbo build.

## Execution Methods

### Via Package Manager

Frequently used utilities are available as Turbo-backed `pnpm` scripts in the
root `package.json`:

```bash
pnpm run <script-name>
```

For a package-scoped invocation, use Turbo directly:

```bash
pnpm exec turbo run validate:exports --filter=@mission-platform/scripts
```

### Direct Execution

Individual TypeScript scripts can be run using `tsx` or `node --experimental-strip-types`:

```bash
pnpm exec tsx scripts/<filename>.ts
```

## Contribution Guidelines

When adding a new shared script:

- Place it in the `scripts/` directory.
- Use TypeScript where possible.
- If the script depends on external packages, add them to the owning workspace's `package.json`.
- Document the script's purpose and usage in this file.
- Add a corresponding entry in the root `package.json` if it's a frequently used utility.

# Shared Utility Scripts

The Mission Platform maintains a set of shared utility scripts in the root `scripts/` directory, managed by the
`@mission-platform/scripts` package.

## Overview

These scripts automate common monorepo tasks, such as local development setup and build verification. Translation
extraction is defined by each app or package and orchestrated from the repository root with Turborepo.

## Available Scripts

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

## Execution Methods

### Via Package Manager

Most scripts are available as `pnpm` scripts in the root `package.json`:

```bash
pnpm run <script-name>
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

# External Consumer Example

This example demonstrates how to consume Mission Platform packages in a plain Vite + React project outside the monorepo.

## Key Configuration

### Framework Selection (Conditions)

1. **Vite (`vite.config.ts`):** We use `frameworkResolveConditions('mp:react')` to tell Vite to pick the React-specific build from `@mission-platform/components`.
2. **TypeScript (`tsconfig.json`):** We extend `@mission-platform/typescript-config/framework-react` (which sets `customConditions: ["mp:react"]`) so the editor and compiler resolve to the correct types.

### Bare Imports

Because of the conditions above, we can import components using bare specifiers:

```ts
import { ForgeButton } from '@mission-platform/components';
```

### Per-Component Imports

To avoid pulling the entire React barrel (and heavy optional components such as the Monaco editor and
its web workers) into the client bundle, import a single component from its per-component subpath. It
resolves to just that component's compiled chunk, while types still flow from the framework barrel:

```ts
import { ForgeBadge } from '@mission-platform/components/react/atoms/forge-badge/forge-badge';
```

`src/main.tsx` demonstrates both the barrel import and a per-component import side by side.

## How to Test (Local)

1. Build the packages in the monorepo root:
   ```bash
   pnpm build
   ```
2. In this directory, run typecheck:
   ```bash
   pnpm typecheck
   ```

## Production Installation

To install in a real external project, you would use:

```bash
pnpm add @mission-platform/components @mission-platform/tokens
```

Or, if testing locally with tarballs:

1. `pnpm pack` in `packages/components` and `packages/tokens`.
2. `pnpm add ../../packages/components/mission-platform-components-1.0.0.tgz` etc.

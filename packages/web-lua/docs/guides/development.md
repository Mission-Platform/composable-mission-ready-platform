# Develop WebLua

## Install and verify

Run the focused checks from the repository root:

```bash
pnpm install
pnpm --filter @mission-platform/web-lua build:check
pnpm --filter @mission-platform/web-lua test
```

Build with `pnpm --filter @mission-platform/web-lua build`. Browser output,
Node output, and declarations are emitted to `dist/` and `dist-node/`.

## Compatibility changes

Add deterministic guest-level evidence before changing a compatibility row.
Update `src/compatibility.ts`, its tests, and the reference table together.
Use `matched` only for behavior covered by a deterministic fixture;
`capability-gated` for explicit host policy requirements; and `unresolved` for
behavior that must not be treated as passing.

Keep the runtime guest-owned and capability-deny-by-default. Node-only adapters
belong behind the `./node` export and must not leak into the browser entry.

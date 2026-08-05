# Mission Platform MCP Servers

The Mission Platform provides two Model Context Protocol (MCP) servers to assist both internal developers and external consumers.

## Server Split

- **[Developer Server](./developer/README.md)** (`@mission-platform/mcp-developer`):
  Focused on development WITHIN the Mission Platform monorepo. It includes tools for scaffolding new packages/apps/workers, atomic-design components, composables/stores/utils, curated guides, and deep repository inspection.
- **[Consumer Server](./consumer/README.md)** (`@mission-platform/mcp-consumer`):
  Focused on building apps ON TOP of the published Mission Platform packages. It includes tools for package installation, framework selection via conditions, and component usage.

## Shared Logic

Genuine shared logic (workspace scanning, component discovery, curated guides, scaffold templates) is extracted into `mcp/shared/` and used by both servers.

## Building & Running

Build all servers from the root:
```bash
pnpm exec turbo run build --filter @mission-platform/mcp-*
```

Run specific server:
```bash
# Developer
node mcp/developer/dist/index.js

# Consumer
node mcp/consumer/dist/index.js
```

## Developer highlights

- Guides: `atomic-component-design`, `composable-authoring`, `store-authoring`, `util-authoring` (plus package/app/worker workflows).
- Scaffold tools: `scaffold_component`, `scaffold_composable`, `scaffold_store`, `scaffold_util` (dry-run by default; `apply: true` to write).
- `list_components` surfaces each component's atomic **level** (`atoms` / `molecules` / …).

## Documentation
- [External Consumer Setup](../docs/external-consumer-setup.md)
- [Framework Best Practices](../docs/framework-best-practices.md)
- [Atomic Component Design](../docs/atomic-component-design.md)
- [Composable Authoring](../docs/composable-authoring.md)
- [Store Authoring](../docs/store-authoring.md)
- [Util Authoring](../docs/util-authoring.md)

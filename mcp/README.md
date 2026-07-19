# @mission-platform/mcp

A **Model Context Protocol (MCP)** server that helps AI assistants use the
Mission Platform monorepo. It exposes the repository's conventions, live
inventory, and scaffolding as MCP **tools**, **resources**, and **prompts** so
an assistant can correctly:

- **use components** from `@mission-platform/components`,
- **create** and **develop** packages,
- **create** and **develop** apps,
- **create** and **develop** Cloudflare Workers.

The server has **no runtime dependencies**. It is compiled with TypeScript
(`tsc`) via Turborepo and run from its built `dist/` output on **Node.js 24+**.

## Building & running

```bash
# From the repo root — build via Turborepo (caches + honours the pipeline)
pnpm exec turbo run build --filter @mission-platform/mcp

# Run the compiled server
node mcp/dist/index.js
# or, from mcp/
pnpm build          # → tsc --project tsconfig.build.json
pnpm start          # → node dist/index.js
pnpm test           # → node --test
```

> During development you can run the raw TypeScript source with `pnpm dev`
> (`node --watch src/index.ts`), which relies on Node's native type-stripping.
> The published/registered entry point is always the compiled `dist/index.js`.

The server speaks JSON-RPC 2.0 over **stdio** (newline-delimited). Diagnostics go
to `stderr`; only protocol messages are written to `stdout`.

The repository root is auto-detected by walking up to the nearest
`pnpm-workspace.yaml`. Override it with the `MISSION_REPO_ROOT` environment
variable if needed.

## Registering with an MCP client

Most MCP clients accept a command + args. Point them at this entry file:

```jsonc
{
  "mcpServers": {
    "mission-platform": {
      "command": "node",
      "args": ["/absolute/path/to/composable_mission_ready_platform/mcp/dist/index.js"],
    },
  },
}
```

## Tools

| Tool                                                    | Purpose                                                                                                                                                                                             |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_guide`                                             | Curated guide for a workflow (`overview`, `conventions`, `component-usage`, `package-creation`, `package-development`, `app-creation`, `app-development`, `worker-creation`, `worker-development`). |
| `list_docs` / `read_doc` / `search_docs`                | Browse and search the repository `docs/`.                                                                                                                                                           |
| `list_components`                                       | Every component in `@mission-platform/components` with its exports.                                                                                                                                 |
| `get_component_usage`                                   | Props interface, doc comment, stories, and Vue/React import snippets for a component.                                                                                                               |
| `list_packages` / `list_apps` / `list_workers`          | Live workspace inventory.                                                                                                                                                                           |
| `get_member_info`                                       | Manifest scripts/deps plus `llms.txt`/`README` for one member.                                                                                                                                      |
| `scaffold_package` / `scaffold_app` / `scaffold_worker` | Generate a convention-compliant skeleton. Dry-run by default; pass `apply: true` to write files.                                                                                                    |

## Resources

- `mission://guide/<id>` — each curated guide.
- `mission://inventory` — live JSON inventory of every workspace member and component.
- `mission://docs/<slug>` — the raw repository documentation.

## Prompts

Ready-to-run, guide-embedded prompts for each workflow: `use-component`,
`create-package`, `develop-package`, `create-app`, `develop-app`,
`create-worker`, `develop-worker`.

## Design

```
mcp/
├── src/
│   ├── index.ts            # entry point — assembles + serves over stdio
│   ├── protocol/           # dependency-free MCP/JSON-RPC core + stdio transport
│   ├── repo/               # read-only workspace/component/doc scanning
│   ├── knowledge/          # curated guides + scaffolding templates
│   ├── scaffold/           # safe file writer (dry-run by default)
│   ├── tools/              # tool registry
│   ├── resources/          # resource provider
│   └── prompts/            # prompt registry
├── test/                   # node --test suite (zero dependencies)
└── dist/                   # compiled output (tsc) — the run entry point
```

All repository inspection is **read-only**; the only write path is the
scaffolding tools, which refuse to overwrite an existing folder and require an
explicit `apply: true`.

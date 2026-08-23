# @mission-platform/mcp-developer

A **DEVELOPER** Model Context Protocol (MCP) server that helps AI assistants develop within the
Mission Platform monorepo. (Compatibility note: previously @mission-platform/mcp).

The server uses the shared Mission Platform and FWS analysis/runtime packages.
It is bundled with `tsdown` via Turborepo and run from its built `dist/` output
on **Node.js 24+**.

## Building & running

```bash
# From the repo root — build via Turborepo
pnpm exec turbo run build --filter @mission-platform/mcp-developer

# Run the compiled server
node mcp/developer/dist/index.js
# or, from mcp/developer/
pnpm build          # → tsdown
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
    "mission-platform-developer": {
      "command": "node",
      "args": ["/absolute/path/to/composable_mission_ready_platform/mcp/developer/dist/index.js"],
    },
  },
}
```

## Tools

| Tool                                                                       | Purpose                                                                                                                                                                    |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_guide`                                                                | Curated guide for a workflow (including `fws-authoring`, `fws-security`, `fws-artifact-verification`, and `fws-forensics`).                                                |
| `list_docs` / `read_doc` / `search_docs`                                   | Browse and search the repository `docs/`.                                                                                                                                  |
| `list_components`                                                          | Every component in `@mission-platform/components` with exports and **atomic level**.                                                                                       |
| `get_component_usage`                                                      | Props interface, level/path, doc comment, stories, and Vue/React import snippets.                                                                                          |
| `list_packages` / `list_apps` / `list_workers`                             | Live workspace inventory.                                                                                                                                                  |
| `get_member_info`                                                          | Manifest scripts/deps plus `llms.txt`/`README` for one member.                                                                                                             |
| `scaffold_package` / `scaffold_app` / `scaffold_worker` / `scaffold_crate` | Generate a convention-compliant workspace member skeleton. Dry-run by default; pass `apply: true` to write files.                                                          |
| `scaffold_component`                                                       | Atomic-design component under `src/components/<level>/<name>/` (tsx + stories + spec + barrel). Levels: `atom` \| `molecule` \| `organism` \| `template` \| `page`.        |
| `scaffold_composable`                                                      | Composable under `src/composables/<name>/` (+ `.spec.ts` + barrel).                                                                                                        |
| `scaffold_store`                                                           | Framework-neutral store under `src/stores/<name>/` (+ `.spec.ts` + barrel).                                                                                                |
| `scaffold_util`                                                            | Util under `src/utils/<name>/` (+ `.spec.ts` + barrel).                                                                                                                    |
| `list_locales`                                                             | Inspect i18n coverage: survey every app's languages, or (with `name`) a member's locales dir, layout, namespaces, and per-locale missing/extra keys vs the default locale. |
| `add_locale` / `remove_locale`                                             | Add a language (clones the default locale's structure; `fill: source \| empty`) or remove one (refuses the default). Dry-run by default; pass `apply: true`.               |
| `update_translation`                                                       | Set one or more translation values by dot-path key (`entries`) in a single locale/namespace. Dry-run by default; pass `apply: true`.                                       |
| `fws_analyze_source` / `fws_analyze_workspace`                             | Run canonical FWS analysis on bounded inline source or repository-rooted `.fws` files; returns structured diagnostics, findings, facts, and policy without execution.      |
| `fws_inspect_manifest`                                                     | Inspect a repository-rooted FWS ABI manifest without instantiating Wasm.                                                                                                   |
| `fws_verify_artifact`                                                      | Verify a bounded Wasm binary against its FWS manifest, metadata, hashes, target features, and capability policy; never executes it.                                        |
| `fws_run_trace`                                                            | Capture a bounded trace from the capability-denied self-hosted FWS probe only; arbitrary Wasm, commands, imports, and ambient I/O are unavailable.                         |

## Resources

- `mission://guide/<id>` — each curated guide.
- `mission://inventory` — live JSON inventory of every workspace member and component.
- `mission://docs/<slug>` — the raw repository documentation.

## Prompts

Ready-to-run, guide-embedded prompts for each workflow: `fws-authoring`,
`fws-secure-review`, `fws-compile-verify`, `fws-forensic-debug`, `use-component`,
`create-package`, `develop-package`, `create-app`, `develop-app`,
`create-worker`, `develop-worker`.

## Design

```
mcp/
├── developer/          # The developer-facing server (repo development)
│   ├── src/
│   │   ├── index.ts
│   │   ├── scaffold/
│   │   ├── tools/
│   │   └── prompts/
│   ├── test/
│   └── dist/
├── shared/             # Shared logic used by developer and consumer servers
│   ├── repo/
│   ├── knowledge/
│   └── resources/
└── consumer/           # The consumer-facing server (external apps)
```

All repository inspection is **read-only**; the only write paths are the
scaffolding tools and the i18n locale tools (`add_locale`, `remove_locale`,
`update_translation`), all of which are dry-run previews unless an explicit
`apply: true` is passed.

FWS inspection is read-only and root-bounded. Source analysis and artifact
verification delegate to the canonical FWS packages. Trace capture is opt-in,
event/byte/snapshot capped, deterministic, redacted, and limited to the
capability-denied self-hosted probe; it is never arbitrary guest execution.

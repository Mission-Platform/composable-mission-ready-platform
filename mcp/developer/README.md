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
> Published installations use the compiled `dist/index.js`; repository-local
> MCP configuration can use the tracked source entry point shown below.

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

For repository-local configuration, prefer the tracked source entry point so a
fresh checkout does not depend on the ignored `dist/` directory being built.
Use an absolute path and set `MISSION_REPO_ROOT` when the MCP client does not
guarantee the server's working directory:

```jsonc
{
  "command": "node",
  "args": [
    "--experimental-strip-types",
    "--no-warnings",
    "/absolute/path/to/composable_mission_ready_platform/mcp/developer/src/index.ts",
  ],
  "env": {
    "MISSION_REPO_ROOT": "/absolute/path/to/composable_mission_ready_platform",
  },
}
```

The repository-local configuration in `.ai/mcp/mcp.json` uses this form so it
does not depend on the MCP client's working directory and requires the
repository's supported Node.js 24 runtime. Replace the absolute paths with the
paths for the local checkout. Use the compiled `dist/index.js` entry point for
published or otherwise prebuilt installations.

## Tools

| Tool                                                                       | Purpose                                                                                                                                                                                        |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lsp_capabilities`                                                         | Read-only, versioned contract for the staged agent-LSP migration; reports canonical developer-MCP names, legacy aliases, and workspace mutation behavior.                                      |
| `lsp_config_view`                                                          | View the validated, root-bounded `agent-lsp.json` server definitions without starting a language server.                                                                                       |
| `lsp_config_add` / `lsp_config_edit`                                       | Preview or explicitly apply additions and edits to `agent-lsp.json`; writes require `apply: true`.                                                                                             |
| `lsp_detect_servers` / `lsp_status`                                        | Inspect the root-bounded server configuration and report active lifecycle state without starting a language server.                                                                            |
| `lsp_start` / `lsp_restart` / `lsp_shutdown`                               | Explicitly manage configured language-server processes with root-bounded commands, `shell: false`, and session-scoped cleanup.                                                                 |
| `lsp_open_document` / `lsp_get_diagnostics`                                | Open or update a root-bounded document and retrieve standard LSP diagnostics through an active session; document reads are size-capped.                                                        |
| `lsp_debug_context`                                                        | Collect diagnostics, hover, definition, incoming callers, and related tests for one source position without modifying the workspace.                                                           |
| `lsp_review_structure`                                                     | Review one source file's symbols, diagnostics, and related tests without modifying the workspace.                                                                                              |
| `review_changes`                                                           | Combine changed Git files, diff statistics, optional LSP diagnostics, and optional test correlation into a bounded read-only review report.                                                    |
| `git_status` / `git_branches`                                              | Read repository status and local/remote branch names without changing Git state.                                                                                                               |
| `git_changed_files`                                                        | Return structured staged, unstaged, and untracked flags for changed files, avoiding fragile parsing of human-readable status output.                                                           |
| `git_diff` / `git_log` / `git_show`                                        | Read bounded worktree/index diffs, commit history, or a revision patch; paths are repository-rooted and commands are shell-free.                                                               |
| `git_grep`                                                                 | Search bounded tracked content by literal pattern (or explicitly requested regex), optionally limited by revision and repository-rooted path.                                                  |
| `git_blame`                                                                | Read bounded line-level provenance for a repository-rooted file, optionally at a revision and line range.                                                                                      |
| `git_ls_files`                                                             | List bounded tracked paths, with explicit optional inclusion of standard-excluded untracked paths and optional stage metadata.                                                                 |
| `git_commit_plan`                                                          | Read-only, two-phase Conventional Commit preview: validates the structured message with the root commitlint rules, captures a repository snapshot, and returns bounded staging/commit actions. |
| `git_commit_apply`                                                         | Apply a still-current `git_commit_plan` with normal local Git hooks; mutates only the local index/history and never contacts a remote.                                                         |
| `git_tags` / `git_remotes`                                                 | Inspect bounded local tag metadata and configured remote fetch/push metadata; remote URLs are credential-sanitized and no network is contacted.                                                |
| `get_guide`                                                                | Curated guide for a workflow (including `fws-authoring`, `fws-security`, `fws-artifact-verification`, and `fws-forensics`).                                                                    |
| `list_docs` / `read_doc` / `search_docs`                                   | Browse and search the repository `docs/`.                                                                                                                                                      |
| `list_components`                                                          | Every component in `@mission-platform/components` with exports and **atomic level**.                                                                                                           |
| `get_component_usage`                                                      | Props interface, level/path, doc comment, stories, and Vue/React import snippets.                                                                                                              |
| `list_packages` / `list_apps` / `list_workers`                             | Live workspace inventory.                                                                                                                                                                      |
| `get_member_info`                                                          | Manifest scripts/deps plus `llms.txt`/`README` for one member.                                                                                                                                 |
| `scaffold_package` / `scaffold_app` / `scaffold_worker` / `scaffold_crate` | Generate a convention-compliant workspace member skeleton. Dry-run by default; pass `apply: true` to write files.                                                                              |
| `scaffold_component`                                                       | Atomic-design component under `src/components/<level>/<name>/` (tsx + stories + spec + barrel). Levels: `atom` \| `molecule` \| `organism` \| `template` \| `page`.                            |
| `scaffold_composable`                                                      | Composable under `src/composables/<name>/` (+ `.spec.ts` + barrel).                                                                                                                            |
| `scaffold_store`                                                           | Framework-neutral store under `src/stores/<name>/` (+ `.spec.ts` + barrel).                                                                                                                    |
| `scaffold_util`                                                            | Util under `src/utils/<name>/` (+ `.spec.ts` + barrel).                                                                                                                                        |
| `test_accessibility`                                                       | Audit a reachable HTTP(S) page with axe-core in a headless browser. Returns normalized accessibility violations and page, console, or browser errors without writing to the repository.        |
| `list_locales`                                                             | Inspect i18n coverage: survey every app's languages, or (with `name`) a member's locales dir, layout, namespaces, and per-locale missing/extra keys vs the default locale.                     |
| `locale_coverage`                                                          | Report translated key counts and missing or extra keys for each non-default locale of a workspace member. This is read-only and never writes locale files.                                     |
| `add_locale` / `remove_locale`                                             | Add a language (clones the default locale's structure; `fill: source \| empty`) or remove one (refuses the default). Dry-run by default; pass `apply: true`.                                   |
| `update_translation`                                                       | Set one or more translation values by dot-path key (`entries`) in a single locale/namespace. Dry-run by default; pass `apply: true`.                                                           |
| `fws_analyze_source` / `fws_analyze_workspace`                             | Run canonical FWS analysis on bounded inline source or repository-rooted `.fws` files; returns structured diagnostics, findings, facts, and policy without execution.                          |
| `fws_inspect_manifest`                                                     | Inspect a repository-rooted FWS ABI manifest, including bounds-check policy, without instantiating Wasm.                                                                                       |
| `fws_inspect_sonir`                                                        | Inspect a bounded, root-bounded `.sonir.json` graph summary, optimizer passes, and bounds policy without executing guest code.                                                                 |
| `fws_verify_artifact`                                                      | Verify a bounded Wasm binary against its FWS manifest, metadata, hashes, target features, and capability policy; never executes it.                                                            |
| `fws_run_trace`                                                            | Capture a bounded trace from the capability-denied self-hosted FWS probe only; arbitrary Wasm, commands, imports, and ambient I/O are unavailable.                                             |

## Local commit workflow

Git inspection tools (`git_status`, `git_diff`, `git_log`, `git_show`, `git_grep`,
`git_blame`, `git_ls_files`, `git_tags`, and `git_remotes`) are read-only. Local
commits use an explicit two-phase workflow:

1. Call `git_commit_plan` with a structured message: `type` (one of `feat`, `fix`,
   `refactor`, `style`, `chore`, `docs`, `test`, `build`, `ci`, `perf`, or `revert`),
   optional `scope`, required `description`, optional `body`, optional `footers`, and
   an explicit `mode`.
2. Review the normalized message, selected files, repository snapshot, plan ID, and
   bounded command/action preview returned by the plan.
3. Call `git_commit_apply` with only that `planId` (plus bounded execution options).
   The server rechecks the snapshot before any mutation; changed files, index state,
   selected paths, or message state cause a stale-plan error and no commit.

The `staged-only` mode commits the existing index and never stages or unstages files.
The `paths` mode requires a non-empty, unique, repository-rooted path list, stages
only those paths, and commits only that selection so unrelated staged changes are not
included. Paths outside the repository, traversal paths, NUL characters, and empty
selections are rejected. Messages are normalized and validated against the root
`commitlint.config.mjs`, including the repository's 72-character header limit.

Applying a plan runs normal Git hooks; hooks are never bypassed. Plans are scoped to
the MCP server session, expire after a bounded lifetime, and are consumed after a
successful commit. Unknown, expired, or already-consumed plans must be recreated.
These tools operate only on local Git state: they do not push, fetch, pull, reset,
revert, amend, force-update, create tags, contact remotes, or accept arbitrary Git
arguments.

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

Repository inspection is **read-only**; Git inspection tools never mutate the
worktree or index, contact remotes, or perform fetch/pull/push operations. The
separate two-phase `git_commit_plan`/`git_commit_apply` workflow is the only Git
write path: planning is read-only, while applying a still-current plan mutates the
local index and commit history through restricted, shell-free Git commands with
normal hooks enabled. All Git results have bounded stdout/stderr (with
operation-specific bounds for searches, line ranges, and metadata listings).

The other write paths are the scaffolding tools, i18n locale tools
(`add_locale`, `remove_locale`, `update_translation`), and LSP configuration tools
(`lsp_config_add`, `lsp_config_edit`), all of which are dry-run previews unless an
explicit `apply: true` is passed.

FWS inspection is read-only and root-bounded. Source analysis and artifact
verification delegate to the canonical FWS packages. Trace capture is opt-in,
event/byte/snapshot capped, deterministic, redacted, and limited to the
capability-denied self-hosted probe; it is never arbitrary guest execution.

The `lsp_capabilities` tool is the migration seam for the former `agent-lsp`
server. Its contract is read-only and reports discovery, lifecycle, document
opening, and diagnostics capabilities as `available`; broader protocol
operations remain `planned`. Starting is always explicit through `lsp_start`;
status does not start a server. Configured commands are launched without a
shell, absolute command arguments must remain within the repository root, and
document contents are capped before they enter the JSON-RPC transport.

`fws_analyze_source` and `fws_analyze_workspace` accept `policy.boundsChecks`:
`runtime` is the safe default, `proven-safe` requires proof facts, and
`excluded-by-profile` is surfaced as an auditable finding. `fws_inspect_sonir`
validates the schema and graph metadata, caps returned nodes/functions, rejects
paths outside the repository root, and never evaluates graph or Wasm contents.

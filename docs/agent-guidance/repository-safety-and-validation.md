# Repository Safety and Validation

This topic is mandatory for implementation, refactoring, testing, generation, repository inspection, worktree, LSP, security, and file-management tasks. It preserves the detailed operational constraints summarized in the root `AGENTS.md`.

## Dependency Direction and Asset Discovery

- Code in `packages/` must never import from `apps/`. Applications consume reusable package members; domain packages may depend on lower-level `core`, `tooling`, and compiler contracts without importing applications.
- Before writing code, inspect existing assets with the repository MCP tools (`list_components`, `get_component_usage`, `lsp_find_symbol`, and `lsp_list_symbols`) and filesystem inspection.
- Reuse `@mission-platform/components` instead of creating duplicate UI primitives, reference `--mp-*` tokens instead of hardcoded visual values, search `packages/` for shared utilities, and use YAML catalogs with `@mission-platform/i18n` for user-facing strings.
- New shared UI components, composables, utilities, and design tokens belong in `packages/`; shared lint, format, and build tooling belongs in `packages/tooling/configs/`.
- When modifying a package component, add or update its colocated `.stories.tsx` story. The `apps/storybook` workbench discovers package stories across Vue, React, Solid, Svelte, and Web Components.

## Secure Coding and Compliance

All code and configuration must follow ISO/IEC 27001:2022 Control A.8.28 and protect against the OWASP Top 10 (2025) and CWE Top 25.

- Never commit credentials, private keys, cloud tokens, or other secrets.
- Sanitize HTML with `DOMPurify.sanitize`, parameterize queries, and use vector arguments such as `execFile` rather than interpolated shell strings.
- Use modern cryptography such as SHA-256 and `crypto.getRandomValues`; never use `Math.random()` for security-sensitive values.
- Avoid unvetted `postinstall` lifecycle scripts and pin dependencies through catalog references.
- Preserve least privilege, repository-root and path bounds, shell-free execution, explicit write approval, and security tool boundaries.
- Before proposing a PR, run the relevant developer-MCP security checks: `security_scan_secrets`, `security_analyze_code`, `security_audit_dependencies`, `security_audit_supply_chain`, `security_collect_compliance_evidence`, and `security_audit_compliance` when applicable.

## Worktrees and Build Dependencies

- Parallel workstreams must use isolated Git worktrees provisioned with `node --experimental-strip-types scripts/worktree-manager.ts create <branch>`.
- In a fresh worktree, build upstream workspace dependencies before package tests or typechecks because internal `dist/` artifacts may be missing:

  ```bash
  pnpm exec turbo run build --filter <package-name>^...
  ```

- Worktrees share `.turbo/cache`; do not wipe or bypass that cache.

## Portable LSP Configuration

- LSP definitions in `agent-lsp.json` must use portable relative invocations such as `["pnpm", "exec", "<server>", "--stdio"]` or `["pnpm", "--dir", "relative/path", ...]`.
- Never hardcode absolute system paths. The MCP LSP server runs language servers from the detected repository or worktree root.
- LSP query and execution tools require an active session. Check `lsp_status` and use `lsp_start` when needed.
- The TypeScript 7 native server uses `tsc --lsp --stdio` (`typescript-go` 7.0.2). Whole-workspace symbol and hover queries may time out during indexing; use 15,000–30,000 ms protocol timeouts and complement them with package-scoped typechecks and Vitest.
- If startup or discovery times out, use package-scoped typechecks and Vitest as the diagnostic fallback rather than blocking the task.

## Flint and Scanner Validation

- Flint LSP diagnostics are source-level feedback only; they do not prove that a linked multi-module graph emits valid Wasm or that its runtime ABI executes correctly.
- For scanner graph changes, run the focused graph suite, package `type-check`, and package Vitest suite. Record artifact-emission failures separately from source diagnostics.
- A fixture or reduced decoder path does not establish full ZXing parity. Mark unsupported modes, format subsets, metadata, retries, and public-contract migrations explicitly in the plan and pull request.
- If static linking fails, capture graph module and edge counts, the emitter diagnostic, and the smallest isolated reproducer before changing algorithm code or weakening tests.

## Code Style and Verification

- New source files use `.ts` or `.vue` with `<script setup lang="ts">`; public APIs and exported functions need explicit types.
- Use `undefined` for absent or cleared values unless an external protocol requires `null`.
- Forge JSX event props use standard camelCase names such as `onKeyDown`, `onPointerDown`, and `onMouseDown`.
- Group imports in this order with no blank lines within a group: Node built-ins, external dependencies, internal `@mission-platform/*` packages, and relative files. Separate groups with one blank line.
- Run `pnpm --filter <pkg> run lint` and `pnpm --filter <pkg> run lint:style`; use the package ESLint fix only for applicable style errors. Markdown and stories use the repository formatting workflow.
- Compiler, transpiler, AST, and code-generation changes require end-to-end integration coverage. Verify non-colliding outputs for identical basenames, unambiguous entry re-exports, and preserved emitted contents.
- `TargetIntentions.lowered` is mandatory in `@mission-platform/forge-plugin-api`; target plugins require lowered plans. Fixtures, mocks, and CMS integration plugins must provide `{ framework, appliedOptimizations: [] }` or run `lower -> optimize -> generate`.
- Under parallel load, multi-framework, documentation-extraction, and large-AST tests should use explicit `60_000`–`120_000` ms timeouts.
- For cross-cutting plan work, use an independent review focused on end-to-end behavior, negative tests, and package-scoped lint gates.

## Interaction Modes

Use the first applicable mode and keep it for the session unless its persistence rule permits a switch:

1. `[CHAT]` for greetings, small talk, factual questions, or simple math.
2. `[ADVANCED_CHAT]` for read-only explanation, analysis, information finding, or proposals.
3. `[RUN_VERIFY]` for short safe commands, app runs, or tests without edits.
4. `[FAST_CODE]` for a trivial one-file change that needs no additional context gathering.
5. `[SETUP]` for builds, installs, infrastructure, environment fixes, or system checks.
6. `[CODE]` for non-trivial project changes requiring investigation or multiple steps.
7. `[NICHE]` only for specialized forensics, reverse engineering, data recovery, or security research that does not fit another mode.

`[CHAT]` and `[CODE]` do not switch modes. `[ADVANCED_CHAT]` switches to `[CODE]` only after an explicit implementation request; `[FAST_CODE]` and `[RUN_VERIFY]` switch to `[CODE]` if they cannot finish within three steps; `[SETUP]` and `[NICHE]` may switch to `[CODE]` when implementation becomes necessary.

## Atomic Generation and File Management

- Never wipe or delete a generation target before successful generation. Stage artifacts in a sibling attempt directory such as `.forge-attempt/`, run pre-commit diagnostics, and atomically swap only after checks pass.
- Preserve repository dotfiles such as `.gitkeep` and `.gitignore`, and preserve in-flight staging directories when synchronizing or pruning build targets.
- Keep mutations explicit and bounded. Do not use broad cleanup commands or delete files that were not created for the current task.

## Developer MCP LSP Workflow Contract

Prefer the developer MCP's bounded `lsp_*` code-intelligence tools over manual text search for code tasks. Use `lsp_capabilities` to confirm the current contract and availability; before editing, use read-only `lsp_review_structure` or `lsp_debug_context`, before applying an LSP edit use `lsp_preview_edit`, and after a change use `lsp_get_diagnostics`, then `lsp_run_build` and `lsp_run_tests` when applicable.

Use the purpose-built mapping: `lsp_list_symbols` for structure, `lsp_find_symbol` for symbols, `lsp_find_references` for usages, `lsp_inspect_symbol` for understanding, `lsp_find_callers` for call sites, `lsp_replace_symbol_body` for function replacement, and `lsp_safe_delete_symbol` for unused symbols. Use the documented `/lsp-*` workflows for architecture, impact, refactoring, safe edits, test correlation, and full verification.

Related policy: [Quality rubric](quality-rubric.md), [Session self-review](session-self-review.md), and the root [AGENTS.md](../../AGENTS.md).
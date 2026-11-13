# Agents Guidelines

`AGENTS.md` is the mandatory entry point for agents working on the Mission Platform. Read it before starting work, then read every linked topic document that applies to the task. Linked topic documents are normative policy, not optional background; there is no implicit Markdown include mechanism.

## Project Overview

The Mission Platform is a multi-framework TypeScript monorepo managed with pnpm workspaces and Turborepo. Vue 3 is used by several applications and packages, while the Forge compiler and adapters also target React, Solid, Svelte, and Web Components; `service-monitor` uses RedwoodSDK/React. Reusable building blocks live in `packages/`, and deployable applications and workbenches are assembled in `apps/`.

Current applications include `docs/`, `figma-forge-plugin/`, `my-care-notes/`, `service-monitor/`, `storybook/`, and `website/`.

## Instruction Map

| Task or concern | Mandatory guidance |
| --- | --- |
| Any implementation, refactor, documentation, or review | [Quality rubric](docs/agent-guidance/quality-rubric.md) |
| Security, validation, testing, repository inspection, worktrees, LSP, generation, or file management | [Repository safety and validation](docs/agent-guidance/repository-safety-and-validation.md) |
| End-of-session closeout or improvement proposal | [Session self-review](docs/agent-guidance/session-self-review.md) |
| MCP tool, profile, server, or workflow use | [MCP Server](mcp/README.md), [Developer MCP](mcp/developer/README.md), the quality rubric, repository safety guidance, and session self-review |

The topic directory is intentionally flat: `docs/agent-guidance/<topic>.md` contains focused, durable policy. Add a topic only when a rule has a coherent owner and cannot remain a concise index summary. Do not add nested `AGENTS.md` files or duplicate a rule across topics.

## Applicability and Precedence

1. Follow system, developer, and user instructions first.
2. Treat this root file as the canonical repository-wide entry point and read applicable linked topics before planning or editing.
3. When a topic provides detail for a rule summarized here, the topic is the canonical source for that detail; the root summary remains binding.
4. If repository guidance overlaps, apply the more specific applicable requirement without weakening a safety, validation, or mutation boundary. Report an unresolved conflict instead of guessing.
5. Record proposed improvements separately from the current task unless implementation is explicitly authorized.

## Non-Negotiable Boundaries

- Preserve dependency direction: code in `packages/` must not import from `apps/`; shared components, utilities, tokens, and tooling belong in the appropriate packages.
- Discover and reuse existing assets before writing code. Use the repository MCP tools and filesystem inspection; do not invent duplicate UI primitives, design tokens, utilities, or localized strings.
- Never commit secrets. Defend against injection, use approved cryptography and dependency practices, preserve least privilege, and run the required security checks before proposing a PR.
- Keep mutations explicit and bounded. Do not widen write paths, bypass review or confirmation, use shell interpolation, or change MCP runtime/configuration behavior unless the task authorizes it.
- Preserve required validation. Use the applicable package tests, typechecks, lint/style checks, LSP safeguards, build priming, artifact checks, and end-to-end coverage described in the safety topic.
- Keep changes minimal, focused, portable, and free of temporary artifacts. Preserve repository conventions and update affected documentation.

## Essential Resources

- [Best Practices](docs/best-practices.md), [API Reference](docs/api-reference.md), and [Troubleshooting](docs/troubleshooting.md)
- [Development Setup](docs/development-setup.md), [Workspace Structure](docs/workspace-structure.md), and [Package Development](docs/package-development.md)
- [Project and Worktree Setup](docs/guides/project-and-worktree-setup.md), [Testing](docs/testing.md), and [Build System](docs/build-system.md)
- [Migration Guide](docs/migration-guides/vue2-to-vue3.md)

## MCP Server

[MCP Server](mcp/README.md) documents the developer/consumer split and shared boundary. [Developer MCP](mcp/developer/README.md) documents profiles, bounded inspection, explicit write paths, `review_changes`, and security tools. Build both servers with `pnpm exec turbo run build --filter @mission-platform/mcp-*`; run compiled output with `node mcp/developer/dist/index.js` or `node mcp/consumer/dist/index.js`.

Use the existing source of truth when checking MCP behavior: `.ai/mcp/mcp.json`, `scripts/launch-mcp.mjs`, `mcp/developer/src/tools/profiles.ts`, and `mcp/developer/src/tools/index.ts`. Do not infer undocumented capabilities from this index.

## Working Agreement

Choose the smallest evidence-based change that satisfies the request. Preserve correctness, coverage, security, and required validation even when a faster path is available. At the end of every session, complete the [session self-review](docs/agent-guidance/session-self-review.md), including whether the guidance and MCP ergonomics enabled safe, understandable work.


## Mode Selection Guidelines

Use the repository's standard interaction-mode rules from the governing session instructions; do not duplicate them here.

## Code Style and Validation

Detailed TypeScript, linting, test architecture, file-management, LSP, and agent-lsp requirements are maintained in [Repository safety and validation](docs/agent-guidance/repository-safety-and-validation.md).

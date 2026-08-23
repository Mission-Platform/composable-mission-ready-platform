# Develop the Forge Web Script language server

## Install and verify

Run the focused package checks from the repository root:

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp test
```

Build with `pnpm --filter @mission-platform/forge-web-script-lsp build`. The
result is emitted to `dist/`; local output is not a source artifact.

## Protocol changes

Keep diagnostics, UTF-16 ranges, symbols, completion, hover, and semantic-token
behavior aligned with the language service package. Add a protocol regression
fixture for every new request or capability. The LSP does not currently provide
go-to-definition, references, rename, formatting, code actions, cross-file
language imports, or a browser-hosted transport.

The server is stdio-based and Node-only. Browser editor integration belongs to
the language-service package's local adapter rather than this server.
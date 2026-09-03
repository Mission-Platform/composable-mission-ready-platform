# @mission-platform/forge-web-script-lsp

The stdio Language Server Protocol server for Forge Web Script v1. The package
owns editor-facing transport and workspace behavior; language semantics remain
owned by `@mission-platform/forge-web-script`.

## Start here

- [Language tooling reference](reference/language-service.md) — diagnostics,
  completion, hover, semantic tokens, and supported boundaries.
- [Build and test guide](guides/development.md) — local server checks and
  protocol fixtures.
- [`llms.txt` in the language package](../../forge-web-script/llms.txt) — core
  language API notes.

The server requires Node.js `>=24.0.0` and exposes the `forge-web-script-lsp`
binary together with the `server` and `workspace` module subpaths.

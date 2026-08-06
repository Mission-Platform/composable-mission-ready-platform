# @mission-platform/mcp-consumer

A **CONSUMER** Model Context Protocol (MCP) server for external teams building apps on top of Mission Platform packages.

## Features

- **Package Installation:** How to install and manage `@mission-platform/*` dependencies.
- **Framework Selection:** Setup for Vue, React, Solid, Svelte, and Web Components via export conditions.
- **Component Usage:** Discovery and usage patterns for the shared component library.
- **Design Tokens:** Information on design tokens and how to override them.

## Building & Running

```bash
# From the repo root — build via Turborepo
pnpm exec turbo run build --filter @mission-platform/mcp-consumer

# Run the compiled server
node mcp/consumer/dist/index.js
```

## Tools

- `get_setup_guide`: Overall setup for external projects.
- `get_framework_setup`: Framework-specific instructions.
- `list_components`: List available components.
- `get_component_usage`: Props and import snippets for a component.
- `get_tokens`: Read the raw DTCG design-token values (optionally one category).
- `get_token_override_guide`: The recommended DTCG-JSON → generated-SCSS workflow for re-skinning an app.
- `list_token_variables`: Enumerate the overridable `--mp-*` custom properties (optionally scoped to a category).
- `get_token_override_schema`: Return the JSON Schema (Draft 2020-12) enumerating every overridable token key for validating/autocompleting `*.tokens.json` override documents.
- `generate_token_override`: Transform a DTCG override JSON into a `:root { --mp-*: … }` SCSS/CSS partial (warns about override keys that don't match a known token).

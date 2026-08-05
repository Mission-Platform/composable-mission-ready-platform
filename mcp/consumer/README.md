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
- `get_tokens`: How to use and override design tokens.

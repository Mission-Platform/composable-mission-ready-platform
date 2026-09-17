# @mission-platform/mcp-consumer

A **CONSUMER** Model Context Protocol (MCP) server for external teams building applications on top of published Mission Platform packages.

## Features

- **Package Discovery & Installation:** Browse publishable `@mission-platform/*` packages, install commands (pnpm, npm, yarn, bun), and peer dependencies.
- **Framework Selection:** Setup for Vue 3, React, Solid, Svelte, and Web Components via export conditions (`mp:<framework>`).
- **Component & Story Discovery:** Explore `@mission-platform/components`, props interfaces, Storybook story variants, sizes, and import snippets.
- **Icon Catalog:** Browse 100+ SVG icons from `@mission-platform/icons` across 13 categories with accessibility guidance and framework examples.
- **Framework-Neutral Routing:** Setup `@mission-platform/router` with native adapters (`@mission-platform/forge-router-*`), outlets, links, and async loading spinners.
- **Design Tokens & Overrides:** Query DTCG tokens, list CSS custom properties (`--mp-*`), and compile `*.tokens.json` overrides to `:root` CSS/SCSS.
- **Configuration Validator:** Diagnose and validate `vite.config.ts`, `tsconfig.json`, and `package.json` for missing conditions or peer dependencies.
- **Workflow Prompts:** Interactive assistant prompts for external app setup, component consumption, token overrides, and routing.

## Building & Running

```bash
# From repo root — build via Turborepo
pnpm exec turbo run build --filter @mission-platform/mcp-consumer

# Run the compiled server
node mcp/consumer/dist/index.js
```

## Tools

### Setup & Guidance

- `get_setup_guide`: Overall setup guide for external projects consuming Mission Platform packages.
- `get_framework_setup`: Framework-specific instructions and best practices (vue, react, solid, svelte, web-components).
- `get_guide`: Retrieve any curated guide (frameworks, tokens, routing, security, component design).
- `validate_consumer_setup`: Diagnostic tool inspecting `vite.config.ts`, `tsconfig.json`, or `package.json` for correct export conditions and dependencies.

### Packages & Dependencies

- `list_packages`: Enumerate publishable packages with categories (`ui`, `core`, `integrations`, `content`, `tooling`) and export condition support.
- `get_package_info`: Installation commands, peer dependencies, and quickstart examples for a package.

### Components & Icons

- `list_components`: List available components in `@mission-platform/components` with atomic design levels.
- `get_component_usage`: Props interface, doc comments, and framework-agnostic import snippets.
- `get_component_stories`: Inspect story names, variants, sizes, and metadata for a component.
- `list_icons`: Browse SVG icons in `@mission-platform/icons` with category and name filters.
- `get_icon_usage`: Import snippets, size tokens, colors, accessibility guidance (`ariaLabel`), and framework examples.

### Routing

- `get_router_setup`: Code generation and setup guidance for `@mission-platform/router` and native framework adapters (browser/memory history, outlets, links, async loading fallbacks).

### Design Tokens & Theming

- `get_tokens`: Read raw DTCG design-token values (optionally filtered by category).
- `get_token_override_guide`: The recommended DTCG-JSON → generated-SCSS workflow for re-skinning an app.
- `list_token_variables`: Enumerate overridable `--mp-*` custom properties (optionally scoped to a category).
- `get_token_override_schema`: JSON Schema (Draft 2020-12) for validating and autocompleting `*.tokens.json` override documents.
- `generate_token_override`: Compile DTCG JSON overrides into `:root { --mp-*: ... }` CSS/SCSS partials.

## Prompts

- `consumer-setup`: Guided setup of an external application consuming Mission Platform packages.
- `consume-component`: Walkthrough of selecting, configuring, and styling a component.
- `override-tokens`: Walkthrough of authoring token overrides and compiling them to CSS.
- `routing-setup`: Walkthrough of configuring framework-neutral routing with native adapters.

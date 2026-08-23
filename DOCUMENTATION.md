# Mission Platform Documentation

This repository contains comprehensive documentation for the Mission Platform, a VueJS 3 monorepo managed with pnpm
workspaces.

## Browsing the Documentation

Project guidance under `docs/` can be read directly on GitHub, or browsed in a dedicated documentation site: the **
`@mission-platform/docs`** app (`apps/docs`). It is a Vite + Vue 3 single-page app that renders the canonical Markdown
from the project `docs/` tree and package-owned `docs/` trees at build time, with grouped sidebar navigation, per-page
table of contents, syntax-highlighted code, and in-app cross-links, and client-enhanced Mermaid diagrams with readable
Markdown fallbacks.

```bash
# Start the documentation site locally
pnpm --filter @mission-platform/docs dev

# Type-check and build the static site
pnpm --filter @mission-platform/docs build

# Preview the production build
pnpm --filter @mission-platform/docs preview
```

English Markdown in `docs/` is the canonical source. Localized Markdown lives in
`docs/locales/<locale>/` as a matching content tree (machine-assisted translations that preserve technical tokens); the
docs application is responsible for selecting the active locale when it renders the site. Do not maintain a second
English copy in a locale directory.

Supported documentation locales are `en`, `ar`, `de`, `es`, `fr`, `he`, `it`, `ja`, `ko`, `nl`, and `zh`. English keeps
the existing unprefixed URLs; translated pages use the same relative slug below their locale directory.

## Documentation Ownership

The repository has two documentation tiers:

- **Project guidance** lives in the root `docs/` tree. It covers architecture, workspace workflows, application
  development, testing, and cross-package troubleshooting.
- **Package documentation** lives beside its owner under `packages/*/docs/`, `configs/*/docs/`,
  `forge-plugins/*/docs/`, `vite-plugins/*/docs/`, `workers/*/docs/`, or another publishable workspace. It covers
  installation, exports, examples, limitations, API reference, and contributor workflows for that package.

Package pages use `docs/index.md` as their entry point. Hand-authored guides live under `docs/guides/`, reference pages
under `docs/reference/`, and localized pages under `docs/locales/<locale>/` within the owning package. The root API page is
a cross-package directory; it is not a substitute for package-owned API documentation.

## Documentation Structure

### Overview

- **[README.md](README.md)**: Project overview and quick start guide
- **[DOCUMENTATION.md](DOCUMENTATION.md)**: This document - comprehensive documentation structure
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Guidelines for contributing to the project
- **[AGENTS.md](AGENTS.md)**: Agent-specific guidelines and instructions
- **[mcp/README.md](mcp/README.md)**: Model Context Protocol (MCP) server documentation

### Core Documentation

#### Platform Overview

- **[docs/overview.md](docs/overview.md)**: High-level overview of the Mission Platform principles, technology stack,
  and features

#### Development Setup

- **[docs/development-setup.md](docs/development-setup.md)**: Detailed instructions for setting up your development
  environment
- **[docs/application-development.md](docs/application-development.md)**: Run, test, and deploy applications in `apps/`

#### Workspace Structure

- **[docs/workspace-structure.md](docs/workspace-structure.md)**: Overview of the repository's directory structure
- **[docs/package-development.md](docs/package-development.md)**: Guidelines for developing and publishing packages
- **[docs/atomic-component-design.md](docs/atomic-component-design.md)**: Atomic design levels, folder layout, and story
  title convention
- **[docs/composable-authoring.md](docs/composable-authoring.md)**: Write-once composables under
  `src/composables/<name>/`
- **[docs/store-authoring.md](docs/store-authoring.md)**: Framework-neutral stores under `src/stores/<name>/`
- **[docs/util-authoring.md](docs/util-authoring.md)**: Pure utils under `src/utils/<name>/`

#### Testing

- **[docs/testing.md](docs/testing.md)**: Comprehensive testing strategies and tools

#### Build System

- **[docs/build-system.md](docs/build-system.md)**: Overview of the build system and configuration

#### Tooling & Configs

- **[docs/configs/index.md](docs/configs/index.md)**: Project-wide directory of configuration packages
- **[configs/eslint-config/docs/index.md](configs/eslint-config/docs/index.md)**: ESLint package usage and development
- **[configs/typescript-config/docs/index.md](configs/typescript-config/docs/index.md)**: TypeScript preset usage and development
- **[configs/vite-config/docs/index.md](configs/vite-config/docs/index.md)**: Vite/Vitest helper usage and development
- **[configs/*/docs/index.md](configs/)**: Documentation owned by each configuration package
- **[docs/configs/workers-config.md](docs/configs/workers-config.md)**: Cross-workspace Cloudflare Worker guidance

### Advanced Documentation

#### Architecture

- **[docs/architecture.md](docs/architecture.md)**: Detailed architecture documentation
- **[vite-plugins/forge/docs/reference/compiler.md](vite-plugins/forge/docs/reference/compiler.md)**: Maintainer-focused explanation of the cross-package strict Forge
  compiler pipeline, explicit target-plugin ownership, native build adapters, and component, hook, and Storyblok consumers

#### API Reference

- **[docs/api-reference.md](docs/api-reference.md)**: Project-wide package directory and compatibility overview; detailed
  usage and API references live beside each package under `packages/*/docs/`, `configs/*/docs/`, and
  `forge-plugins/*/docs/`

#### Migration Guides

- **[docs/migration-guides/vue2-to-vue3.md](docs/migration-guides/vue2-to-vue3.md)**: Step-by-step guide for migrating
  from Vue 2 to Vue 3

### Best Practices

- **[docs/best-practices.md](docs/best-practices.md)**: Essential guidelines for developing, testing, and maintaining
  applications in the Mission Platform monorepo
- **[docs/framework-best-practices.md](docs/framework-best-practices.md)**: Framework integration and adapter guidance

### Troubleshooting

- **[docs/troubleshooting.md](docs/troubleshooting.md)**: Common issues and solutions for debugging and performance
  optimization
- **[docs/circular-dependencies.md](docs/circular-dependencies.md)**: Detecting, preventing, and resolving circular
  dependencies

### Localized content

Every canonical Markdown page must have a counterpart at `docs/locales/<locale>/<slug>.md` for each supported locale.
The locale tree mirrors nested slugs such as `migration-guides/vue2-to-vue3` and `configs/index` exactly. Translations
localize titles, headings, prose, tables, navigation-facing descriptions, and link text while preserving:

- fenced code blocks, command lines, package names, exports, file paths, URLs, and technical identifiers;
- relative links and their `.md` targets, unless a translated page intentionally changes only the visible link text;
- heading structure, list/table shape, and important anchor headings so translated pages remain task-compatible.

Use the locale's established technical terminology consistently. Arabic and Hebrew translations may use RTL prose, but
code, commands, package names, and identifiers remain unchanged and readable. When adding or renaming an English page,
update every locale tree in the same change and verify slug parity before review.

Run the repository validation helper from the root:

```bash
node --experimental-strip-types scripts/validate-doc-locales.ts
```

The check compares the canonical and localized slug inventories, verifies source links, ensures fenced code blocks
remain byte-for-byte identical, and rejects locale pages whose headings/prose are still effectively English copies.
Regenerate locale trees with:

```bash
node --experimental-strip-types scripts/generate-doc-locales.ts
```

## How to Contribute Documentation

1. **Identify gaps**: Review existing documentation against common questions and issues
2. **Create new files**: Add documentation in the `docs/` directory following the naming conventions
3. **Update references**: Update README.md and other documentation files to include links to new documentation
4. **Translate the page**: Add the same slug under every supported `docs/locales/<locale>/` tree
5. **Follow standards**: Use Diátaxis documentation framework principles
6. **Review changes**: Ensure documentation is accurate, translated, and follows project conventions

## Documentation Standards

### File Naming

- Use kebab-case for all markdown files
- Group related documentation in subdirectories (e.g., `migration-guides/`, `best-practices/`, `troubleshooting/`)

### Content Structure

- Follow the Diátaxis framework structure:
  - Tutorials
  - How-to Guides
  - Explanation
  - Reference
  - Discovery
- Use clear headings and subheadings
- Include code examples with proper formatting
- Add tables for comparisons and summaries

### Technical Requirements

- English is the canonical authoring language; published user-facing pages also have localized counterparts for every
  supported locale (machine-assisted translations; human review recommended for release-critical pages)
- Keep locale trees structurally identical to the English tree and never translate executable technical identifiers
- Use Mermaid diagrams where appropriate (with size limitations); fenced `mermaid` blocks render through the shared
  `ForgeMarkdown` path and must retain readable source/error fallbacks for SSR and client-rendering failures
- Ensure all links are working
- Update documentation when codebase changes
- Include version information where relevant

## Getting Help

For questions about:

- **Development**: Check the documentation or ask in the project channels
- **Package usage**: Refer to the API reference or package READMEs
- **Troubleshooting**: Use the troubleshooting guide or search for similar issues
- **Contribution guidelines**: Refer to CONTRIBUTING.md

## License

Documentation is licensed under the same terms as the code - see the LICENSE file for details.

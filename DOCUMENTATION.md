# Mission Platform Documentation

This repository contains comprehensive documentation for the Mission Platform, a VueJS 3 monorepo managed with pnpm workspaces.

## Browsing the Documentation

All documents under `docs/` can be read directly on GitHub, or browsed in a dedicated documentation site: the **`@mission-platform/docs`** app (`apps/docs`). It is a Vite + Vue 3 single-page app that renders the canonical Markdown in `docs/` at build time, with grouped sidebar navigation, per-page table of contents, syntax-highlighted code, and in-app cross-links.

```bash
# Start the documentation site locally
pnpm --filter @mission-platform/docs dev

# Type-check and build the static site
pnpm --filter @mission-platform/docs build

# Preview the production build
pnpm --filter @mission-platform/docs preview
```

Because the site reads the files in `docs/` directly, updating a Markdown document automatically updates the rendered site — there is no separate copy to maintain.

## Documentation Structure

### Overview
- **[README.md](README.md)**: Project overview and quick start guide
- **[DOCUMENTATION.md](DOCUMENTATION.md)**: This document - comprehensive documentation structure
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Guidelines for contributing to the project
- **[AGENTS.md](AGENTS.md)**: Agent-specific guidelines and instructions
- **[mcp/README.md](mcp/README.md)**: Model Context Protocol (MCP) server documentation

### Core Documentation
#### Platform Overview
- **[docs/overview.md](docs/overview.md)**: High-level overview of the Mission Platform principles, technology stack, and features

#### Development Setup
- **[docs/development-setup.md](docs/development-setup.md)**: Detailed instructions for setting up your development environment

#### Workspace Structure
- **[docs/workspace-structure.md](docs/workspace-structure.md)**: Overview of the repository's directory structure
- **[docs/package-development.md](docs/package-development.md)**: Guidelines for developing and publishing packages
- **[docs/atomic-component-design.md](docs/atomic-component-design.md)**: Atomic design levels, folder layout, and story title convention
- **[docs/composable-authoring.md](docs/composable-authoring.md)**: Write-once composables under `src/composables/<name>/`
- **[docs/store-authoring.md](docs/store-authoring.md)**: Framework-neutral stores under `src/stores/<name>/`
- **[docs/util-authoring.md](docs/util-authoring.md)**: Pure utils under `src/utils/<name>/`

#### Testing
- **[docs/testing.md](docs/testing.md)**: Comprehensive testing strategies and tools

#### Build System
- **[docs/build-system.md](docs/build-system.md)**: Overview of the build system and configuration

#### Tooling & Configs
- **[docs/configs/index.md](docs/configs/index.md)**: Overview of centralized configuration packages
- **[docs/configs/eslint-config.md](docs/configs/eslint-config.md)**: Centralized ESLint configuration
- **[docs/configs/scripts-config.md](docs/configs/scripts-config.md)**: Utility scripts configuration and usage
- **[docs/configs/workers-config.md](docs/configs/workers-config.md)**: Cloudflare Workers configuration guidelines

### Advanced Documentation
#### Architecture
- **[docs/architecture.md](docs/architecture.md)**: Detailed architecture documentation

#### API Reference
- **[docs/api-reference.md](docs/api-reference.md)**: References for all Mission Platform packages and framework adapters

#### Migration Guides
- **[docs/migration-guides/vue2-to-vue3.md](docs/migration-guides/vue2-to-vue3.md)**: Step-by-step guide for migrating from Vue 2 to Vue 3

### Best Practices
- **[docs/best-practices.md](docs/best-practices.md)**: Essential guidelines for developing, testing, and maintaining applications in the Mission Platform monorepo

### Troubleshooting
- **[docs/troubleshooting.md](docs/troubleshooting.md)**: Common issues and solutions for debugging and performance optimization
- **[docs/circular-dependencies.md](docs/circular-dependencies.md)**: Detecting, preventing, and resolving circular dependencies

## How to Contribute Documentation

1. **Identify gaps**: Review existing documentation against common questions and issues
2. **Create new files**: Add documentation in the `docs/` directory following the naming conventions
3. **Update references**: Update README.md and other documentation files to include links to new documentation
4. **Follow standards**: Use Diátaxis documentation framework principles
5. **Review changes**: Ensure documentation is accurate, up-to-date, and follows project conventions

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
- All documentation must be written in English
- Use Mermaid diagrams where appropriate (with size limitations)
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
# Mission Platform Overview

## What is Mission Platform?

**Mission Platform** is a **composable, package-driven Vue 3 component platform** designed for building production-ready applications with reusable building blocks. It follows a monorepo architecture managed with [pnpm workspaces](https://pnpm.io/workspaces) and orchestrated by [Turborepo](https://turborepo.com).

## Core Principles

### 1. Composable Architecture
Mission Platform emphasizes **composition over inheritance**. Instead of large, monolithic frameworks, the platform provides small, focused packages that can be combined to build applications.

### 2. Cross-Framework Development
The platform supports writing components once and using them across multiple frameworks (currently Vue 3 and React) through innovative compilation techniques.

### 3. Type Safety
Every package is written in **TypeScript**, ensuring type safety throughout the development process and providing excellent developer experience with autocompletion and error checking.

### 4. Design System Integration
Built-in support for design tokens, theming, and responsive breakpoints ensures consistent visual appearance across applications.

## Key Features

### Framework-Neutral JSX Runtime
- Write components once using a framework-neutral JSX dialect
- Compile to native Vue 3 or React components at build time
- Zero runtime overhead
- Full TypeScript support

### Comprehensive Component Library
- Layout and structure primitives (stacks, grids, separators)
- Application shell components (navigation, tabs, pagination)
- Typography and content blocks
- Form inputs and validation
- Data display components with virtualization
- Feedback and overlay elements

### Internationalization Support
- Framework-agnostic i18next wrapper
- Vue 3 and React adapters
- Base locales included
- Easy integration with external translation services

### Routing System
- Framework-neutral route definitions
- Type-safe navigation
- Nested routes support
- Query string parsing and serialization

### Build Optimization
- TurboRepo for task orchestration and caching
- Vite for fast development and production builds
- Efficient cross-framework compilation

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **Vue 3** | UI framework for applications and components |
| **TypeScript** | Type-safe JavaScript across all workspaces |
| **Vite** | Development server and production bundler |
| **pnpm workspaces** | Monorepo dependency management |
| **Turborepo** | Task orchestration, caching, and incremental builds |
| **Storybook** | Component development, documentation, and visual testing |
| **Vitest + Playwright** | Unit and browser-level testing |
| **Changesets** | Versioning and changelog automation |

## Repository Structure

```
composable_mission_ready_platform/
├── apps/                   # Deployable applications
│   ├── my-care-notes/      # Vue 3 note-taking application with spell checking
│   ├── service-monitor/    # Service health and status monitoring dashboard
│   ├── storybook/          # Vue 3 Storybook component catalogue and visual tests
│   ├── storybook-react/    # React Storybook catalogue for cross-framework components
│   └── website/            # Platform website and documentation portal
├── configs/                # Shared tooling configurations
│   ├── eslint-config/      # ESLint flat configuration
│   ├── prettier-config/    # Prettier configuration
│   └── ...                 # Other shared configs
├── packages/               # Reusable building blocks
│   ├── jsx/                # Framework-neutral JSX runtime
│   ├── components/         # Cross-framework component library
│   ├── router/             # Framework-agnostic routing
│   └── ...                 # Other packages
├── vite-plugins/           # Vite build plugins
└── workers/                # Cloudflare Workers
```

## Who Should Use Mission Platform?

### For Application Developers
- Build production-ready Vue 3 applications quickly
- Leverage a comprehensive component library
- Benefit from built-in internationalization and routing
- Deploy to Cloudflare Pages with ease

### For Component Library Authors
- Write components once, use them across frameworks
- Maintain consistent API across Vue 3 and React
- Benefit from automated testing infrastructure
- Reach wider audience with cross-framework support

### For Design System Teams
- Define design tokens in DTCG format
- Generate SCSS/CSS/TypeScript artifacts automatically
- Ensure visual consistency across applications
- Support both light and dark themes

## Getting Started

To start using Mission Platform, see the [Development Setup](development-setup.md) guide for installation instructions.

For package authors, check out the [Package Development](package-development.md) guide to learn how to create new packages.

For workspace organization and application architecture, see the [Workspace Structure](workspace-structure.md) guide.
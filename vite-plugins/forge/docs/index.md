# @mission-platform/vite-plugin-forge

The framework-neutral Forge compiler driver for Vite and tsdown. This package
owns parsing, normalization, semantic analysis, neutral optimization, caching,
target dispatch, and generic build orchestration; framework and CMS output
packages own their target-specific lowering and generation.

## Start here

- [Compiler pipeline reference](reference/compiler.md) — stage contracts,
  target ownership, caching, diagnostics, and generated artifacts.
- [Build and test guide](guides/development.md) — local development and
  integration checks.
- [`README.md`](../README.md) — consumer configuration and representative
  Vite/tsdown examples.
- [`llms.txt`](../llms.txt) — concise package API and pipeline notes.

The driver requires an explicit `FrameworkOutputPlugin`; it never selects a
framework from a string or import every target package. Generated modules are
intermediate artifacts and must be compiled by the selected target's native
adapter.

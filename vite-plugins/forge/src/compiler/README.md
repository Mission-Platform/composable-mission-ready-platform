# Forge compiler phases

The compiler is intentionally split into contracts that can be migrated independently:

1. A frontend produces a serializable generic AST and semantic IR.
2. A `FrameworkOutputPlugin` lowers shared intentions, applies target-specific optimization, and generates source.
3. The plugin's `build.vite()` and `build.tsdown()` bundles configure native Stage-2 compilation.
4. `generate.ts`, `generate-hooks.ts`, `config.ts`, and `tsdown.ts` remain responsible for file layout, declarations, and bundler orchestration.

The current built-in factories use the compatibility adapter in `pipeline.ts`: `SourceFile` is available only through `GeneratorContext.compatibility` while legacy emitters are migrated. The semantic IR itself contains source-backed expressions and spans, so unknown TypeScript can be retained without exposing TypeScript nodes to future phases.

Astro is no longer a framework output plugin: it is a **CMS target** (`@mission-platform/forge-cms-astro`) that composes one of the framework plugins to hydrate its islands. Web Components expose empty build bundles because their generated output is TypeScript and needs no framework compiler.

`analyzeForgeModule()` is the neutral seam for consumers that need the semantic IR without electing a target plugin — the CMS projection driver in `@mission-platform/forge-cms-plugin-api` uses it, and results are shared through the same cache the framework pipeline uses.

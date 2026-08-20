# Forge compiler phases

The compiler is intentionally split into contracts that can be migrated independently:

1. A frontend produces a serializable generic AST and semantic IR.
2. A `FrameworkOutputPlugin` lowers shared intentions, applies target-specific optimization, and generates source.
3. The plugin's `build.vite()` and `build.tsdown()` bundles configure native Stage-2 compilation.
4. `generate.ts`, `generate-hooks.ts`, `config.ts`, and `tsdown.ts` remain responsible for file layout, declarations, and bundler orchestration.

The active Forge compile path is parser-neutral after frontend parsing: source edits and semantic records carry source-backed expressions and spans, so unknown TypeScript can be retained without exposing parser nodes to target plugins. `GeneratorContext.compatibility` is limited to target-emitter compatibility data and does not provide a Forge `SourceFile`.

## Oxc frontend boundary

The neutral frontend (`frontends.ts`, `infer.ts`, `oxc.ts`) parses JS/JSX/TS/TSX
with `oxc-parser` and builds `GenericModuleAst` plus `SemanticModule` intentions
from the Oxc program. Supported syntax matches the previous `parseTsx` surface
(modules, imports/exports, type-only constructs, JSX/TSX). Parser failures become
structured `CompilerDiagnostic` values (`FORGE_FRONTEND_PARSE_ERROR`) with file,
range, severity, and message.

Plugin contracts remain semantic: target lowerers consume `SemanticModule` /
source-backed records, not Oxc or TypeScript AST nodes. The shared compiler
utilities in `@mission-platform/forge-plugin-api/compiler/*` likewise consume
generic render records and return semantic hoist/optimization results or
validated `SourceEdit` ranges. The active frontend, optimizer, hoister, service
cache, and inference path do not create or transform TypeScript AST nodes.

## Intentional TypeScript boundaries

TypeScript remains only in separate compatibility or type-oriented operations:

- `graph.ts` uses `ts.readConfigFile` to read `baseUrl` and `paths`; it does not
  parse or transform Forge source.
- `generate-hooks.ts` uses `ts.createProgram`/`emit` to synthesize declaration
  files for generated hook libraries.
- `generate.ts` retains TypeScript and `svelte2tsx` only for declaration and
  exported-type analysis, outside per-module Forge lowering. Import inspection
  and generated barrel rewriting use the Oxc facts/source spans.
- `compiler/ast.ts` still exports legacy static-analysis helpers used by CMS
  content classification; these are compatibility/type-analysis APIs, not part
  of the active neutral compile path.

CMS type-oriented analysis may therefore retain TypeScript types and nodes. No
target plugin contract exposes those implementation types: target lowerers
consume `SemanticModule`, diagnostics, generated-module records, and source
edits only.

Astro is no longer a framework output plugin: it is a **CMS target** (`@mission-platform/forge-cms-astro`) that composes one of the framework plugins to hydrate its islands. Web Components expose empty build bundles because their generated output is TypeScript and needs no framework compiler.

`analyzeForgeModule()` is the neutral seam for consumers that need the semantic IR without electing a target plugin — the CMS projection driver in `@mission-platform/forge-cms-plugin-api` uses it, and results are shared through the same cache the framework pipeline uses.

## Persistent service contract

`createForgeCompilerService()` provides the process-local lifecycle boundary used
by Vite and tsdown. Keep one service per build/watch session, reuse it across
explicit target plugins, and call `dispose()` when the session ends. Call
`invalidate(changedFiles)` for watch events; reverse graph dependencies determine
the affected modules.

The service report is the operational interface for maintainers. It records
phase timings (`frontend`, `optimization`, `inference`, `target-lowering`, and
`generation`), semantic cache hits/misses, invalidated files, diagnostics, and
the number of manifest artifacts. Cache inputs include source/config and
`tsconfig` alias fingerprints, router/compiler options, and target plugin
identity, so target output remains isolated and deterministic.

## TypeScript baseline and Oxc comparison benchmark

The committed `vite-plugins/forge/benchmarks/typescript-baseline.json` is the
captured TypeScript baseline. Do not regenerate it during normal validation;
the current package command runs the Oxc compiler and writes a separate
comparison artifact:

```sh
pnpm --filter @mission-platform/vite-plugin-forge bench
```

Use `pnpm --filter @mission-platform/vite-plugin-forge bench:baseline` only
when intentionally recapturing the TypeScript reference. Both runs use the
same deterministic small, medium, and large TSX fixtures covering JSX, props
and types, hooks/effects, slots, aliases, and a large render tree. They record
parse/normalize, semantic inference, optimization/hoisting, full neutral
compilation, and target generation for cold and warm cache cases.

The Oxc command writes
`vite-plugins/forge/benchmarks/oxc-comparison.json`. Its JSON report contains
Node/runtime and machine metadata, fixture sizes and source byte counts,
iteration and warmup counts, mean/median/p95/min/max latency, throughput,
observed heap deltas, and per-phase percentage changes in median latency,
throughput, and memory against the committed TypeScript samples. It also
prints a concise aggregate comparison; positive latency change means slower,
while positive throughput change means faster. Set
`FORGE_BENCH_ITERATIONS` and `FORGE_BENCH_WARMUP_ITERATIONS` to repeat a run
with fixed sample counts.

The benchmark is gated behind `FORGE_BENCH_RUN=1` (the package scripts set it),
so normal `pnpm test` runs do not write benchmark artifacts. The default is
eight measured and two warmup iterations. Cold samples recreate their
parser/service state for each measured iteration, while warm samples reuse
parsed source or one persistent compiler service. Results are comparative
evidence, not a hardware-independent pass threshold.

Artifact manifests retain generated modules, extra modules, declarations, maps,
and checksums. Native build promotion must validate the manifest before replacing
the previous successful output. A future worker or daemon can implement the
same service contract, but the current service stays in-process because target
plugins and their adapters are caller-owned functions.

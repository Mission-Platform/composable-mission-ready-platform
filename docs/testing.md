# Testing in Mission Platform

This document describes the testing strategy and tooling for the Mission Platform monorepo. It serves as both a **How-to
guide** for common testing tasks and a **Technical reference** for the underlying configuration.

## Testing Stack

Mission Platform uses a modern, unified testing stack based on Vitest:

- **Vitest**: The primary test runner for unit, component, and browser-based testing.
- **@vue/test-utils**: Standard library for testing Vue components.
- **Vitest Browser Mode (Playwright)**: Real-browser execution for interaction and visual testing where configured.
- **Storybook Test Runner**: Integration between Storybook stories and Vitest for automated interaction testing.

## How-to: Run Tests

Tests are executed via Turborepo to leverage caching and workspace-aware execution.

### Run All Tests

To run all unit and component tests across the entire monorepo:

```bash
pnpm test
```

### Run Tests for a Specific Workspace

To run tests for a single package or application:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### Run Affected Tests (CI-style)

For faster local feedback that matches the CI `--affected` behavior:

```bash
pnpm exec turbo run test --affected
```

`--affected` selects test tasks for workspaces changed relative to the repository's base revision. Omit it to run every
workspace test task. Coverage is package-specific; for example, the components package provides:

```bash
pnpm --filter @mission-platform/components test:coverage
```

### Watch Mode

For development, use watch mode to re-run tests on file changes:

```bash
pnpm --filter @mission-platform/components test:watch
```

### Coverage Reports

To generate a coverage report using the `v8` provider:

```bash
pnpm --filter @mission-platform/components test:coverage
```

Reports are output to the `coverage/` directory within each workspace.

## How-to: Write Tests

### Unit and Component Tests

Tests are colocated with the source code and use the `.spec.ts` (or `.spec.tsx`) extension.

```typescript
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import ForgeButton from "./ForgeButton.vue";

describe("ForgeButton.vue", () => {
  it("renders props.label when passed", () => {
    const label = "Click Me";
    const wrapper = mount(ForgeButton, {
      props: { label },
    });
    expect(wrapper.text()).toMatch(label);
  });

  it("emits click event when clicked", async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger("click");
    expect(wrapper.emitted()).toHaveProperty("click");
  });
});
```

### Browser Testing

Mission Platform utilizes Vitest's Browser Mode for tests that require a real DOM environment or cross-browser
verification.

1. Author your test file as usual.
2. Ensure the package `vitest.config.ts` enables browser mode (see Reference below).
3. Run with `pnpm test`.

### Forge Web Script Tests

Use `@mission-platform/forge-web-script-vitest` for deterministic compiler, artifact, Wasm, and self-hosted parity
checks. It delegates compilation to the same compiler service and Vite plugin used by production; it does not create a
second module system.

Install the package in a workspace that tests `.fws` modules, then compose its adapter with the standard Vitest config:

```typescript
// vitest.config.ts
import { defineForgeWebScriptVitestConfig } from "@mission-platform/forge-web-script-vitest";

export default defineForgeWebScriptVitestConfig({
  environment: "node",
  forgeWebScript: {
    root: import.meta.dirname,
    requestedCapabilities: ["clock.now"],
    selfHostedVmMode: "interpret",
  },
  overrides: {
    // Consumer plugins, aliases, and other Vite/Vitest settings remain active.
    resolve: { alias: { "@fixtures": "./fixtures" } },
  },
});
```

For direct compiler and runtime assertions, create one harness per suite or test and dispose it in `afterEach`:

```typescript
import { afterEach, describe, expect, it } from "vitest";
import {
  assertForgeWebScriptDiagnostic,
  assertForgeWebScriptNoDiagnostics,
  createForgeWebScriptTestHarness,
} from "@mission-platform/forge-web-script-vitest";

describe("FWS fixture", () => {
  const harness = createForgeWebScriptTestHarness({
    requestedCapabilities: ["clock.now"],
  });

  afterEach(() => harness.dispose());

  it("checks artifacts, Wasm exports, and explicit capabilities", async () => {
    const result = await harness.compile("valid/scalar.fws");
    assertForgeWebScriptNoDiagnostics(result.diagnostics);
    expect(result.artifact.manifest?.exports.map(({ name }) => name)).toEqual([
      "answer",
    ]);
    expect(
      (
        await harness.load<{ answer: () => number }>("valid/scalar.fws")
      ).answer(),
    ).toBe(42);

    const clock = await harness.load<{ current: () => bigint }>(
      "capabilities/clock-now.fws",
      {
        "clock.now": { now: () => 123n },
      },
    );
    expect(clock.current()).toBe(123n);
  });

  it("keeps diagnostic code, phase, and span structured", async () => {
    const result = await harness.inspect("diagnostics/invalid-type.fws");
    assertForgeWebScriptDiagnostic(result.diagnostics, {
      code: "FWS-TYPE-005",
      phase: "type-check",
      line: 2,
    });
  });
});
```

`load` and `loadSync` accept only the capability imports supplied by the test. Missing declared imports and supplied
undeclared imports fail explicitly; no browser or Node APIs are injected implicitly. Use `compileGraph` for source-import
graphs and compare `graphHash`, linked modules, declarations, and content hashes when testing link configuration.

The adapter path tests the generated ESM contract as Vitest sees it:

```typescript
import {
  abiManifest,
  load,
  loadSync,
  manifest,
} from "./fixtures/valid/scalar.fws";

expect(abiManifest).toEqual(manifest);
expect((await load<{ answer: () => number }>()).answer()).toBe(42);
expect(loadSync<{ answer: () => number }>().answer()).toBe(42);
```

For FWS values, test both layers explicitly. Raw WASM tests should assert the
pointer-length ABI and ownership calls; generated ESM tests should assert the
JavaScript projection:

```typescript
const artifact = harness.compileSource(
  `
  export fn echo(value: string) -> string { return value; }
`,
  "strings.fws",
).artifact;

const generated = await importFromEsmSource(artifact.esmSource);
expect(generated.loadSync().echo("Δοκιμή 🚀")).toBe("Δοκιμή 🚀");
expect((await generated.load()).echo("")).toBe("");
```

Generated-loader boundary tests should cover ASCII, empty, multi-byte UTF-8,
returned concatenations, string capability imports, raw `bytes` tuples, and
the exposed `memory`. Use fatal UTF-8 fixtures and assert that temporary
`fws_dealloc` calls occur on successful returns, guest traps, host exceptions,
and decode failures. Instrument the generated `artifact.esmSource` before
importing it; patching exports after loading does not observe wrappers that
close over the original allocator and deallocator.

The generated adapter packs all string arguments for one invocation into one
guest allocation. Keep an allocation-count assertion for functions with
multiple string parameters, and retain a scalar-only test to verify that no
string marshalling work is generated for numeric-only functions. A bytes test
must continue to pass a `[pointer, length]` tuple rather than expecting an
automatic `Uint8Array` conversion.

The benchmark workspace compares the raw pointer-length adapter with the
generated ESM adapter as separate FWS modes:

```bash
pnpm --filter @mission-platform/benchmark run bench -- \
  --node-only --warmup 3 --samples 10 \
  --output benchmark/results/fws-generated-boundary
```

Reports include build, initialization, and steady-state execution phases. The
FWS raw `wasm` row uses fresh instances and three string input allocations for
the benchmark kernel; `wasm-generated` uses the generated `loadSync` contract
and one packed string input allocation. Because the current guest deallocator
validates ranges without recycling bump-allocator space, generated string/bytes
samples use a fresh loader instance per call; scalar samples reuse the loaded
instance. This isolates each allocation-heavy sample and is intentionally
reported as loader-boundary overhead rather than a persistent-instance claim.
Each artifact reports raw Wasm bytes, generated ESM source bytes, content hash,
and the static allocation counts used by the comparison. Compare rows only
when the corpus hash, host runtime, and benchmark schema match.

For example, the Node-only run above produced 336 measured phase results with
zero failures and corpus hash `ad092f7c552cc914`. Both FWS rows had raw Wasm
hash `0ac58f11`, raw Wasm size 1,625 bytes, and generated ESM source size 18,490
bytes; raw and generated string input allocation counts were 3 and 1. On the
Unicode-small string case, mean initialization was 0.00024 ms raw versus
0.00188 ms generated, and mean execution was 0.0236 ms raw versus 0.1070 ms
generated on the recorded Node run. These figures are representative evidence,
not cross-machine performance guarantees; use the report's per-case samples
for comparisons.

The plugin also exposes explicit virtual queries for `?forge-web-script-manifest`, `?forge-web-script-declarations`,
`?forge-web-script-wasm`, and `?forge-web-script-source-map`. To make those ambient modules discoverable to TypeScript,
add the shipped declaration subpath to the test project's types:

```json
{
  "compilerOptions": {
    "types": [
      "node",
      "@mission-platform/forge-web-script-vitest/forge-web-script"
    ]
  }
}
```

Alternatively, add `/// <reference types="@mission-platform/forge-web-script-vitest/forge-web-script" />` to a test-only
type entrypoint included by the project. The declaration subpath is type-only and does not add a runtime import.

Use shared fixtures in `packages/forge-web-script-vitest/fixtures/` for cross-package language and ABI conformance:
`valid/`, `diagnostics/`, `capabilities/`, `graphs/`, and `self-hosted/` are intentionally stable. Keep a fixture beside
a compiler, runtime, or plugin spec when it covers a private implementation detail; use inline source for small parser or
VM unit cases. This keeps fixture names and cleanup deterministic without forcing low-level tests through the harness.

`checkVmParity(file, mode)` supports `interpret`, `jit`, and `aot`, but its report is the existing bounded self-hosted
lex-stage parity contract. Assert `parity`, fingerprints, steps, and AOT reproducibility metadata; do not treat the report
as arbitrary compiled-FWS VM execution or as a replacement for Wasm behavior tests.

Run the focused FWS matrix with the normal workspace tasks:

```bash
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-vitest
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-runtime
pnpm exec turbo run test build:check --filter @mission-platform/vite-plugin-forge-web-script
```

## Technical Reference

### Shared Configuration

Most workspaces use the `defineVitestConfig` utility from `@mission-platform/vite-config`. This provides a standardized
environment:

- **Environment**: `jsdom` by default.
- **Globals**: Enabled (no need to import `describe`, `it`, `expect` unless desired).
- **Plugins**: Includes `@vitejs/plugin-vue` and i18n block ignoring.
- **Coverage**: Preconfigured `v8` provider.

**Example `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from "@mission-platform/vite-config/vitest";

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  },
});
```

### Directory Structure

- `src/**/*.spec.ts`: Unit tests and component tests.
- `src/**/*.stories.tsx`: Storybook stories (also used as interaction test definitions).
- `apps/storybook/vitest.config.ts`: Main configuration for browser-based interaction tests.

### Scripts Summary

| Script          | Command                                                    | Purpose                                |
| :-------------- | :--------------------------------------------------------- | :------------------------------------- |
| `test`          | `pnpm exec turbo run test`                                 | Run all workspace test tasks.          |
| `test:watch`    | `pnpm --filter @mission-platform/components test:watch`    | Run components tests in watch mode.    |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | Generate a components coverage report. |
| Rust/WASM       | `cargo test --workspace`                                   | Run native Rust crate tests.           |

Wasm wrapper packages are tested through their owning package tasks. For example, run the scanner package and its
wrapper together when changing scanner behavior:

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## Related Documentation

- [Development Setup](development-setup.md)
- [Best Practices](best-practices.md)
- [Package Development](package-development.md)

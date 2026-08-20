# Forge Web Script benchmark

This private workspace measures the shared arithmetic, string, and dataset
corpus through JavaScript, Rust/WASM, AssemblyScript/WASM, and Forge Web Script
VM/emitted-WASM adapters. It runs the same cases in Node and headless Chromium
when the documented prerequisites are installed.

## Prerequisites

- Node and pnpm versions declared by the repository root.
- The repository dependencies installed with `pnpm install`.
- Rust and `wasm-pack` for the Rust/WASM target.
- A Chromium executable installed for Playwright. Run `pnpm exec playwright
install chromium` if Playwright has not been installed on the machine.

Missing Rust, AssemblyScript, or Chromium prerequisites are recorded as
actionable environment/build failures in the report; they do not hide the
results for other targets.

## Running

From the repository root:

```text
pnpm bench
pnpm bench --warmup 0 --samples 1
pnpm bench --node-only --output benchmark/results/local-node
pnpm bench --baseline benchmark/results/previous/report.json
```

Useful options are:

- `--warmup N` — unreported warmup executions (default `3`).
- `--samples N` — measured executions per case (default `10`).
- `--node-only` or `--browser-only` — restrict the host. These flags are
  mutually exclusive.
- `--output DIR` — write the three artifacts to this exact run directory.
  Without it, output is written to `benchmark/results/<run-id>/`.
- `--run-id ID` — choose the default directory name when `--output` is not
  supplied.
- `--baseline REPORT.JSON` — compare the new canonical JSON report with an
  existing report without rerunning the baseline.

Every completed invocation writes:

- `report.json` — canonical machine-readable report for future baselines.
- `report.md` — human-readable Markdown report.
- `report.html` — escaped, self-contained HTML report with no external assets.

## Interpreting reports

Build, initialization, and steady-state execution are separate phases. FWS
`interpret`, `jit`, `aot`, and emitted `wasm` modes have distinct keys; JIT/AOT
preparation is therefore not silently included in execute timings. Artifact
sizes and hashes, warmups, sample counts, nearest-rank median/p95, min/max,
mean, throughput, memory observations where available, compiler metadata, and
host information are retained in JSON.

Correctness is checked against deterministic golden outputs before execute
timing. Failed or unsupported cases remain visible with a bounded expected /
observed value and reason, but are excluded from rankings. Build, runtime,
toolchain, browser, and correctness failures are listed separately and do not
discard successful target results.

Baseline rows match on case/workload, input size, implementation, FWS mode,
host runtime, and phase. Comparable rows show median-latency and throughput
percentage deltas (`current - baseline` divided by baseline). Schema, corpus,
or host-environment differences are explicitly marked **not comparable**;
missing keys are reported as missing-current or missing-baseline rather than
being presented as a misleading speed change.

The **JavaScript Performance Comparisons** section evaluates every non-JavaScript
`execute` row against the JavaScript row with the same case, workload, input
size, and host runtime. Node candidates use Node JavaScript, and Chromium
candidates use Chromium JavaScript; FWS modes remain separate candidates. A
comparison is **comparable** only when both rows were measured, correctness
passed, and both rows have finite, positive median and throughput statistics.
Missing references are reported as **missing-baseline**; failed, unsupported,
incorrect, or invalid-statistic rows are **not-comparable** with an explanation.

For a candidate `C` and matching JavaScript reference `J`, latency ratio is
`C median / J median` (above `1x` means higher latency, below `1x` means lower
latency), while throughput ratio is `C throughput / J throughput` (above `1x`
means higher throughput). Latency percentage is
`(C median - J median) / J median * 100` (positive means slower); throughput
percentage is `(C throughput - J throughput) / J throughput * 100` (positive
means higher throughput).

The **FWS Performance Comparisons** section adds two reference rows for every
FWS execute candidate: matching AssemblyScript/WASM and Rust/WASM rows on the
same case, input size, and host runtime. FWS modes remain separate candidates,
and a missing or invalid reference is retained as **missing-baseline** or
**not-comparable** rather than being converted into a misleading ratio. For
each candidate `C` and reference `R`, the same formulas apply: latency ratio is
`C median / R median`, throughput ratio is `C throughput / R throughput`, and
each percentage is `(C - R) / R * 100` for the corresponding metric.

Results are hardware- and runtime-dependent. The benchmark deliberately does
not define universal performance thresholds or compare native Rust execution.
Rust and AssemblyScript are compared only through their WASM artifacts, and
short string cases include adapter boundary costs. `--browser-only` currently
does not build or load artifacts, so it produces a partial report with no
measurements unless artifacts are supplied by a future prebuilt-artifact
loader; use the combined command for a complete run.

Normal repository `build` and `test` tasks do not run benchmark measurements;
the Turbo benchmark task is explicitly non-cached.

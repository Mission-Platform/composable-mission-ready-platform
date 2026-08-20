import path from "node:path";

import { chromium } from "playwright";

import { BENCHMARK_ROOT } from "./build.ts";
import { BENCHMARK_CORPUS } from "./corpus.ts";

import type {
  BenchmarkCase,
  BenchmarkFailure,
  BuildArtifact,
  MeasurementOptions,
  PhaseMeasurement,
  CorrectnessResult,
} from "./contracts.ts";
import type {
  BrowserBenchmarkRequest,
  BrowserBenchmarkResult,
} from "../browser/entry.ts";
import type { Browser } from "playwright";
import type { ViteDevServer } from "vite";

type BrowserGlobal = typeof globalThis & {
  __benchmarkRequest?: BrowserBenchmarkRequest;
  __benchmarkResult?: BrowserBenchmarkResult;
};

export interface BrowserRunnerOptions extends Partial<MeasurementOptions> {
  readonly cases?: readonly BenchmarkCase[];
  readonly artifacts: readonly BuildArtifact[];
  readonly buildFailures?: readonly BenchmarkFailure[];
  readonly timeoutMs?: number;
}

export interface ChromiumBenchmarkResult {
  readonly status: "completed" | "blocked" | "failed";
  readonly measurements: readonly PhaseMeasurement[];
  readonly correctness: readonly CorrectnessResult[];
  readonly failures: readonly BenchmarkFailure[];
  readonly browserVersion?: string;
}

function browserPath(value: string): string {
  if (!value.startsWith("file:")) return value;
  const filePath = new URL(value);
  const relative = path
    .relative(BENCHMARK_ROOT, filePath.pathname)
    .split(path.sep)
    .join("/");
  return `/${relative}`;
}

function browserArtifact(artifact: BuildArtifact): BuildArtifact {
  const metadata = artifact.metadata;
  if (metadata === undefined) return artifact;
  const updated = { ...metadata };
  for (const name of ["moduleUrl", "wasmUrl"] as const) {
    if (typeof updated[name] === "string")
      updated[name] = browserPath(updated[name]);
  }
  return { ...artifact, metadata: updated };
}

function errorMessage(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  return value.length > 500 ? `${value.slice(0, 497)}...` : value;
}

function failure(
  message: string,
  category: "environment" | "runtime",
): BenchmarkFailure {
  return {
    implementation: "javascript",
    phase: "execute",
    category,
    message,
  };
}

export async function runChromiumBenchmark(
  options: BrowserRunnerOptions,
): Promise<ChromiumBenchmarkResult> {
  const timeout = options.timeoutMs ?? 120_000;
  let browser: Browser | undefined;
  let server: ViteDevServer | undefined;
  try {
    const { createServer } = await import("vite");
    server = await createServer({
      root: BENCHMARK_ROOT,
      server: { host: "127.0.0.1", port: 0, strictPort: false },
      appType: "spa",
      logLevel: "error",
    });
    await server.listen();
    const address = server.httpServer?.address();
    if (
      address === null ||
      address === undefined ||
      typeof address === "string"
    ) {
      throw new Error("Vite benchmark server did not expose a TCP address.");
    }
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${address.port}/browser/index.html`, {
      waitUntil: "load",
      timeout,
    });
    const request: BrowserBenchmarkRequest = {
      cases: options.cases ?? BENCHMARK_CORPUS,
      artifacts: options.artifacts.map((artifact) => browserArtifact(artifact)),
      ...(options.warmupIterations === undefined
        ? {}
        : { warmupIterations: options.warmupIterations }),
      ...(options.sampleIterations === undefined
        ? {}
        : { sampleIterations: options.sampleIterations }),
    };
    await page.evaluate((value) => {
      (
        globalThis as typeof globalThis & {
          __benchmarkRequest?: BrowserBenchmarkRequest;
        }
      ).__benchmarkRequest = value;
      globalThis.dispatchEvent(new Event("benchmark-request"));
    }, request);
    await page.waitForFunction(
      () => document.title === "benchmark-complete",
      undefined,
      { timeout },
    );
    const result = await page.evaluate(
      () => (globalThis as BrowserGlobal).__benchmarkResult,
    );
    if (result === undefined)
      throw new Error("Browser harness completed without a result.");
    return {
      status: "completed",
      measurements: result.measurements,
      correctness: result.correctness,
      failures: [...(options.buildFailures ?? []), ...result.failures],
      browserVersion: result.browserVersion,
    };
  } catch (error) {
    const message = errorMessage(error);
    const category =
      /browser|executable|sandbox|not found|missing|permission/i.test(message)
        ? "environment"
        : "runtime";
    return {
      status: category === "environment" ? "blocked" : "failed",
      measurements: [],
      correctness: [],
      failures: [
        ...(options.buildFailures ?? []),
        failure(`Chromium benchmark failed: ${message}`, category),
      ],
    };
  } finally {
    await Promise.allSettled([browser?.close(), server?.close()]);
  }
}

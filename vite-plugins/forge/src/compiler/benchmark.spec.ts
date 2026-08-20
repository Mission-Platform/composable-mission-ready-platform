import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import prettier from 'prettier';
import { afterAll, describe, expect, it } from 'vitest';

import { forgeReactFramework } from '../../../../forge-plugins/forge-react/src';

import { FORGE_BENCHMARK_CORPUS, type ForgeBenchmarkFixture } from './benchmark-corpus.js';
import {
  compileComponentModule,
  createForgeCompilerService,
  createGenericAst,
  inferSemanticModule,
  optimizeForgeModule,
  parseForgeSource,
  parseFrontendModule,
} from './compile.js';
import { hoistStaticJsx } from './hoist-static.js';

const shouldRunBench = process.env.FORGE_BENCH_RUN === '1';
const implementation = process.env.FORGE_BENCH_IMPLEMENTATION ?? 'typescript';

interface BenchmarkSample {
  readonly operation: string;
  readonly fixture: string;
  readonly size: ForgeBenchmarkFixture['size'];
  readonly cache: 'cold' | 'warm';
  readonly implementation: string;
  readonly iterations: number;
  readonly sourceBytes: number;
  readonly meanMs: number;
  readonly medianMs: number;
  readonly p95Ms: number;
  readonly minMs: number;
  readonly maxMs: number;
  readonly throughputPerSecond: number;
  readonly memoryDeltaBytes?: number;
}

interface BenchmarkReport {
  readonly schemaVersion: 1;
  readonly implementation: string;
  readonly generatedAt: string;
  readonly command: string;
  readonly environment: {
    readonly node: string;
    readonly platform: NodeJS.Platform;
    readonly arch: string;
    readonly cpus: number;
    readonly cpuModel: string;
    readonly memoryBytes: number;
    readonly pid: number;
  };
  readonly methodology: {
    readonly iterations: number;
    readonly warmupIterations: number;
    readonly clock: 'performance.now';
    readonly coldDefinition: string;
    readonly warmDefinition: string;
  };
  readonly corpus: readonly Readonly<Pick<ForgeBenchmarkFixture, 'name' | 'size' | 'fileName' | 'aspects'>>[];
  readonly samples: readonly BenchmarkSample[];
  readonly comparison?: readonly BenchmarkComparison[];
}

interface BenchmarkComparison {
  readonly operation: string;
  readonly fixture: string;
  readonly size: ForgeBenchmarkFixture['size'];
  readonly cache: 'cold' | 'warm';
  readonly baselineMedianMs: number;
  readonly currentMedianMs: number;
  readonly medianChangePercent: number;
  readonly baselineThroughputPerSecond: number;
  readonly currentThroughputPerSecond: number;
  readonly throughputChangePercent: number;
  readonly baselineMemoryDeltaBytes?: number;
  readonly currentMemoryDeltaBytes?: number;
  readonly memoryChangePercent?: number;
}

const iterations = readPositiveInteger('FORGE_BENCH_ITERATIONS', 8);
const warmupIterations = readPositiveInteger('FORGE_BENCH_WARMUP_ITERATIONS', 2);
const results: BenchmarkSample[] = [];

function readPositiveInteger(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function inputFor(fixture: ForgeBenchmarkFixture) {
  return {
    source: fixture.source,
    fileName: fixture.fileName,
    moduleKind: fixture.moduleKind,
    componentName: fixture.componentName,
    optimize: {},
  } as const;
}

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
}

function measure(
  fixture: ForgeBenchmarkFixture,
  operation: string,
  cache: 'cold' | 'warm',
  work: () => void,
  prepare?: () => void,
): void {
  prepare?.();
  for (let index = 0; index < warmupIterations; index += 1) work();
  const durations: number[] = [];
  const before = process.memoryUsage().heapUsed;
  for (let index = 0; index < iterations; index += 1) {
    const start = performance.now();
    work();
    durations.push(performance.now() - start);
  }
  const memoryDeltaBytes = process.memoryUsage().heapUsed - before;
  const totalMs = durations.reduce((sum, duration) => sum + duration, 0);
  results.push({
    operation,
    fixture: fixture.name,
    size: fixture.size,
    cache,
    implementation,
    iterations,
    sourceBytes: Buffer.byteLength(fixture.source),
    meanMs: totalMs / durations.length,
    medianMs: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    minMs: Math.min(...durations),
    maxMs: Math.max(...durations),
    throughputPerSecond: durations.length / (totalMs / 1000),
    memoryDeltaBytes,
  });
}

function benchmarkFixture(fixture: ForgeBenchmarkFixture): void {
  const parsedModule = parseForgeSource(fixture.fileName, fixture.source);
  const input = inputFor(fixture);

  let warmedParsedFrontendModule: ReturnType<typeof parseFrontendModule> | undefined;

  measure(fixture, 'parse-normalize', 'cold', () => {
    const parsed = parseFrontendModule(fixture.fileName, fixture.source, fixture.moduleKind, fixture.componentName);
    createGenericAst(parsed.oxc, fixture.moduleKind, fixture.componentName);
  });
  measure(fixture, 'semantic-inference', 'cold', () => {
    inferSemanticModule(parseForgeSource(fixture.fileName, fixture.source), fixture.moduleKind, fixture.componentName);
  });
  measure(fixture, 'optimization-hoisting', 'cold', () => {
    const optimized = optimizeForgeModule(parseForgeSource(fixture.fileName, fixture.source));
    hoistStaticJsx(optimized);
  });
  measure(fixture, 'full-neutral-compile', 'cold', () => {
    const service = createForgeCompilerService();
    try {
      service.analyze(input);
    } finally {
      service.dispose();
    }
  });
  measure(fixture, 'target-generation', 'cold', () => {
    compileComponentModule(fixture.source, {
      framework: forgeReactFramework(),
      componentName: fixture.componentName,
      fileName: fixture.fileName,
    });
  });

  measure(
    fixture,
    'parse-normalize',
    'warm',
    () => {
      if (!warmedParsedFrontendModule) {
        throw new Error('Warm parse-normalize requested before warm-up parsed the frontend module.');
      }
      createGenericAst(warmedParsedFrontendModule.oxc, fixture.moduleKind, fixture.componentName);
    },
    () => {
      warmedParsedFrontendModule = parseFrontendModule(
        fixture.fileName,
        fixture.source,
        fixture.moduleKind,
        fixture.componentName,
      );
    },
  );
  measure(fixture, 'semantic-inference', 'warm', () => {
    inferSemanticModule(parsedModule, fixture.moduleKind, fixture.componentName);
  });
  measure(fixture, 'optimization-hoisting', 'warm', () => {
    const optimized = optimizeForgeModule(parsedModule);
    hoistStaticJsx(optimized);
  });

  const service = createForgeCompilerService();
  measure(fixture, 'full-neutral-compile', 'warm', () => {
    service.analyze(input);
  });
  measure(fixture, 'target-generation', 'warm', () => {
    service.compile({ input, framework: forgeReactFramework() });
  });
  service.dispose();
}

function reportPath(): string {
  const output = process.env.FORGE_BENCH_OUTPUT;
  if (output) {
    return path.isAbsolute(output) ? output : path.resolve(process.cwd(), output);
  }

  return path.resolve(import.meta.dirname, `../../benchmarks/${implementation}-baseline.json`);
}

function percentageChange(current: number, baseline: number): number {
  return baseline === 0 ? 0 : ((current - baseline) / baseline) * 100;
}

function loadBaseline(): readonly BenchmarkSample[] | undefined {
  if (implementation === 'typescript') return undefined;

  const baselinePath = path.resolve(import.meta.dirname, '../../benchmarks/typescript-baseline.json');
  try {
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as BenchmarkReport;
    return baseline.samples;
  } catch {
    process.stderr.write(`Forge benchmark baseline not found at ${baselinePath}; comparison will be omitted.\n`);
    return undefined;
  }
}

function buildComparison(): readonly BenchmarkComparison[] | undefined {
  const baseline = loadBaseline();
  if (baseline === undefined) return undefined;

  const baselineByKey = new Map(
    baseline.map((sample) => [`${sample.operation}:${sample.fixture}:${sample.cache}`, sample] as const),
  );
  return results.flatMap((sample) => {
    const reference = baselineByKey.get(`${sample.operation}:${sample.fixture}:${sample.cache}`);
    if (reference === undefined) return [];
    const baselineMemory = reference.memoryDeltaBytes;
    const currentMemory = sample.memoryDeltaBytes;
    return [
      {
        operation: sample.operation,
        fixture: sample.fixture,
        size: sample.size,
        cache: sample.cache,
        baselineMedianMs: reference.medianMs,
        currentMedianMs: sample.medianMs,
        medianChangePercent: percentageChange(sample.medianMs, reference.medianMs),
        baselineThroughputPerSecond: reference.throughputPerSecond,
        currentThroughputPerSecond: sample.throughputPerSecond,
        throughputChangePercent: percentageChange(sample.throughputPerSecond, reference.throughputPerSecond),
        baselineMemoryDeltaBytes: baselineMemory,
        currentMemoryDeltaBytes: currentMemory,
        memoryChangePercent:
          baselineMemory !== undefined && currentMemory !== undefined
            ? percentageChange(currentMemory, baselineMemory)
            : undefined,
      },
    ];
  });
}

function writeComparisonSummary(comparison: readonly BenchmarkComparison[] | undefined): void {
  if (comparison === undefined || comparison.length === 0) return;
  const medianChange = comparison.reduce((sum, sample) => sum + sample.medianChangePercent, 0) / comparison.length;
  const throughputChange =
    comparison.reduce((sum, sample) => sum + sample.throughputChangePercent, 0) / comparison.length;
  process.stdout.write(
    `Forge Oxc comparison: median latency ${medianChange.toFixed(2)}%, throughput ${throughputChange.toFixed(2)}% versus TypeScript baseline.\n`,
  );
}

async function writeReport(): Promise<void> {
  const comparison = buildComparison();
  const report: BenchmarkReport = {
    schemaVersion: 1,
    implementation,
    generatedAt: new Date().toISOString(),
    command: process.env.FORGE_BENCH_COMMAND ?? 'pnpm --filter @mission-platform/vite-plugin-forge bench',
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      cpuModel: os.cpus()[0]?.model ?? 'unknown',
      memoryBytes: os.totalmem(),
      pid: process.pid,
    },
    methodology: {
      iterations,
      warmupIterations,
      clock: 'performance.now',
      coldDefinition: 'Create a fresh compiler service or parse tree for every measured iteration.',
      warmDefinition: 'Reuse parsed source or one persistent compiler service across measured iterations.',
    },
    corpus: FORGE_BENCHMARK_CORPUS.map(({ name, size, fileName, aspects }) => ({ name, size, fileName, aspects })),
    samples: results,
    comparison,
  };
  const output = reportPath();
  await mkdir(path.dirname(output), { recursive: true });
  const prettierOptions = await prettier.resolveConfig(output);
  const formatted = await prettier.format(JSON.stringify(report, null, 2), {
    ...prettierOptions,
    filepath: output,
  });
  await writeFile(output, formatted, 'utf8');
  process.stdout.write(`Forge ${implementation} benchmark written to ${output}\n`);
  writeComparisonSummary(comparison);
}

describe('Forge TypeScript benchmark baseline', () => {
  const describeForBench = shouldRunBench ? describe : describe.skip;

  describeForBench('Forge TypeScript benchmark baseline', () => {
    it('records phase and end-to-end timings for the representative corpus', async () => {
      for (const fixture of FORGE_BENCHMARK_CORPUS) benchmarkFixture(fixture);
      expect(results).toHaveLength(FORGE_BENCHMARK_CORPUS.length * 10);
      await writeReport();
    }, 120_000);
  });
});

if (shouldRunBench) {
  afterAll(() => {
    for (const fixture of FORGE_BENCHMARK_CORPUS) {
      if (!results.some((sample) => sample.fixture === fixture.name)) {
        process.stderr.write(`Benchmark fixture did not complete: ${fixture.name}\n`);
      }
    }
  });
}

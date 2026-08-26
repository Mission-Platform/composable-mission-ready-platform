#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { discoverInventory } from '../runtime-validation/inventory.ts';
import {
  pairStorybookIndexes,
  type StorybookIndexMissingPair,
  type StorybookIndexPair,
  type StorybookParityFramework,
} from '../runtime-validation/storybook-index.ts';

import { comparePngFiles } from './diff.ts';
import { runVisualParityCapture } from './ego-script.ts';
import {
  reportHasFailures,
  storyArtifactDirectory,
  writeCaptureDiagnostics,
  writeComparisonDiagnostics,
  writeStoryMetadata,
  writeVisualParityReport,
} from './report.ts';
import { startStorybookServers } from './servers.ts';
import {
  createRendererDefinitions,
  DEFAULT_VISUAL_PARITY_VIEWPORT,
  VISUAL_PARITY_RENDERERS,
  type VisualParityCaptureResult,
  type VisualParityCliOptions,
  type VisualParityComparison,
  type VisualParityRenderer,
  type VisualParityReport,
  type VisualParityResult,
  type StorybookRendererServers,
} from './types.ts';

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_PIXEL_THRESHOLD = 0.1;
const DEFAULT_MAX_MISMATCH_RATIO = 0;
const DEFAULT_WORKERS = 1;
const DEFAULT_OUTPUT_DIRECTORY = '.artifacts/visual-parity';

function compactSelector(value: string): string {
  return value.replaceAll(/[^a-z0-9]+/g, '');
}

function repositoryRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function firstOptionName(args: string[], names: string[]): string {
  return names.find((name) => option(args, name) !== undefined) ?? names[0];
}

function numericOption(args: string[], name: string, fallback: number, min: number, max?: number): number {
  const raw = option(args, name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || (max !== undefined && value > max))
    throw new Error(`${name} must be a number${max === undefined ? ` >= ${min}` : ` between ${min} and ${max}`}.`);
  return value;
}

function positiveIntegerOption(args: string[], name: string, fallback: number): number {
  const value = numericOption(args, name, fallback, 1);
  if (!Number.isInteger(value)) throw new Error(`${name} must be a positive integer.`);
  return value;
}

function parsePorts(args: string[]): Partial<Record<VisualParityRenderer, number>> {
  const ports: Partial<Record<VisualParityRenderer, number>> = {};
  const base = option(args, '--port');
  if (base !== undefined) {
    const value = Number(base);
    if (!Number.isInteger(value) || value < 1 || value > 65_533)
      throw new Error('--port must allow three valid consecutive TCP ports.');
    for (const [index, renderer] of VISUAL_PARITY_RENDERERS.entries()) ports[renderer] = value + index;
  }
  for (const renderer of VISUAL_PARITY_RENDERERS) {
    const value = option(args, `--${renderer}-port`);
    if (value !== undefined) {
      const port = Number(value);
      if (!Number.isInteger(port) || port < 1 || port > 65_535)
        throw new Error(`--${renderer}-port must be a valid TCP port.`);
      ports[renderer] = port;
    }
  }
  const list = option(args, '--ports');
  if (list !== undefined) {
    for (const item of list.split(',')) {
      const [renderer, rawPort] = item.split('=');
      if (!VISUAL_PARITY_RENDERERS.includes(renderer as VisualParityRenderer))
        throw new Error(`Unknown renderer in --ports: ${renderer}`);
      const port = Number(rawPort);
      if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error(`Invalid port in --ports: ${item}`);
      ports[renderer as VisualParityRenderer] = port;
    }
  }
  return ports;
}

export function parseVisualParityArgs(args: string[], root = repositoryRoot()): VisualParityCliOptions {
  const viewport = option(args, '--viewport') ?? 'md';
  const theme = option(args, '--theme') ?? 'light';
  if (viewport !== 'md') throw new Error('Visual parity currently supports only --viewport md.');
  if (theme !== 'light') throw new Error('Visual parity currently supports only --theme light.');
  return {
    repositoryRoot: root,
    packageName: option(args, '--package'),
    storyId: option(args, '--story'),
    maxStories:
      option(args, '--max-stories') === undefined ? undefined : positiveIntegerOption(args, '--max-stories', 1),
    ports: parsePorts(args),
    viewport: DEFAULT_VISUAL_PARITY_VIEWPORT,
    theme: 'light',
    workers: positiveIntegerOption(args, '--workers', DEFAULT_WORKERS),
    timeoutMs: positiveIntegerOption(args, '--timeout-ms', numericOption(args, '--timeout', DEFAULT_TIMEOUT_MS, 1)),
    pixelThreshold: numericOption(
      args,
      firstOptionName(args, ['--pixel-threshold', '--pixel-tolerance']),
      DEFAULT_PIXEL_THRESHOLD,
      0,
      1,
    ),
    maxMismatchRatio: numericOption(
      args,
      firstOptionName(args, ['--diff-threshold', '--max-mismatch-ratio']),
      DEFAULT_MAX_MISMATCH_RATIO,
      0,
      1,
    ),
    outputDirectory: path.resolve(root, DEFAULT_OUTPUT_DIRECTORY),
  };
}

/** Match exact Storybook IDs, documented short selectors, or compact alphanumeric suffixes. */
export function matchesStorySelector(storyId: string, selector?: string): boolean {
  if (!selector) return true;
  if (storyId === selector) return true;
  const id = storyId.toLowerCase();
  const sel = selector.toLowerCase().trim().replaceAll(/\s+/g, '-');
  if (!sel) return true;
  if (id === sel || id.endsWith(sel) || id.endsWith(`--${sel}`)) return true;
  const compactId = compactSelector(id);
  const compactSel = compactSelector(sel);
  return compactSel.length > 0 && (compactId === compactSel || compactId.endsWith(compactSel));
}

export function selectedPairs(
  pairs: StorybookIndexPair[],
  inventory: ReturnType<typeof discoverInventory>,
  options: VisualParityCliOptions,
): StorybookIndexPair[] {
  const selected = pairs.filter((pair) => {
    const story = inventory.stories.find((item) => item.filePath === pair.sourceImport);
    return (
      story !== undefined &&
      (!options.packageName || story.packageName === options.packageName) &&
      matchesStorySelector(pair.storyId, options.storyId)
    );
  });
  return options.maxStories === undefined ? selected : selected.slice(0, options.maxStories);
}

export function selectedMissing(
  missing: StorybookIndexMissingPair[],
  inventory: ReturnType<typeof discoverInventory>,
  options: VisualParityCliOptions,
): StorybookIndexMissingPair[] {
  const selected = missing.filter((pair) => {
    const story = inventory.stories.find((item) => item.filePath === pair.sourceImport);
    return (
      story !== undefined &&
      (!options.packageName || story.packageName === options.packageName) &&
      matchesStorySelector(pair.storyId, options.storyId)
    );
  });
  return options.maxStories === undefined ? selected : selected.slice(0, options.maxStories);
}

function captureByKey(captures: VisualParityCaptureResult[]): Map<string, VisualParityCaptureResult> {
  return new Map(captures.map((capture) => [`${capture.renderer}\u0000${capture.storyId}`, capture]));
}

function captureFailure(capture: VisualParityCaptureResult | undefined): VisualParityComparisonStatus {
  if (capture?.status === 'blocked') return 'blocked';
  return 'runtime-failure';
}

type VisualParityComparisonStatus = VisualParityComparison['status'];

function compareRenderer(
  storyId: string,
  candidate: 'react' | 'vue',
  captures: Map<string, VisualParityCaptureResult>,
  outputDirectory: string,
  options: VisualParityCliOptions,
): VisualParityComparison {
  const baseline = captures.get(`web-component\u0000${storyId}`);
  const candidateCapture = captures.get(`${candidate}\u0000${storyId}`);
  const comparison: VisualParityComparison = {
    baseline: 'web-component',
    candidate,
    status: 'runtime-failure',
    baselineUrl: baseline?.url,
    candidateUrl: candidateCapture?.url,
  };
  if (!baseline || !candidateCapture || baseline.status !== 'pass' || candidateCapture.status !== 'pass') {
    comparison.status = captureFailure(baseline?.status === 'pass' ? candidateCapture : baseline);
    comparison.message =
      [baseline?.message, candidateCapture?.message].filter(Boolean).join('\n') || 'Renderer capture did not complete.';
    return comparison;
  }
  const diffPath = path.join(
    storyArtifactDirectory(outputDirectory, storyId),
    `web-component-to-${candidate}.diff.png`,
  );
  try {
    const diff = comparePngFiles({
      baselinePath: baseline.imagePath as string,
      candidatePath: candidateCapture.imagePath as string,
      diffPath,
      pixelThreshold: options.pixelThreshold,
      maxMismatchRatio: options.maxMismatchRatio,
    });
    comparison.mismatchPixels = diff.mismatchPixels;
    comparison.mismatchRatio = diff.mismatchRatio;
    if (diff.status === 'dimension-mismatch') {
      comparison.status = 'runtime-failure';
      comparison.message = diff.message;
    } else {
      comparison.status = diff.status;
      if (diff.diffPath) {
        comparison.diffImage = diff.diffPath;
        comparison.baselineImage = baseline.imagePath;
        comparison.candidateImage = candidateCapture.imagePath;
      }
    }
  } catch (error) {
    comparison.status = 'runtime-failure';
    comparison.message = error instanceof Error ? error.message : String(error);
  }
  return comparison;
}

function missingResult(pair: StorybookIndexMissingPair, packageName: string): VisualParityResult {
  return {
    storyId: pair.storyId,
    packageName,
    sourceImport: pair.sourceImport,
    comparisons: (['react', 'vue'] as const).map((candidate) => ({
      baseline: 'web-component' as const,
      candidate,
      status: 'missing-pair' as const,
      message: `Missing renderer index entry: ${pair.missingFrameworks.join(', ')}.`,
    })),
  };
}

export async function runVisualParity(options: VisualParityCliOptions): Promise<VisualParityReport> {
  const inventory = discoverInventory(options.repositoryRoot);
  const definitions = createRendererDefinitions({ ports: options.ports });
  let running: StorybookRendererServers | undefined;
  const captures: VisualParityCaptureResult[] = [];
  const results: VisualParityResult[] = [];
  const diagnostics: string[] = [];
  const cleanupErrors: string[] = [];
  try {
    running = await startStorybookServers(options.repositoryRoot, {
      ports: options.ports,
      timeoutMs: options.timeoutMs,
    });
    const pairing = pairStorybookIndexes(options.repositoryRoot, inventory, {
      'web-component': running.servers['web-component'].index,
      react: running.servers.react.index,
      vue: running.servers.vue.index,
    });
    const pairs = selectedPairs(pairing.pairs, inventory, options);
    const missingFromEntries = selectedMissing(pairing.missing, inventory, {
      ...options,
      maxStories: options.maxStories === undefined ? undefined : Math.max(options.maxStories - pairs.length, 0),
    });
    const missingStories = pairing.missingStories
      .filter(
        (story) =>
          (!options.packageName || story.packageName === options.packageName) &&
          matchesStorySelector(story.id, options.storyId),
      )
      .map((story) => ({
        storyId: story.id,
        sourceImport: story.filePath,
        missingFrameworks: ['web-component', 'react', 'vue'] as StorybookParityFramework[],
        entries: {},
      }));
    const missing = [
      ...missingFromEntries,
      ...missingStories.slice(
        0,
        options.maxStories === undefined
          ? undefined
          : Math.max(options.maxStories - pairs.length - missingFromEntries.length, 0),
      ),
    ];
    if (pairs.length === 0 && missing.length === 0)
      diagnostics.push('No neutral Storybook stories matched the requested selectors.');
    for (const pair of pairs) {
      const story = inventory.stories.find((item) => item.filePath === pair.sourceImport);
      if (!story) continue;
      writeStoryMetadata(options.outputDirectory, pair.storyId, {
        storyId: pair.storyId,
        packageName: story.packageName,
        sourceImport: pair.sourceImport,
        entries: pair.entries,
      });
    }
    for (const pair of missing) {
      const story = inventory.stories.find((item) => item.filePath === pair.sourceImport);
      results.push(missingResult(pair, story?.packageName ?? 'unknown'));
      writeStoryMetadata(options.outputDirectory, pair.storyId, {
        storyId: pair.storyId,
        packageName: story?.packageName ?? 'unknown',
        sourceImport: pair.sourceImport,
        entries: pair.entries,
        missingFrameworks: pair.missingFrameworks,
      });
    }
    const requests = pairs.flatMap((pair) =>
      VISUAL_PARITY_RENDERERS.map((renderer) => ({
        storyId: pair.storyId,
        renderer,
        baseUrl: running?.servers[renderer].definition.url as string,
      })),
    );
    const captureRun = await runVisualParityCapture({
      repositoryRoot: options.repositoryRoot,
      artifactDirectory: options.outputDirectory,
      captures: requests,
      viewport: options.viewport,
      theme: options.theme,
      timeoutMs: options.timeoutMs,
      retries: 2,
      workers: options.workers,
      taskName: 'visual parity capture',
    });
    captures.push(...captureRun.results);
    diagnostics.push(...captureRun.diagnostics);
    cleanupErrors.push(...captureRun.cleanupErrors);
    for (const capture of captures) writeCaptureDiagnostics(options.outputDirectory, capture);
    const byKey = captureByKey(captures);
    for (const pair of pairs) {
      const story = inventory.stories.find((item) => item.filePath === pair.sourceImport);
      if (!story) continue;
      const result: VisualParityResult = {
        storyId: pair.storyId,
        packageName: story.packageName,
        sourceImport: pair.sourceImport,
        comparisons: [
          compareRenderer(pair.storyId, 'react', byKey, options.outputDirectory, options),
          compareRenderer(pair.storyId, 'vue', byKey, options.outputDirectory, options),
        ],
      };
      results.push(result);
      for (const comparison of result.comparisons)
        writeComparisonDiagnostics(options.outputDirectory, pair.storyId, comparison);
    }
  } catch (error) {
    diagnostics.push(error instanceof Error ? (error.stack ?? error.message) : String(error));
  } finally {
    if (running) {
      try {
        await running.close();
      } catch (error) {
        cleanupErrors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }
  const report: VisualParityReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: 'pass',
    options,
    renderers: definitions.map((definition) => ({
      framework: definition.framework,
      url: definition.url,
      storybookFramework: definition.environment.STORYBOOK_FRAMEWORK,
      serverLog: path.join(options.outputDirectory, 'servers', `${definition.framework}.log`),
    })),
    results,
    captures,
    diagnostics,
    cleanupErrors,
  };
  report.status = reportHasFailures(report) ? 'fail' : 'pass';
  writeVisualParityReport(options.outputDirectory, report);
  return report;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: pnpm visual:parity -- [--package <name>] [--story <id>] [--max-stories <n>] [--port <base>]');
    console.log(
      '       [--viewport md] [--theme light] [--workers <n>] [--timeout-ms <ms>] [--pixel-threshold <0..1>] [--diff-threshold <0..1>]',
    );
    return;
  }
  const report = await runVisualParity(parseVisualParityArgs(args));
  console.log(
    `Visual parity: ${report.status}; stories=${report.results.length}; artifacts=${report.options.outputDirectory}`,
  );
  if (reportHasFailures(report)) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

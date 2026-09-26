import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { discoverInventory } from '../runtime-validation/inventory.ts';
import {
  pairStorybookIndexes,
  type StorybookIndexMissingPair,
  type StorybookIndexPair,
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
  DEFAULT_VISUAL_PARITY_MISMATCH_THRESHOLD,
  DEFAULT_VISUAL_PARITY_VIEWPORT,
  VISUAL_PARITY_CANDIDATES,
  VISUAL_PARITY_RENDERERS,
  type StorybookRendererServers,
  type VisualParityCandidate,
  type VisualParityCaptureResult,
  type VisualParityCliOptions,
  type VisualParityComparison,
  type VisualParityRenderer,
  type VisualParityReport,
  type VisualParityResult,
} from './types.ts';

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_PIXEL_THRESHOLD = 0.1;
const DEFAULT_MAX_MISMATCH_RATIO = DEFAULT_VISUAL_PARITY_MISMATCH_THRESHOLD;
const DEFAULT_WORKERS = 1;
const DEFAULT_OUTPUT_DIRECTORY = '.artifacts/visual-parity';

/**
 * Normalizes a selector string into lowercase alphanumeric characters.
 */
function compactSelector(value: string): string {
  return value.replaceAll(/[^a-z0-9]+/g, '');
}

/**
 * Computes the absolute path to the repository root directory.
 */
function repositoryRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
}

/**
 * Extracts a named option value from a CLI argument list.
 */
function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

/**
 * Returns the first option name present in the argument list.
 */
function firstOptionName(args: string[], names: string[]): string {
  return names.find((name) => option(args, name) !== undefined) ?? names[0];
}

/**
 * Checks if a numeric value is within bounds.
 */
function isWithinBounds(value: number, min: number, max?: number): boolean {
  if (!Number.isFinite(value) || value < min) return false;
  return max === undefined || value <= max;
}

/**
 * Asserts numeric value is finite and within bounds.
 */
function assertNumericBounds(value: number, name: string, min: number, max?: number): void {
  if (isWithinBounds(value, min, max)) return;
  const range = max === undefined ? ` >= ${min}` : ` between ${min} and ${max}`;
  throw new Error(`${name} must be a number${range}.`);
}

/**
 * Parses a numeric CLI option with validation bounds.
 */
function numericOption(args: string[], name: string, fallback: number, min: number, max?: number): number {
  const raw = option(args, name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  assertNumericBounds(value, name, min, max);
  return value;
}

/**
 * Parses a positive integer CLI option.
 */
function positiveIntegerOption(args: string[], name: string, fallback: number): number {
  const value = numericOption(args, name, fallback, 1);
  if (!Number.isInteger(value)) throw new Error(`${name} must be a positive integer.`);
  return value;
}

/**
 * Parses base port flag for all renderers.
 */
function parseBasePort(args: string[], ports: Partial<Record<VisualParityRenderer, number>>): void {
  const base = option(args, '--port');
  if (base === undefined) return;
  const value = Number(base);
  if (!Number.isInteger(value) || value < 1 || value > 65_531) {
    throw new Error('--port must allow five valid consecutive TCP ports.');
  }
  let index = 0;
  for (const renderer of VISUAL_PARITY_RENDERERS) {
    ports[renderer] = value + index;
    index += 1;
  }
}

/**
 * Parses single port option from CLI flags.
 */
function parsePortOption(args: string[], flag: string): number | undefined {
  const raw = option(args, flag);
  if (raw === undefined) return undefined;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${flag} must be a valid TCP port.`);
  }
  return port;
}

/**
 * Parses individual framework renderer port flags.
 */
function parseIndividualPorts(args: string[], ports: Partial<Record<VisualParityRenderer, number>>): void {
  for (const renderer of VISUAL_PARITY_RENDERERS) {
    const port = parsePortOption(args, `--${renderer}-port`);
    if (port !== undefined) {
      ports[renderer] = port;
    }
  }
}

/**
 * Parses single renderer port mapping item.
 */
function parseSinglePortMapping(item: string): [VisualParityRenderer, number] {
  const [renderer, rawPort] = item.split('=');
  if (!VISUAL_PARITY_RENDERERS.includes(renderer as VisualParityRenderer)) {
    throw new Error(`Unknown renderer in --ports: ${renderer}`);
  }
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid port in --ports: ${item}`);
  }
  return [renderer as VisualParityRenderer, port];
}

/**
 * Parses comma-separated --ports list flag.
 */
function parsePortsList(args: string[], ports: Partial<Record<VisualParityRenderer, number>>): void {
  const list = option(args, '--ports');
  if (list === undefined) return;
  for (const item of list.split(',')) {
    const [renderer, port] = parseSinglePortMapping(item);
    ports[renderer] = port;
  }
}

/**
 * Parses TCP port allocations for framework renderers from CLI flags.
 */
function parsePorts(args: string[]): Partial<Record<VisualParityRenderer, number>> {
  const ports: Partial<Record<VisualParityRenderer, number>> = {};
  parseBasePort(args, ports);
  parseIndividualPorts(args, ports);
  parsePortsList(args, ports);
  return ports;
}

/**
 * Parses target framework candidates from command line arguments.
 *
 * @param args - Command line argument array.
 * @returns Array of validated target candidates or undefined if unconstrained.
 */
function parseTargets(args: string[]): readonly VisualParityCandidate[] | undefined {
  const flag = firstOptionName(args, ['--targets', '--target', '--candidates', '--candidate']);
  const raw = flag ? option(args, flag) : undefined;
  if (raw === undefined) return undefined;
  if (raw === 'all') return VISUAL_PARITY_CANDIDATES;

  return raw.split(',').map((item) => {
    const trimmed = item.trim();
    const matched = VISUAL_PARITY_CANDIDATES.find((candidate) => candidate === trimmed);
    if (!matched) {
      throw new Error(`Unknown target candidate: ${trimmed}. Expected one of: ${VISUAL_PARITY_CANDIDATES.join(', ')}.`);
    }
    return matched;
  });
}

/**
 * Validates viewport and theme CLI parameters.
 */
function assertViewportAndTheme(viewport: string, theme: string): void {
  if (viewport !== 'md') {
    throw new Error('Visual parity currently supports only --viewport md.');
  }
  if (theme !== 'light') {
    throw new Error('Visual parity currently supports only --theme light.');
  }
}

/**
 * Parses command line options for visual parity execution and verification.
 */
export function parseVisualParityArgs(args: string[], root = repositoryRoot()): VisualParityCliOptions {
  const viewport = option(args, '--viewport') ?? 'md';
  const theme = option(args, '--theme') ?? 'light';
  assertViewportAndTheme(viewport, theme);
  return {
    repositoryRoot: root,
    packageName: option(args, '--package'),
    storyId: option(args, '--story'),
    maxStories:
      option(args, '--max-stories') === undefined ? undefined : positiveIntegerOption(args, '--max-stories', 1),
    ports: parsePorts(args),
    targets: parseTargets(args),
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

/**
 * Compares compact normalized forms of story and selector.
 */
function matchesCompactSelector(id: string, sel: string): boolean {
  const compactId = compactSelector(id);
  const compactSel = compactSelector(sel);
  return compactSel.length > 0 && (compactId === compactSel || compactId.endsWith(compactSel));
}

/** Match exact Storybook IDs, documented short selectors, or compact alphanumeric suffixes. */
export function matchesStorySelector(storyId: string, selector?: string): boolean {
  if (!selector || storyId === selector) return true;
  const id = storyId.toLowerCase();
  const sel = selector.toLowerCase().trim().replaceAll(/\s+/g, '-');
  if (!sel || id === sel || id.endsWith(sel) || id.endsWith(`--${sel}`)) return true;
  return matchesCompactSelector(id, sel);
}

/**
 * Filters matched story index pairs matching package name and story selector constraints.
 */
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

/**
 * Filters missing story index pairs matching package name and story selector constraints.
 */
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

/**
 * Creates a lookup map of captures indexed by renderer and story ID.
 */
function captureByKey(captures: VisualParityCaptureResult[]): Map<string, VisualParityCaptureResult> {
  return new Map(captures.map((capture) => [`${capture.renderer}\u0000${capture.storyId}`, capture]));
}

/**
 * Categorizes failure status based on diagnostic readiness.
 */
function captureFailure(capture: VisualParityCaptureResult | undefined): VisualParityComparisonStatus {
  return capture?.status === 'blocked' ? 'blocked' : 'runtime-failure';
}

type VisualParityComparisonStatus = VisualParityComparison['status'];

/**
 * Executes PNG diff comparison and populates result fields.
 */
function executeDiffComparison(
  baseline: VisualParityCaptureResult,
  candidateCapture: VisualParityCaptureResult,
  diffPath: string,
  options: VisualParityCliOptions,
  comparison: VisualParityComparison,
): void {
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
}

/**
 * Checks if both baseline and candidate captures completed successfully.
 */
function hasPassingCaptures(baseline?: VisualParityCaptureResult, candidate?: VisualParityCaptureResult): boolean {
  return Boolean(baseline && candidate && baseline.status === 'pass' && candidate.status === 'pass');
}

/**
 * Formats diagnostic failure messages for failed capture comparison.
 */
function handleFailedComparison(
  baseline: VisualParityCaptureResult | undefined,
  candidateCapture: VisualParityCaptureResult | undefined,
  comparison: VisualParityComparison,
): void {
  comparison.status = captureFailure(baseline?.status === 'pass' ? candidateCapture : baseline);
  comparison.message =
    [baseline?.message, candidateCapture?.message].filter(Boolean).join('\n') || 'Renderer capture did not complete.';
}

/**
 * Compares candidate renderer capture against web-component baseline.
 */
function compareRenderer(
  storyId: string,
  candidate: VisualParityCandidate,
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
  if (!hasPassingCaptures(baseline, candidateCapture)) {
    handleFailedComparison(baseline, candidateCapture, comparison);
    return comparison;
  }
  const diffPath = path.join(
    storyArtifactDirectory(outputDirectory, storyId),
    `web-component-to-${candidate}.diff.png`,
  );
  executeDiffComparison(
    baseline as VisualParityCaptureResult,
    candidateCapture as VisualParityCaptureResult,
    diffPath,
    options,
    comparison,
  );
  return comparison;
}

/**
 * Generates visual parity result record for missing renderer index pairs.
 */
function missingResult(
  pair: StorybookIndexMissingPair,
  packageName: string,
  candidates: readonly VisualParityCandidate[] = VISUAL_PARITY_CANDIDATES,
): VisualParityResult {
  return {
    storyId: pair.storyId,
    packageName,
    sourceImport: pair.sourceImport,
    comparisons: candidates.map((candidate) => ({
      baseline: 'web-component' as const,
      candidate,
      status: 'missing-pair' as const,
      message: `Missing renderer index entry: ${pair.missingFrameworks.join(', ')}.`,
    })),
  };
}

/**
 * Computes paired and missing story entries across running Storybook framework servers.
 *
 * @param inventory - Discovered component stories inventory.
 * @param running - Active Storybook server instances.
 * @param options - Visual parity execution options.
 * @returns Filtered matched pairs and missing pair records.
 */
function computeParityPairs(
  inventory: ReturnType<typeof discoverInventory>,
  running: StorybookRendererServers,
  options: VisualParityCliOptions,
) {
  const pairing = pairStorybookIndexes(options.repositoryRoot, inventory, {
    'web-component': running.servers['web-component'].index,
    react: running.servers.react.index,
    vue: running.servers.vue.index,
    solid: running.servers.solid.index,
    svelte: running.servers.svelte.index,
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
      missingFrameworks: [...VISUAL_PARITY_RENDERERS],
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
  return { pairs, missing };
}

/**
 * Persists story metadata artifacts for valid pairs.
 *
 * @param inventory - Component stories inventory.
 * @param outputDirectory - Artifacts output directory.
 * @param pairs - Discovered story pairs.
 */
function recordPairsMetadata(
  inventory: ReturnType<typeof discoverInventory>,
  outputDirectory: string,
  pairs: StorybookIndexPair[],
): void {
  for (const pair of pairs) {
    const story = inventory.stories.find((item) => item.filePath === pair.sourceImport);
    if (!story) continue;
    writeStoryMetadata(outputDirectory, pair.storyId, {
      storyId: pair.storyId,
      packageName: story.packageName,
      sourceImport: pair.sourceImport,
      entries: pair.entries,
    });
  }
}

/**
 * Persists story metadata artifacts and constructs placeholder result entries for missing pairs.
 *
 * @param inventory - Component stories inventory.
 * @param outputDirectory - Artifacts output directory.
 * @param missing - Stories missing one or more framework targets.
 * @param targetCandidates - Candidates being evaluated.
 * @returns Array of VisualParityResult records for missing stories.
 */
function recordMissingResults(
  inventory: ReturnType<typeof discoverInventory>,
  outputDirectory: string,
  missing: StorybookIndexMissingPair[],
  targetCandidates: readonly VisualParityCandidate[],
): VisualParityResult[] {
  const results: VisualParityResult[] = [];
  for (const pair of missing) {
    const story = inventory.stories.find((item) => item.filePath === pair.sourceImport);
    const packageName = story ? story.packageName : 'unknown';
    results.push(missingResult(pair, packageName, targetCandidates));
    writeStoryMetadata(outputDirectory, pair.storyId, {
      storyId: pair.storyId,
      packageName,
      sourceImport: pair.sourceImport,
      entries: pair.entries,
      missingFrameworks: pair.missingFrameworks,
    });
  }
  return results;
}

/**
 * Persists story metadata artifacts and constructs placeholder result entries for missing pairs.
 *
 * @param inventory - Discovered component stories inventory.
 * @param outputDirectory - Artifacts output directory.
 * @param pairs - Discovered story pairs.
 * @param missing - Stories missing one or more framework targets.
 * @param targetCandidates - Candidates being evaluated.
 * @returns Array of VisualParityResult records for missing stories.
 */
function recordMetadataAndMissingResults(
  inventory: ReturnType<typeof discoverInventory>,
  outputDirectory: string,
  pairs: StorybookIndexPair[],
  missing: StorybookIndexMissingPair[],
  targetCandidates: readonly VisualParityCandidate[],
): VisualParityResult[] {
  recordPairsMetadata(inventory, outputDirectory, pairs);
  return recordMissingResults(inventory, outputDirectory, missing, targetCandidates);
}

/**
 * Evaluates visual differences for captured stories and saves comparison diagnostics.
 *
 * @param pairs - List of paired stories.
 * @param inventory - Component stories inventory.
 * @param byKey - Lookup map of captured screenshots.
 * @param targetCandidates - Framework candidates to compare.
 * @param outputDirectory - Artifacts output directory.
 * @param options - Visual parity execution options.
 * @returns Array of comparison results.
 */
function processCapturedComparisons(
  pairs: StorybookIndexPair[],
  inventory: ReturnType<typeof discoverInventory>,
  byKey: Map<string, VisualParityCaptureResult>,
  targetCandidates: readonly VisualParityCandidate[],
  outputDirectory: string,
  options: VisualParityCliOptions,
): VisualParityResult[] {
  const results: VisualParityResult[] = [];
  for (const pair of pairs) {
    const story = inventory.stories.find((item) => item.filePath === pair.sourceImport);
    if (!story) continue;
    const result: VisualParityResult = {
      storyId: pair.storyId,
      packageName: story.packageName,
      sourceImport: pair.sourceImport,
      comparisons: targetCandidates.map((candidate) =>
        compareRenderer(pair.storyId, candidate, byKey, outputDirectory, options),
      ),
    };
    results.push(result);
    for (const comparison of result.comparisons) {
      writeComparisonDiagnostics(outputDirectory, pair.storyId, comparison);
    }
  }
  return results;
}

/**
 * Context passed to visual parity execution pipeline.
 */
interface ParityExecutionContext {
  readonly inventory: ReturnType<typeof discoverInventory>;
  readonly running: StorybookRendererServers;
  readonly options: VisualParityCliOptions;
  readonly captures: VisualParityCaptureResult[];
  readonly results: VisualParityResult[];
  readonly diagnostics: string[];
  readonly cleanupErrors: string[];
}

/**
 * Builds capture request specifications across all renderers.
 *
 * @param pairs - Paired Storybook stories.
 * @param running - Active Storybook servers.
 * @returns List of capture requests.
 */
function buildCaptureRequests(pairs: StorybookIndexPair[], running: StorybookRendererServers) {
  return pairs.flatMap((pair) =>
    VISUAL_PARITY_RENDERERS.map((renderer) => ({
      storyId: pair.storyId,
      renderer,
      baseUrl: running.servers[renderer].definition.url,
    })),
  );
}

/**
 * Executes the visual parity capture and image diffing pipeline.
 *
 * @param context - Execution context with options and accumulators.
 */
async function executeParityPipeline(context: ParityExecutionContext): Promise<void> {
  const { inventory, running, options, captures, results, diagnostics, cleanupErrors } = context;
  const { pairs, missing } = computeParityPairs(inventory, running, options);
  if (pairs.length === 0 && missing.length === 0) {
    diagnostics.push('No neutral Storybook stories matched the requested selectors.');
  }
  const targetCandidates = options.targets ?? VISUAL_PARITY_CANDIDATES;
  results.push(
    ...recordMetadataAndMissingResults(inventory, options.outputDirectory, pairs, missing, targetCandidates),
  );

  const requests = buildCaptureRequests(pairs, running);
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
  results.push(
    ...processCapturedComparisons(pairs, inventory, byKey, targetCandidates, options.outputDirectory, options),
  );
}

/**
 * Safely shuts down running Storybook server instances and records cleanup failures.
 *
 * @param running - Optional running servers container.
 * @param cleanupErrors - Errors array to record shutdown failures.
 */
async function safelyCloseServers(
  running: StorybookRendererServers | undefined,
  cleanupErrors: string[],
): Promise<void> {
  if (!running) return;
  try {
    await running.close();
  } catch (error) {
    cleanupErrors.push(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Constructs and writes the final visual parity verification report.
 *
 * @param options - CLI options.
 * @param definitions - Renderer definitions.
 * @param results - Comparison results.
 * @param captures - Screenshot capture results.
 * @param diagnostics - Collected diagnostic messages.
 * @param cleanupErrors - Collected cleanup errors.
 * @returns Serialized VisualParityReport object.
 */
function buildVisualParityReport(
  options: VisualParityCliOptions,
  definitions: ReturnType<typeof createRendererDefinitions>,
  results: VisualParityResult[],
  captures: VisualParityCaptureResult[],
  diagnostics: string[],
  cleanupErrors: string[],
): VisualParityReport {
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

/**
 * Runs the end-to-end visual parity verification pipeline across all framework targets.
 *
 * @param options - Execution and threshold options.
 * @returns Complete visual parity report.
 */
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
    await executeParityPipeline({ inventory, running, options, captures, results, diagnostics, cleanupErrors });
  } catch (error) {
    const errorDetails = error instanceof Error ? (error.stack ?? error.message) : String(error);
    diagnostics.push(errorDetails);
  } finally {
    await safelyCloseServers(running, cleanupErrors);
  }

  return buildVisualParityReport(options, definitions, results, captures, diagnostics, cleanupErrors);
}

/**
 * CLI entrypoint executing visual parity test suite from process arguments.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: pnpm visual:parity -- [--package <name>] [--story <id>] [--max-stories <n>] [--port <base>]');
    console.log('       [--solid-port <port>] [--svelte-port <port>] [--targets <react,vue,solid,svelte>]');
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

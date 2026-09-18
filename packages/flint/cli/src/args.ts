/* eslint-disable unicorn/prevent-abbreviations */

import path from 'node:path';

import type {
  FlintLinkMode,
  FlintOptimization,
  FlintVmExecutionMode,
  FlintSoNBoundsChecks,
} from '@mission-platform/flint';

export type FlintCliCommand = 'check' | 'compile' | 'trace' | 'inspect-sonir';

export interface FlintCliTraceOptions {
  readonly capture: 'summary' | 'events' | 'snapshot';
  readonly maxEvents: number;
  readonly maxTraceBytes: number;
  readonly maxSnapshotBytes: number;
}

export interface FlintCliOptions {
  readonly command: FlintCliCommand;
  readonly entries: readonly string[];
  readonly roots: readonly string[];
  readonly projectRoots: readonly string[];
  readonly linkMode?: FlintLinkMode;
  readonly capabilities: readonly string[];
  readonly optimization: FlintOptimization;
  readonly outputDirectory?: string;
  readonly compilerVersion: string;
  readonly vmMode: FlintVmExecutionMode;
  readonly format?: 'text' | 'json';
  readonly boundsChecks: FlintSoNBoundsChecks;
  readonly showOptimizerReport: boolean;
  readonly trace?: FlintCliTraceOptions;
}

export class FlintCliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlintCliUsageError';
  }
}

export const FLINT_CLI_USAGE = `Usage: flint <check|compile|trace|inspect-sonir> <entry.flint|artifact.sonir.json> [options]

Options:
  --entry <file>                  Entry file (alternative to the positional entry)
  --root <directory>              Additional source resolution root (repeatable)
  --project-root <directory>      Project root used for graph identity (repeatable)
  --link-mode <static|dynamic>    Default and cross-project source link mode
  --capability <name>             Requested capability (repeatable or comma-separated)
  --optimization <debug|release>  Optimization mode (default: debug)
  --bounds-checks <policy>       runtime (default), proven-safe, or excluded-by-profile
  --optimizer-report             Include SoN/Wasm optimizer pass metadata in output
  inspect-sonir                  Read and summarize a bounded .sonir.json artifact (no execution)
  -o, --out-dir <directory>       Artifact directory for compile (default: ./dist)
  --compiler-version <version>    Compiler version in deterministic metadata
  --vm-mode <interpret|jit|aot>   Bounded FWS stage execution mode (default: interpret)
  --format <text|json>            Check/compile result format (default: text)
  --trace-capture <summary|events|snapshot>
                                  Bounded forensic capture mode (trace command)
  --max-trace-events <count>      Maximum trace events (default: 512)
  --max-trace-bytes <count>       Maximum serialized trace bytes (default: 65536)
  --max-snapshot-bytes <count>    Maximum memory snapshot bytes (default: 4096)
  -h, --help                      Show this help
`;

function valueFor(argv: readonly string[], index: number, option: string): [string, number] {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('-')) throw new FlintCliUsageError(`Missing value for ${option}.`);
  return [value, index + 1];
}

function splitValues(values: readonly string[]): readonly string[] {
  return [
    ...new Set(
      values.flatMap((value) =>
        value
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean),
      ),
    ),
  ].toSorted();
}

function absolutePaths(values: readonly string[], cwd: string): readonly string[] {
  return values.map((value) => path.resolve(cwd, value));
}

export function parseFlintCliArgs(argv: readonly string[], cwd = process.cwd()): FlintCliOptions {
  let command: FlintCliCommand | undefined;
  let outputDirectory: string | undefined;
  let linkMode: FlintLinkMode | undefined;
  let optimization: FlintOptimization = 'debug';
  let compilerVersion = '0.1.0';
  let vmMode: FlintVmExecutionMode = 'interpret';
  let format: 'text' | 'json' | undefined;
  let boundsChecks: FlintSoNBoundsChecks = 'runtime';
  let showOptimizerReport = false;
  let traceCapture: FlintCliTraceOptions['capture'] = 'events';
  let maxTraceEvents = 512;
  let maxTraceBytes = 65_536;
  let maxSnapshotBytes = 4096;
  let traceRequested = false;
  const entries: string[] = [];
  const roots: string[] = [];
  const projectRoots: string[] = [];
  const capabilities: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    if (argument === '--help' || argument === '-h') throw new FlintCliUsageError(FLINT_CLI_USAGE);
    if (argument === 'check' || argument === 'compile' || argument === 'trace' || argument === 'inspect-sonir') {
      if (command !== undefined) throw new FlintCliUsageError('Only one command may be provided.');
      command = argument;
      continue;
    }
    if (argument === '--entry') {
      const [value, nextIndex] = valueFor(argv, index, argument);
      entries.push(value);
      index = nextIndex;
      continue;
    }
    if (argument === '--root') {
      const [value, nextIndex] = valueFor(argv, index, argument);
      roots.push(value);
      index = nextIndex;
      continue;
    }
    if (argument === '--project-root' || argument === '--project-roots') {
      const [value, nextIndex] = valueFor(argv, index, argument);
      projectRoots.push(
        ...value
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean),
      );
      index = nextIndex;
      continue;
    }
    if (argument === '--link-mode' || argument === '--cross-project-link-mode') {
      const [value, nextIndex] = valueFor(argv, index, argument);
      if (value !== 'static' && value !== 'dynamic') throw new FlintCliUsageError(`Invalid link mode '${value}'.`);
      linkMode = value;
      index = nextIndex;
      continue;
    }
    if (argument === '--capability' || argument === '--capabilities') {
      const [value, nextIndex] = valueFor(argv, index, argument);
      capabilities.push(value);
      index = nextIndex;
      continue;
    }
    if (argument === '--optimization') {
      const [value, nextIndex] = valueFor(argv, index, argument);
      if (value !== 'debug' && value !== 'release') throw new FlintCliUsageError(`Invalid optimization '${value}'.`);
      optimization = value;
      index = nextIndex;
      continue;
    }
    if (argument === '--bounds-checks') {
      const [value, nextIndex] = valueFor(argv, index, argument);
      if (value !== 'runtime' && value !== 'proven-safe' && value !== 'excluded-by-profile')
        throw new FlintCliUsageError(`Invalid bounds-check policy '${value}'.`);
      boundsChecks = value;
      index = nextIndex;
      continue;
    }
    if (argument === '--optimizer-report') {
      showOptimizerReport = true;
      continue;
    }
    if (argument === '--out-dir' || argument === '--output-dir' || argument === '-o') {
      const [value, nextIndex] = valueFor(argv, index, argument);
      outputDirectory = path.resolve(cwd, value);
      index = nextIndex;
      continue;
    }
    if (argument === '--compiler-version') {
      const [value, nextIndex] = valueFor(argv, index, argument);
      compilerVersion = value;
      index = nextIndex;
      continue;
    }
    if (argument === '--vm-mode') {
      const [value, nextIndex] = valueFor(argv, index, argument);
      if (value !== 'interpret' && value !== 'jit' && value !== 'aot')
        throw new FlintCliUsageError(`Invalid VM mode '${value}'.`);
      vmMode = value;
      index = nextIndex;
      continue;
    }
    if (argument === '--format') {
      const [value, nextIndex] = valueFor(argv, index, argument);
      if (value !== 'text' && value !== 'json') throw new FlintCliUsageError(`Invalid output format '${value}'.`);
      format = value;
      index = nextIndex;
      continue;
    }
    if (argument === '--trace-capture') {
      traceRequested = true;
      const [value, nextIndex] = valueFor(argv, index, argument);
      if (value !== 'summary' && value !== 'events' && value !== 'snapshot')
        throw new FlintCliUsageError(`Invalid trace capture mode '${value}'.`);
      traceCapture = value;
      index = nextIndex;
      continue;
    }
    if (argument === '--max-trace-events' || argument === '--max-trace-bytes' || argument === '--max-snapshot-bytes') {
      traceRequested = true;
      const [value, nextIndex] = valueFor(argv, index, argument);
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed) || parsed < 0)
        throw new FlintCliUsageError(`${argument} must be a non-negative integer.`);
      if (argument === '--max-trace-events') maxTraceEvents = parsed;
      if (argument === '--max-trace-bytes') maxTraceBytes = parsed;
      if (argument === '--max-snapshot-bytes') maxSnapshotBytes = parsed;
      index = nextIndex;
      continue;
    }
    if (argument.startsWith('-')) throw new FlintCliUsageError(`Unknown option '${argument}'.`);
    entries.push(argument);
  }

  if (command === undefined)
    throw new FlintCliUsageError('Missing command; expected check, compile, trace, or inspect-sonir.');
  if (entries.length === 0) throw new FlintCliUsageError('Missing entry file.');
  if (entries.length > 1) throw new FlintCliUsageError('Exactly one entry file is supported.');
  if (compilerVersion.length === 0) throw new FlintCliUsageError('Compiler version must not be empty.');

  return {
    command,
    entries: absolutePaths(entries, cwd),
    roots: absolutePaths(roots, cwd),
    projectRoots: absolutePaths(projectRoots, cwd),
    ...(linkMode === undefined ? {} : { linkMode }),
    capabilities: splitValues(capabilities),
    optimization,
    ...(outputDirectory === undefined ? {} : { outputDirectory }),
    compilerVersion,
    vmMode,
    ...(format === undefined ? {} : { format }),
    boundsChecks,
    showOptimizerReport,
    ...(command === 'trace' || traceRequested
      ? { trace: { capture: traceCapture, maxEvents: maxTraceEvents, maxTraceBytes, maxSnapshotBytes } }
      : {}),
  };
}

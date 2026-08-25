/* eslint-disable unicorn/prevent-abbreviations */

import path from 'node:path';

import type {
  ForgeWebScriptLinkMode,
  ForgeWebScriptOptimization,
  ForgeWebScriptVmExecutionMode,
} from '@mission-platform/forge-web-script';
import type { ForgeWebScriptSoNBoundsChecks } from '@mission-platform/forge-web-script';

export type ForgeWebScriptCliCommand = 'check' | 'compile' | 'trace' | 'inspect-sonir';

export interface ForgeWebScriptCliTraceOptions {
  readonly capture: 'summary' | 'events' | 'snapshot';
  readonly maxEvents: number;
  readonly maxTraceBytes: number;
  readonly maxSnapshotBytes: number;
}

export interface ForgeWebScriptCliOptions {
  readonly command: ForgeWebScriptCliCommand;
  readonly entries: readonly string[];
  readonly roots: readonly string[];
  readonly projectRoots: readonly string[];
  readonly linkMode?: ForgeWebScriptLinkMode;
  readonly capabilities: readonly string[];
  readonly optimization: ForgeWebScriptOptimization;
  readonly outputDirectory?: string;
  readonly compilerVersion: string;
  readonly vmMode: ForgeWebScriptVmExecutionMode;
  readonly format?: 'text' | 'json';
  readonly boundsChecks: ForgeWebScriptSoNBoundsChecks;
  readonly showOptimizerReport: boolean;
  readonly trace?: ForgeWebScriptCliTraceOptions;
}

export class ForgeWebScriptCliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForgeWebScriptCliUsageError';
  }
}

export const FORGE_WEB_SCRIPT_CLI_USAGE = `Usage: forge-web-script <check|compile|trace|inspect-sonir> <entry.fws|artifact.sonir.json> [options]

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
  if (value === undefined || value.startsWith('-'))
    throw new ForgeWebScriptCliUsageError(`Missing value for ${option}.`);
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

export function parseForgeWebScriptCliArgs(argv: readonly string[], cwd = process.cwd()): ForgeWebScriptCliOptions {
  let command: ForgeWebScriptCliCommand | undefined;
  let outputDirectory: string | undefined;
  let linkMode: ForgeWebScriptLinkMode | undefined;
  let optimization: ForgeWebScriptOptimization = 'debug';
  let compilerVersion = '0.1.0';
  let vmMode: ForgeWebScriptVmExecutionMode = 'interpret';
  let format: 'text' | 'json' | undefined;
  let boundsChecks: ForgeWebScriptSoNBoundsChecks = 'runtime';
  let showOptimizerReport = false;
  let traceCapture: ForgeWebScriptCliTraceOptions['capture'] = 'events';
  let maxTraceEvents = 512;
  let maxTraceBytes = 65_536;
  let maxSnapshotBytes = 4_096;
  let traceRequested = false;
  const entries: string[] = [];
  const roots: string[] = [];
  const projectRoots: string[] = [];
  const capabilities: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    if (argument === '--help' || argument === '-h') throw new ForgeWebScriptCliUsageError(FORGE_WEB_SCRIPT_CLI_USAGE);
    if (argument === 'check' || argument === 'compile' || argument === 'trace' || argument === 'inspect-sonir') {
      if (command !== undefined) throw new ForgeWebScriptCliUsageError('Only one command may be provided.');
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
      if (value !== 'static' && value !== 'dynamic')
        throw new ForgeWebScriptCliUsageError(`Invalid link mode '${value}'.`);
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
      if (value !== 'debug' && value !== 'release')
        throw new ForgeWebScriptCliUsageError(`Invalid optimization '${value}'.`);
      optimization = value;
      index = nextIndex;
      continue;
    }
    if (argument === '--bounds-checks') {
      const [value, nextIndex] = valueFor(argv, index, argument);
      if (value !== 'runtime' && value !== 'proven-safe' && value !== 'excluded-by-profile')
        throw new ForgeWebScriptCliUsageError(`Invalid bounds-check policy '${value}'.`);
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
        throw new ForgeWebScriptCliUsageError(`Invalid VM mode '${value}'.`);
      vmMode = value;
      index = nextIndex;
      continue;
    }
    if (argument === '--format') {
      const [value, nextIndex] = valueFor(argv, index, argument);
      if (value !== 'text' && value !== 'json')
        throw new ForgeWebScriptCliUsageError(`Invalid output format '${value}'.`);
      format = value;
      index = nextIndex;
      continue;
    }
    if (argument === '--trace-capture') {
      traceRequested = true;
      const [value, nextIndex] = valueFor(argv, index, argument);
      if (value !== 'summary' && value !== 'events' && value !== 'snapshot')
        throw new ForgeWebScriptCliUsageError(`Invalid trace capture mode '${value}'.`);
      traceCapture = value;
      index = nextIndex;
      continue;
    }
    if (argument === '--max-trace-events' || argument === '--max-trace-bytes' || argument === '--max-snapshot-bytes') {
      traceRequested = true;
      const [value, nextIndex] = valueFor(argv, index, argument);
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed) || parsed < 0)
        throw new ForgeWebScriptCliUsageError(`${argument} must be a non-negative integer.`);
      if (argument === '--max-trace-events') maxTraceEvents = parsed;
      if (argument === '--max-trace-bytes') maxTraceBytes = parsed;
      if (argument === '--max-snapshot-bytes') maxSnapshotBytes = parsed;
      index = nextIndex;
      continue;
    }
    if (argument.startsWith('-')) throw new ForgeWebScriptCliUsageError(`Unknown option '${argument}'.`);
    entries.push(argument);
  }

  if (command === undefined)
    throw new ForgeWebScriptCliUsageError('Missing command; expected check, compile, trace, or inspect-sonir.');
  if (entries.length === 0) throw new ForgeWebScriptCliUsageError('Missing entry file.');
  if (entries.length > 1) throw new ForgeWebScriptCliUsageError('Exactly one entry file is supported.');
  if (compilerVersion.length === 0) throw new ForgeWebScriptCliUsageError('Compiler version must not be empty.');

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

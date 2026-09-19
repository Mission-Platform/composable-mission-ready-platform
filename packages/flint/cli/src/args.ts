/* eslint-disable unicorn/prevent-abbreviations */

import path from 'node:path';

import type {
  FlintLinkMode,
  FlintOptimization,
  FlintVmExecutionMode,
  FlintSoNBoundsChecks,
} from '@mission-platform/flint';

/**
 * Supported top-level Flint CLI commands.
 */
export type FlintCliCommand = 'check' | 'compile' | 'trace' | 'inspect-sonir';

/**
 * Options for forensic trace capturing during execution.
 */
export interface FlintCliTraceOptions {
  readonly capture: 'summary' | 'events' | 'snapshot';
  readonly maxEvents: number;
  readonly maxTraceBytes: number;
  readonly maxSnapshotBytes: number;
}

/**
 * Parsed command-line arguments and configuration for the Flint CLI.
 */
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

/**
 * Error thrown when invalid CLI arguments or options are supplied.
 */
export class FlintCliUsageError extends Error {
  /**
   * Initializes a new FlintCliUsageError.
   *
   * @param message Explanatory error message.
   */
  constructor(message: string) {
    super(message);
    this.name = 'FlintCliUsageError';
  }
}

/**
 * Usage help text displayed by the Flint CLI.
 */
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

interface ParseState {
  command?: FlintCliCommand;
  outputDirectory?: string;
  linkMode?: FlintLinkMode;
  optimization: FlintOptimization;
  compilerVersion: string;
  vmMode: FlintVmExecutionMode;
  format?: 'text' | 'json';
  boundsChecks: FlintSoNBoundsChecks;
  showOptimizerReport: boolean;
  traceCapture: FlintCliTraceOptions['capture'];
  maxTraceEvents: number;
  maxTraceBytes: number;
  maxSnapshotBytes: number;
  traceRequested: boolean;
  entries: string[];
  roots: string[];
  projectRoots: string[];
  capabilities: string[];
}

type FlagHandler = (argv: readonly string[], index: number, state: ParseState, cwd: string) => number;

/**
 * Extracts a required value parameter for a given flag from the argv array.
 *
 * @param argv Command-line argument vector.
 * @param index Current option index.
 * @param option Option flag name.
 * @returns Tuple of option value and next index.
 */
function valueFor(argv: readonly string[], index: number, option: string): [string, number] {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('-')) throw new FlintCliUsageError(`Missing value for ${option}.`);
  return [value, index + 1];
}

/**
 * Splits comma-separated strings and produces a sorted, deduplicated array.
 *
 * @param values Array of raw string values.
 * @returns Sorted unique tokens.
 */
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

/**
 * Resolves an array of paths against the specified working directory.
 *
 * @param values Relative or absolute path strings.
 * @param cwd Base working directory.
 * @returns Array of resolved absolute paths.
 */
function absolutePaths(values: readonly string[], cwd: string): readonly string[] {
  return values.map((value) => path.resolve(cwd, value));
}

const COMMAND_SET: ReadonlySet<string> = new Set(['check', 'compile', 'trace', 'inspect-sonir']);

/**
 * Handles project root path options.
 *
 * @param argv Command-line arguments.
 * @param index Current argument index.
 * @param state CLI parsing accumulator.
 * @param option Flag name.
 * @returns Next argument index.
 */
function handleProjectRoot(argv: readonly string[], index: number, state: ParseState, option: string): number {
  const [value, nextIndex] = valueFor(argv, index, option);
  state.projectRoots.push(
    ...value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
  );
  return nextIndex;
}

/**
 * Handles module link mode options.
 *
 * @param argv Command-line arguments.
 * @param index Current argument index.
 * @param state CLI parsing accumulator.
 * @param option Flag name.
 * @returns Next argument index.
 */
function handleLinkMode(argv: readonly string[], index: number, state: ParseState, option: string): number {
  const [value, nextIndex] = valueFor(argv, index, option);
  if (value !== 'static' && value !== 'dynamic') throw new FlintCliUsageError(`Invalid link mode '${value}'.`);
  state.linkMode = value;
  return nextIndex;
}

/**
 * Handles output directory path options.
 *
 * @param argv Command-line arguments.
 * @param index Current argument index.
 * @param state CLI parsing accumulator.
 * @param cwd Current working directory.
 * @param option Flag name.
 * @returns Next argument index.
 */
function handleOutputDir(
  argv: readonly string[],
  index: number,
  state: ParseState,
  cwd: string,
  option: string,
): number {
  const [value, nextIndex] = valueFor(argv, index, option);
  state.outputDirectory = path.resolve(cwd, value);
  return nextIndex;
}

const TRACE_FIELD_MAP: Readonly<Record<string, 'maxTraceEvents' | 'maxTraceBytes' | 'maxSnapshotBytes'>> = {
  '--max-trace-events': 'maxTraceEvents',
  '--max-trace-bytes': 'maxTraceBytes',
  '--max-snapshot-bytes': 'maxSnapshotBytes',
};

/**
 * Handles trace event and byte limit options.
 *
 * @param argv Command-line arguments.
 * @param index Current argument index.
 * @param state CLI parsing accumulator.
 * @param option Flag name.
 * @returns Next argument index.
 */
function handleTraceCount(argv: readonly string[], index: number, state: ParseState, option: string): number {
  state.traceRequested = true;
  const [value, nextIndex] = valueFor(argv, index, option);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0)
    throw new FlintCliUsageError(`${option} must be a non-negative integer.`);
  const field = TRACE_FIELD_MAP[option];
  if (field !== undefined) {
    state[field] = parsed;
  }
  return nextIndex;
}

const FLAG_HANDLERS: Readonly<Record<string, FlagHandler>> = {
  '--help': () => {
    throw new FlintCliUsageError(FLINT_CLI_USAGE);
  },
  '-h': () => {
    throw new FlintCliUsageError(FLINT_CLI_USAGE);
  },
  '--entry': (argv, index, state) => {
    const [value, nextIndex] = valueFor(argv, index, '--entry');
    state.entries.push(value);
    return nextIndex;
  },
  '--root': (argv, index, state) => {
    const [value, nextIndex] = valueFor(argv, index, '--root');
    state.roots.push(value);
    return nextIndex;
  },
  '--project-root': (argv, index, state) => handleProjectRoot(argv, index, state, '--project-root'),
  '--project-roots': (argv, index, state) => handleProjectRoot(argv, index, state, '--project-roots'),
  '--link-mode': (argv, index, state) => handleLinkMode(argv, index, state, '--link-mode'),
  '--cross-project-link-mode': (argv, index, state) => handleLinkMode(argv, index, state, '--cross-project-link-mode'),
  '--capability': (argv, index, state) => {
    const [value, nextIndex] = valueFor(argv, index, '--capability');
    state.capabilities.push(value);
    return nextIndex;
  },
  '--capabilities': (argv, index, state) => {
    const [value, nextIndex] = valueFor(argv, index, '--capabilities');
    state.capabilities.push(value);
    return nextIndex;
  },
  '--optimization': (argv, index, state) => {
    const [value, nextIndex] = valueFor(argv, index, '--optimization');
    if (value !== 'debug' && value !== 'release') throw new FlintCliUsageError(`Invalid optimization '${value}'.`);
    state.optimization = value;
    return nextIndex;
  },
  '--bounds-checks': (argv, index, state) => {
    const [value, nextIndex] = valueFor(argv, index, '--bounds-checks');
    if (value !== 'runtime' && value !== 'proven-safe' && value !== 'excluded-by-profile')
      throw new FlintCliUsageError(`Invalid bounds-check policy '${value}'.`);
    state.boundsChecks = value;
    return nextIndex;
  },
  '--optimizer-report': (_argv, index, state) => {
    state.showOptimizerReport = true;
    return index;
  },
  '--out-dir': (argv, index, state, cwd) => handleOutputDir(argv, index, state, cwd, '--out-dir'),
  '--output-dir': (argv, index, state, cwd) => handleOutputDir(argv, index, state, cwd, '--output-dir'),
  '-o': (argv, index, state, cwd) => handleOutputDir(argv, index, state, cwd, '-o'),
  '--compiler-version': (argv, index, state) => {
    const [value, nextIndex] = valueFor(argv, index, '--compiler-version');
    state.compilerVersion = value;
    return nextIndex;
  },
  '--vm-mode': (argv, index, state) => {
    const [value, nextIndex] = valueFor(argv, index, '--vm-mode');
    if (value !== 'interpret' && value !== 'jit' && value !== 'aot')
      throw new FlintCliUsageError(`Invalid VM mode '${value}'.`);
    state.vmMode = value;
    return nextIndex;
  },
  '--format': (argv, index, state) => {
    const [value, nextIndex] = valueFor(argv, index, '--format');
    if (value !== 'text' && value !== 'json') throw new FlintCliUsageError(`Invalid output format '${value}'.`);
    state.format = value;
    return nextIndex;
  },
  '--trace-capture': (argv, index, state) => {
    state.traceRequested = true;
    const [value, nextIndex] = valueFor(argv, index, '--trace-capture');
    if (value !== 'summary' && value !== 'events' && value !== 'snapshot')
      throw new FlintCliUsageError(`Invalid trace capture mode '${value}'.`);
    state.traceCapture = value;
    return nextIndex;
  },
  '--max-trace-events': (argv, index, state) => handleTraceCount(argv, index, state, '--max-trace-events'),
  '--max-trace-bytes': (argv, index, state) => handleTraceCount(argv, index, state, '--max-trace-bytes'),
  '--max-snapshot-bytes': (argv, index, state) => handleTraceCount(argv, index, state, '--max-snapshot-bytes'),
};

/**
 * Validates invariant requirements on the parsed CLI state accumulator.
 *
 * @param state Intermediate parsing state.
 */
function validateParsedState(state: ParseState): void {
  if (state.command === undefined)
    throw new FlintCliUsageError('Missing command; expected check, compile, trace, or inspect-sonir.');
  if (state.entries.length === 0) throw new FlintCliUsageError('Missing entry file.');
  if (state.entries.length > 1) throw new FlintCliUsageError('Exactly one entry file is supported.');
  if (state.compilerVersion.length === 0) throw new FlintCliUsageError('Compiler version must not be empty.');
}

/**
 * Assembles the final immutable FlintCliOptions from validated parse state.
 *
 * @param state Intermediate parsing state.
 * @param cwd Current working directory.
 * @returns Fully populated options structure.
 */
function buildCliOptions(state: ParseState, cwd: string): FlintCliOptions {
  const options: FlintCliOptions = {
    command: state.command as FlintCliCommand,
    entries: absolutePaths(state.entries, cwd),
    roots: absolutePaths(state.roots, cwd),
    projectRoots: absolutePaths(state.projectRoots, cwd),
    capabilities: splitValues(state.capabilities),
    optimization: state.optimization,
    compilerVersion: state.compilerVersion,
    vmMode: state.vmMode,
    boundsChecks: state.boundsChecks,
    showOptimizerReport: state.showOptimizerReport,
  };
  if (state.linkMode !== undefined) options.linkMode = state.linkMode;
  if (state.outputDirectory !== undefined) options.outputDirectory = state.outputDirectory;
  if (state.format !== undefined) options.format = state.format;
  if (state.command === 'trace' || state.traceRequested) {
    options.trace = {
      capture: state.traceCapture,
      maxEvents: state.maxTraceEvents,
      maxTraceBytes: state.maxTraceBytes,
      maxSnapshotBytes: state.maxSnapshotBytes,
    };
  }
  return options;
}

/**
 * Parses and validates raw command-line arguments for the Flint CLI.
 *
 * @param argv Command-line arguments slice.
 * @param cwd Current working directory.
 * @returns Fully validated FlintCliOptions structure.
 */
export function parseFlintCliArgs(argv: readonly string[], cwd = process.cwd()): FlintCliOptions {
  const state: ParseState = {
    optimization: 'debug',
    compilerVersion: '0.1.0',
    vmMode: 'interpret',
    boundsChecks: 'runtime',
    showOptimizerReport: false,
    traceCapture: 'events',
    maxTraceEvents: 512,
    maxTraceBytes: 65_536,
    maxSnapshotBytes: 4096,
    traceRequested: false,
    entries: [],
    roots: [],
    projectRoots: [],
    capabilities: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    if (COMMAND_SET.has(argument)) {
      if (state.command !== undefined) throw new FlintCliUsageError('Only one command may be provided.');
      state.command = argument as FlintCliCommand;
      continue;
    }
    const handler = FLAG_HANDLERS[argument];
    if (handler !== undefined) {
      index = handler(argv, index, state, cwd);
      continue;
    }
    if (argument.startsWith('-')) throw new FlintCliUsageError(`Unknown option '${argument}'.`);
    state.entries.push(argument);
  }

  validateParsedState(state);
  return buildCliOptions(state, cwd);
}

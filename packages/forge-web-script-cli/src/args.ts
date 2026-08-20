/* eslint-disable unicorn/prevent-abbreviations */

import path from 'node:path';

import type {
  ForgeWebScriptLinkMode,
  ForgeWebScriptOptimization,
  ForgeWebScriptVmExecutionMode,
} from '@mission-platform/forge-web-script';

export type ForgeWebScriptCliCommand = 'check' | 'compile';

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
}

export class ForgeWebScriptCliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForgeWebScriptCliUsageError';
  }
}

export const FORGE_WEB_SCRIPT_CLI_USAGE = `Usage: forge-web-script <check|compile> <entry.fws> [options]

Options:
  --entry <file>                  Entry file (alternative to the positional entry)
  --root <directory>              Additional source resolution root (repeatable)
  --project-root <directory>      Project root used for graph identity (repeatable)
  --link-mode <static|dynamic>    Default and cross-project source link mode
  --capability <name>             Requested capability (repeatable or comma-separated)
  --optimization <debug|release>  Optimization mode (default: debug)
  -o, --out-dir <directory>       Artifact directory for compile (default: ./dist)
  --compiler-version <version>    Compiler version in deterministic metadata
  --vm-mode <interpret|jit|aot>   Bounded FWS stage execution mode (default: interpret)
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
  const entries: string[] = [];
  const roots: string[] = [];
  const projectRoots: string[] = [];
  const capabilities: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    if (argument === '--help' || argument === '-h') throw new ForgeWebScriptCliUsageError(FORGE_WEB_SCRIPT_CLI_USAGE);
    if (argument === 'check' || argument === 'compile') {
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
    if (argument.startsWith('-')) throw new ForgeWebScriptCliUsageError(`Unknown option '${argument}'.`);
    entries.push(argument);
  }

  if (command === undefined) throw new ForgeWebScriptCliUsageError('Missing command; expected check or compile.');
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
  };
}

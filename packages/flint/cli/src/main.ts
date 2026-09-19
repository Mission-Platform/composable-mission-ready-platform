import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createDiagnostic,
  createFlintCompilerService,
  diagnosticKey,
  deserializeFlintSoN,
  resolveFlintModuleGraph,
  type FlintDiagnostic,
  type FlintLinkConfiguration,
  type FlintModuleResolver,
} from '@mission-platform/flint';
import { runFlintSelfHostedLexStage, type FlintTraceReport } from '@mission-platform/flint-runtime';

import {
  FLINT_CLI_USAGE,
  FlintCliUsageError,
  // The short `Args` suffix is part of the documented CLI module name.
  // eslint-disable-next-line unicorn/prevent-abbreviations
  parseFlintCliArgs,
  type FlintCliOptions,
} from './args.js';
import { formatFlintDiagnostics, formatFlintSoNSummary, outputDirectoryFor, writeFlintArtifacts } from './output.js';

/**
 * Exit code indicating invalid command-line usage or arguments.
 */
export const FLINT_CLI_USAGE_EXIT_CODE = 2;

/**
 * Exit code indicating compilation, verification, or emission errors.
 */
export const FLINT_CLI_COMPILATION_EXIT_CODE = 1;

/**
 * Pluggable IO interface for Flint CLI stdout and stderr logging.
 */
export interface FlintCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

const defaultIo: FlintCliIo = {
  stdout: (message) => process.stdout.write(`${message}\n`),
  stderr: (message) => process.stderr.write(`${message}\n`),
};

/**
 * Generates candidate file paths for module resolution.
 *
 * @param source Requested module specifier.
 * @param importer File path of importing module.
 * @param roots Configured search roots.
 * @returns Array of candidate absolute or relative file paths.
 */
function sourceCandidates(source: string, importer: string, roots: readonly string[]): readonly string[] {
  const values = path.isAbsolute(source)
    ? [source]
    : [path.join(path.dirname(importer), source), ...roots.map((root) => path.join(root, source))];
  return [...new Set(values.flatMap((value) => [value, value.endsWith('.flint') ? value : `${value}.flint`]))];
}

/**
 * Checks whether a candidate path exists on disk.
 *
 * @param fileName Path to verify.
 * @returns File path if accessible, or undefined.
 */
async function existingFile(fileName: string): Promise<string | undefined> {
  try {
    await access(fileName);
    return fileName;
  } catch {
    return undefined;
  }
}

/**
 * Creates a module resolver for source resolution across specified search roots.
 *
 * @param roots Configured directory search roots.
 * @returns Configured FlintModuleResolver instance.
 */
function createFileResolver(roots: readonly string[]): FlintModuleResolver {
  return {
    async resolve(source, importer): Promise<string | undefined> {
      for (const candidate of sourceCandidates(source, importer, roots)) {
        const fileName = await existingFile(candidate);
        if (fileName !== undefined) return fileName;
      }
      return undefined;
    },
    load: (fileName) => readFile(fileName, 'utf8'),
  };
}

/**
 * Constructs a diagnostic representing a CLI or file graph resolution failure.
 *
 * @param fileName Source file name.
 * @param message Diagnostic description.
 * @returns Constructed FlintDiagnostic.
 */
function cliDiagnostic(fileName: string, message: string): FlintDiagnostic {
  return createDiagnostic(fileName, 'graph', 'FLINT-CLI-001', message, {
    start: 0,
    end: 0,
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 1,
  });
}

/**
 * Deduplicates diagnostics based on their stable diagnostic key.
 *
 * @param diagnostics Array of raw diagnostics.
 * @returns Deduplicated diagnostic array.
 */
function uniqueDiagnostics(diagnostics: readonly FlintDiagnostic[]): readonly FlintDiagnostic[] {
  return [...new Map(diagnostics.map((diagnostic) => [diagnosticKey(diagnostic), diagnostic])).values()];
}

/**
 * Produces link configuration options based on CLI settings.
 *
 * @param options Parsed CLI options.
 * @param projectRoots Resolved project roots.
 * @returns FlintLinkConfiguration structure.
 */
function linkConfigurationFor(options: FlintCliOptions, projectRoots: readonly string[]): FlintLinkConfiguration {
  return {
    projectRoots,
    ...(options.linkMode === undefined
      ? {}
      : { defaultLinkMode: options.linkMode, crossProjectLinkMode: options.linkMode }),
  };
}

/**
 * Resolves the source graph and compiles artifacts according to CLI options.
 *
 * @param options Parsed CLI options.
 * @returns Compiled artifact, diagnostics, and optional trace report.
 */
async function compileOptions(options: FlintCliOptions): Promise<{
  readonly entryFileName: string;
  readonly artifact: Awaited<ReturnType<ReturnType<typeof createFlintCompilerService>['compileGraph']>>;
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly trace?: FlintTraceReport;
}> {
  const entryFileName = options.entries[0];
  if (entryFileName === undefined) throw new FlintCliUsageError('Missing entry file.');
  const sourceRoots = [...new Set([...options.roots, path.dirname(entryFileName), ...options.projectRoots])];
  const projectRoots = [
    ...new Set(options.projectRoots.length === 0 ? [path.dirname(entryFileName)] : options.projectRoots),
  ];
  const graph = await resolveFlintModuleGraph(
    [entryFileName],
    createFileResolver(sourceRoots),
    linkConfigurationFor(options, projectRoots),
  );
  let trace: FlintTraceReport | undefined;
  const service = createFlintCompilerService({
    selfHostedRunner: (input, mode) => {
      const report = runFlintSelfHostedLexStage(input, mode, { trace: options.trace });
      trace = (report as typeof report & { readonly trace?: FlintTraceReport }).trace;
      return report;
    },
    selfHostedVmMode: options.vmMode,
  });
  try {
    const artifact = service.compileGraph({
      graph: graph.graph,
      entryFileName,
      compilerVersion: options.compilerVersion,
      optimization: options.optimization,
      requestedCapabilities: options.capabilities,
      boundsChecks: options.boundsChecks,
      linkConfiguration: linkConfigurationFor(options, projectRoots),
    });
    return {
      entryFileName,
      artifact,
      diagnostics: uniqueDiagnostics([...graph.diagnostics, ...artifact.diagnostics]),
      trace,
    };
  } finally {
    service.dispose();
  }
}

/**
 * Executes the `inspect-sonir` command for bounded Sea-of-Nodes inspection.
 *
 * @param options Parsed CLI options.
 * @param io CLI I/O interface.
 * @param cwd Current working directory.
 * @returns Exit code.
 */
async function executeInspectSonIrCommand(options: FlintCliOptions, io: FlintCliIo, cwd: string): Promise<number> {
  const artifactFileName = options.entries[0];
  if (artifactFileName === undefined) return FLINT_CLI_USAGE_EXIT_CODE;
  const relative = path.relative(cwd, artifactFileName);
  if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    io.stderr('SoN inspection path must remain under the current working directory.');
    return FLINT_CLI_COMPILATION_EXIT_CODE;
  }
  try {
    const sonIr = deserializeFlintSoN(await readFile(artifactFileName, 'utf8'));
    if (sonIr === undefined) throw new Error('Invalid, stale, or oversized SoN artifact.');
    const summary = formatFlintSoNSummary(sonIr);
    io.stdout(options.format === 'json' ? JSON.stringify(summary.json) : summary.text);
    return 0;
  } catch (error: unknown) {
    io.stderr(`Unable to inspect SoN artifact: ${error instanceof Error ? error.message : String(error)}`);
    return FLINT_CLI_COMPILATION_EXIT_CODE;
  }
}

/**
 * Formats and prints compilation results in JSON format.
 *
 * @param options Parsed CLI options.
 * @param result Compiled options result.
 * @param io CLI I/O interface.
 */
function emitJsonResult(
  options: FlintCliOptions,
  result: Awaited<ReturnType<typeof compileOptions>>,
  io: FlintCliIo,
): void {
  const payload: Record<string, unknown> = {
    entryFileName: result.entryFileName,
    diagnostics: result.diagnostics,
    verification: result.artifact.artifactVerification,
    verified: result.artifact.artifactVerification?.verified === true,
    wasmEmitted: result.artifact.wasm !== undefined,
    boundsChecks: result.artifact.manifest?.boundsChecks ?? options.boundsChecks,
  };
  if (options.showOptimizerReport) payload.optimizerReport = result.artifact.optimizationReport;
  if (options.command === 'trace') payload.trace = result.trace;
  io.stdout(JSON.stringify(payload));
}

/**
 * Formats and prints compilation diagnostics and summary information.
 *
 * @param options Parsed CLI options.
 * @param result Compiled options result.
 * @param io CLI I/O interface.
 */
function emitCompilationResult(
  options: FlintCliOptions,
  result: Awaited<ReturnType<typeof compileOptions>>,
  io: FlintCliIo,
): void {
  if (options.format === 'json') {
    emitJsonResult(options, result, io);
  } else if (result.diagnostics.length > 0) {
    io.stderr(formatFlintDiagnostics(result.diagnostics));
  }
}

/**
 * Handles the `check` command output formatting.
 *
 * @param options Parsed CLI options.
 * @param result Compiled options result.
 * @param io CLI I/O interface.
 * @returns Exit code 0.
 */
function handleCheckCommand(
  options: FlintCliOptions,
  result: Awaited<ReturnType<typeof compileOptions>>,
  io: FlintCliIo,
): number {
  if (options.format === 'json') return 0;
  io.stdout(`Checked ${result.entryFileName}.`);
  if (options.showOptimizerReport || options.boundsChecks !== 'runtime')
    io.stdout(`Bounds checks: ${options.boundsChecks}.`);
  if (options.showOptimizerReport) io.stdout(JSON.stringify(result.artifact.optimizationReport ?? {}));
  return 0;
}

/**
 * Handles the `trace` command output formatting.
 *
 * @param options Parsed CLI options.
 * @param result Compiled options result.
 * @param io CLI I/O interface.
 * @returns Exit code 0.
 */
function handleTraceCommand(
  options: FlintCliOptions,
  result: Awaited<ReturnType<typeof compileOptions>>,
  io: FlintCliIo,
): number {
  if (options.format !== 'json') {
    io.stdout(`Trace captured for ${result.entryFileName}: ${result.trace?.traceHash ?? 'unavailable'}.`);
  }
  return 0;
}

/**
 * Writes compiled WebAssembly and metadata artifacts to disk.
 *
 * @param options Parsed CLI options.
 * @param result Compiled options result.
 * @param io CLI I/O interface.
 * @param cwd Current working directory.
 * @returns Exit code.
 */
async function handleCompileCommand(
  options: FlintCliOptions,
  result: Awaited<ReturnType<typeof compileOptions>>,
  io: FlintCliIo,
  cwd: string,
): Promise<number> {
  const outputDirectory = outputDirectoryFor(
    result.entryFileName,
    options.outputDirectory ?? path.resolve(cwd, 'dist'),
  );
  try {
    const outputFiles = await writeFlintArtifacts(outputDirectory, result.entryFileName, result.artifact);
    if (options.format === 'json') {
      io.stdout(
        JSON.stringify({
          entryFileName: result.entryFileName,
          outputDirectory,
          outputFiles,
          boundsChecks: result.artifact.manifest?.boundsChecks ?? options.boundsChecks,
          ...(options.showOptimizerReport ? { optimizerReport: result.artifact.optimizationReport } : {}),
        }),
      );
    } else {
      io.stdout(`Compiled ${result.entryFileName} to ${outputDirectory}: ${outputFiles.join(', ')}.`);
    }
    return 0;
  } catch (error: unknown) {
    io.stderr(`Unable to write Flint artifacts: ${error instanceof Error ? error.message : String(error)}`);
    return FLINT_CLI_COMPILATION_EXIT_CODE;
  }
}

/**
 * Dispatches the post-compilation command handler based on selected CLI command.
 *
 * @param options Parsed CLI options.
 * @param result Compiled options result.
 * @param io CLI I/O interface.
 * @param cwd Current working directory.
 * @returns Numeric exit code or promise resolving to exit code.
 */
function dispatchCompiledCommand(
  options: FlintCliOptions,
  result: Awaited<ReturnType<typeof compileOptions>>,
  io: FlintCliIo,
  cwd: string,
): Promise<number> | number {
  if (options.command === 'check') {
    return handleCheckCommand(options, result, io);
  }
  if (options.command === 'trace') {
    return handleTraceCommand(options, result, io);
  }
  return handleCompileCommand(options, result, io, cwd);
}

/**
 * Executes the Flint CLI with given argument vector.
 *
 * @param argv Command-line arguments slice.
 * @param io Pluggable I/O interface.
 * @param cwd Base working directory.
 * @returns Promise resolving to the numeric process exit code.
 */
export async function runFlintCli(
  argv: readonly string[] = process.argv.slice(2),
  io: FlintCliIo = defaultIo,
  cwd = process.cwd(),
): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    io.stdout(FLINT_CLI_USAGE.trimEnd());
    return 0;
  }
  let options: FlintCliOptions;
  try {
    options = parseFlintCliArgs(argv, cwd);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(message);
    if (error instanceof FlintCliUsageError && message !== FLINT_CLI_USAGE) io.stderr(FLINT_CLI_USAGE.trimEnd());
    return FLINT_CLI_USAGE_EXIT_CODE;
  }

  if (options.command === 'inspect-sonir') {
    return executeInspectSonIrCommand(options, io, cwd);
  }

  let result: Awaited<ReturnType<typeof compileOptions>>;
  try {
    result = await compileOptions(options);
  } catch (error: unknown) {
    const entryFileName = options.entries[0] ?? '<entry>';
    const diagnostic = cliDiagnostic(
      entryFileName,
      `Unable to load source graph: ${error instanceof Error ? error.message : String(error)}`,
    );
    io.stderr(formatFlintDiagnostics([diagnostic]));
    return FLINT_CLI_COMPILATION_EXIT_CODE;
  }

  emitCompilationResult(options, result, io);

  const hasErrors = result.diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  if (hasErrors || result.artifact.wasm === undefined || result.artifact.manifest === undefined)
    return FLINT_CLI_COMPILATION_EXIT_CODE;

  return dispatchCompiledCommand(options, result, io, cwd);
}

/**
 * Detects whether the current script is being executed directly via node CLI.
 *
 * @returns True if running as a direct script.
 */
function isDirectExecution(): boolean {
  if (process.argv[1] === undefined) return false;
  try {
    const entryPath = path.resolve(process.argv[1]);
    const modulePath = fileURLToPath(import.meta.url);
    return (
      entryPath === modulePath ||
      (path.basename(entryPath) === 'main.js' && path.dirname(entryPath) === path.dirname(modulePath))
    );
  } catch {
    return false;
  }
}

if (isDirectExecution()) process.exitCode = await runFlintCli();

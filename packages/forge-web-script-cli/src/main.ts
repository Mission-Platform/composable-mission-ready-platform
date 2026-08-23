#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createDiagnostic,
  createForgeWebScriptCompilerService,
  diagnosticKey,
  resolveForgeWebScriptModuleGraph,
  type ForgeWebScriptDiagnostic,
  type ForgeWebScriptLinkConfiguration,
  type ForgeWebScriptModuleResolver,
} from '@mission-platform/forge-web-script';
import {
  runForgeWebScriptSelfHostedLexStage,
  type ForgeWebScriptTraceReport,
} from '@mission-platform/forge-web-script-runtime';

import {
  FORGE_WEB_SCRIPT_CLI_USAGE,
  ForgeWebScriptCliUsageError,
  // The short `Args` suffix is part of the documented CLI module name.
  // eslint-disable-next-line unicorn/prevent-abbreviations
  parseForgeWebScriptCliArgs,
  type ForgeWebScriptCliOptions,
} from './args.js';
import { formatForgeWebScriptDiagnostics, outputDirectoryFor, writeForgeWebScriptArtifacts } from './output.js';

export const FORGE_WEB_SCRIPT_CLI_USAGE_EXIT_CODE = 2;
export const FORGE_WEB_SCRIPT_CLI_COMPILATION_EXIT_CODE = 1;

export interface ForgeWebScriptCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

const defaultIo: ForgeWebScriptCliIo = {
  stdout: (message) => process.stdout.write(`${message}\n`),
  stderr: (message) => process.stderr.write(`${message}\n`),
};

function sourceCandidates(source: string, importer: string, roots: readonly string[]): readonly string[] {
  const values = path.isAbsolute(source)
    ? [source]
    : [path.join(path.dirname(importer), source), ...roots.map((root) => path.join(root, source))];
  return [...new Set(values.flatMap((value) => [value, value.endsWith('.fws') ? value : `${value}.fws`]))];
}

async function existingFile(fileName: string): Promise<string | undefined> {
  try {
    await access(fileName);
    return fileName;
  } catch {
    return undefined;
  }
}

function createFileResolver(roots: readonly string[]): ForgeWebScriptModuleResolver {
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

function cliDiagnostic(fileName: string, message: string): ForgeWebScriptDiagnostic {
  return createDiagnostic(fileName, 'graph', 'FWS-CLI-001', message, {
    start: 0,
    end: 0,
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 1,
  });
}

function uniqueDiagnostics(diagnostics: readonly ForgeWebScriptDiagnostic[]): readonly ForgeWebScriptDiagnostic[] {
  return [...new Map(diagnostics.map((diagnostic) => [diagnosticKey(diagnostic), diagnostic])).values()];
}

function linkConfigurationFor(
  options: ForgeWebScriptCliOptions,
  projectRoots: readonly string[],
): ForgeWebScriptLinkConfiguration {
  return {
    projectRoots,
    ...(options.linkMode === undefined
      ? {}
      : { defaultLinkMode: options.linkMode, crossProjectLinkMode: options.linkMode }),
  };
}

async function compileOptions(options: ForgeWebScriptCliOptions): Promise<{
  readonly entryFileName: string;
  readonly artifact: Awaited<ReturnType<ReturnType<typeof createForgeWebScriptCompilerService>['compileGraph']>>;
  readonly diagnostics: readonly ForgeWebScriptDiagnostic[];
  readonly trace?: ForgeWebScriptTraceReport;
}> {
  const entryFileName = options.entries[0];
  if (entryFileName === undefined) throw new ForgeWebScriptCliUsageError('Missing entry file.');
  const sourceRoots = [...new Set([...options.roots, path.dirname(entryFileName), ...options.projectRoots])];
  const projectRoots = [
    ...new Set(options.projectRoots.length === 0 ? [path.dirname(entryFileName)] : options.projectRoots),
  ];
  const graph = await resolveForgeWebScriptModuleGraph(
    [entryFileName],
    createFileResolver(sourceRoots),
    linkConfigurationFor(options, projectRoots),
  );
  let trace: ForgeWebScriptTraceReport | undefined;
  const service = createForgeWebScriptCompilerService({
    selfHostedRunner: (input, mode) => {
      const report = runForgeWebScriptSelfHostedLexStage(input, mode, { trace: options.trace });
      trace = (report as typeof report & { readonly trace?: ForgeWebScriptTraceReport }).trace;
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

export async function runForgeWebScriptCli(
  argv: readonly string[] = process.argv.slice(2),
  io: ForgeWebScriptCliIo = defaultIo,
  cwd = process.cwd(),
): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    io.stdout(FORGE_WEB_SCRIPT_CLI_USAGE.trimEnd());
    return 0;
  }
  let options: ForgeWebScriptCliOptions;
  try {
    options = parseForgeWebScriptCliArgs(argv, cwd);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(message);
    if (error instanceof ForgeWebScriptCliUsageError && message !== FORGE_WEB_SCRIPT_CLI_USAGE)
      io.stderr(FORGE_WEB_SCRIPT_CLI_USAGE.trimEnd());
    return FORGE_WEB_SCRIPT_CLI_USAGE_EXIT_CODE;
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
    io.stderr(formatForgeWebScriptDiagnostics([diagnostic]));
    return FORGE_WEB_SCRIPT_CLI_COMPILATION_EXIT_CODE;
  }

  if (options.format === 'json') {
    io.stdout(
      JSON.stringify({
        entryFileName: result.entryFileName,
        diagnostics: result.diagnostics,
        verification: result.artifact.artifactVerification,
        verified: result.artifact.artifactVerification?.verified === true,
        wasmEmitted: result.artifact.wasm !== undefined,
        ...(options.command === 'trace' ? { trace: result.trace } : {}),
      }),
    );
  } else if (result.diagnostics.length > 0) io.stderr(formatForgeWebScriptDiagnostics(result.diagnostics));
  const hasErrors = result.diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  if (hasErrors || result.artifact.wasm === undefined || result.artifact.manifest === undefined)
    return FORGE_WEB_SCRIPT_CLI_COMPILATION_EXIT_CODE;
  if (options.command === 'check') {
    if (options.format !== 'json') io.stdout(`Checked ${result.entryFileName}.`);
    return 0;
  }
  if (options.command === 'trace') {
    if (options.format !== 'json')
      io.stdout(`Trace captured for ${result.entryFileName}: ${result.trace?.traceHash ?? 'unavailable'}.`);
    return 0;
  }

  const outputDirectory = outputDirectoryFor(
    result.entryFileName,
    options.outputDirectory ?? path.resolve(cwd, 'dist'),
  );
  try {
    const outputFiles = await writeForgeWebScriptArtifacts(outputDirectory, result.entryFileName, result.artifact);
    if (options.format !== 'json')
      io.stdout(`Compiled ${result.entryFileName} to ${outputDirectory}: ${outputFiles.join(', ')}.`);
    else io.stdout(JSON.stringify({ entryFileName: result.entryFileName, outputDirectory, outputFiles }));
    return 0;
  } catch (error: unknown) {
    io.stderr(`Unable to write Forge Web Script artifacts: ${error instanceof Error ? error.message : String(error)}`);
    return FORGE_WEB_SCRIPT_CLI_COMPILATION_EXIT_CODE;
  }
}

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

if (isDirectExecution()) process.exitCode = await runForgeWebScriptCli();

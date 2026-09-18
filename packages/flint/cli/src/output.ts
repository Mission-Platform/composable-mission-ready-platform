import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { FlintArtifact, FlintSoNModule } from '@mission-platform/flint';

export interface FlintCliArtifactFiles {
  readonly wasm: Uint8Array;
  readonly wat: string;
  readonly manifest: string;
  readonly declarations: string;
  readonly esm: string;
  readonly sourceMap: string;
}

export function flintArtifactBaseName(entryFileName: string): string {
  const name = path.basename(entryFileName);
  return name.endsWith('.flint') ? name.slice(0, -'.flint'.length) : name;
}

export function artifactFilesFor(artifact: FlintArtifact): FlintCliArtifactFiles {
  if (artifact.wasm === undefined || artifact.manifest === undefined)
    throw new Error('Cannot write Flint artifacts without WASM and ABI manifest data.');
  return {
    wasm: artifact.wasm,
    wat: artifact.wat ?? '',
    manifest: `${JSON.stringify(artifact.manifest, undefined, 2) ?? ''}\n`,
    declarations: artifact.declarations,
    esm: artifact.esmSource,
    sourceMap: artifact.sourceMap ?? '',
  };
}

/** Write the complete artifact set through a temporary directory and rename each file into place. */
export async function writeFlintArtifacts(
  outputDirectory: string,
  entryFileName: string,
  artifact: FlintArtifact,
): Promise<readonly string[]> {
  const files = artifactFilesFor(artifact);
  const baseName = flintArtifactBaseName(entryFileName);
  const fileNames = {
    wasm: `${baseName}.wasm`,
    wat: `${baseName}.wat`,
    manifest: `${baseName}.abi.json`,
    declarations: `${baseName}.d.ts`,
    esm: `${baseName}.js`,
    sourceMap: `${baseName}.map`,
  } as const;
  await mkdir(outputDirectory, { recursive: true });
  const temporaryDirectory = await mkdtemp(path.join(outputDirectory, `.${baseName}.tmp-`));
  try {
    await Promise.all([
      writeFile(path.join(temporaryDirectory, fileNames.wasm), files.wasm),
      writeFile(path.join(temporaryDirectory, fileNames.wat), files.wat, 'utf8'),
      writeFile(path.join(temporaryDirectory, fileNames.manifest), files.manifest, 'utf8'),
      writeFile(path.join(temporaryDirectory, fileNames.declarations), files.declarations, 'utf8'),
      writeFile(path.join(temporaryDirectory, fileNames.esm), files.esm, 'utf8'),
      writeFile(path.join(temporaryDirectory, fileNames.sourceMap), files.sourceMap, 'utf8'),
    ]);
    const outputFiles = Object.values(fileNames).map((fileName) => path.join(outputDirectory, fileName));
    await Promise.all(
      Object.values(fileNames).map((fileName) =>
        rename(path.join(temporaryDirectory, fileName), path.join(outputDirectory, fileName)),
      ),
    );
    return outputFiles;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export function formatFlintDiagnostics(
  diagnostics: readonly {
    readonly code: string;
    readonly severity: string;
    readonly phase: string;
    readonly message: string;
    readonly fileName: string;
    readonly span: {
      readonly line: number;
      readonly column: number;
      readonly endLine: number;
      readonly endColumn: number;
    };
    readonly hint?: string;
  }[],
): string {
  return diagnostics
    .map((diagnostic) => {
      const location = `${diagnostic.fileName}:${diagnostic.span.line}:${diagnostic.span.column}-${diagnostic.span.endLine}:${diagnostic.span.endColumn}`;
      const hint = diagnostic.hint === undefined ? '' : ` Hint: ${diagnostic.hint}`;
      const punctuation = /[.!?]$/u.test(diagnostic.message) ? '' : '.';
      return `${location} ${diagnostic.severity} [${diagnostic.code}] (${diagnostic.phase}) ${diagnostic.message}${punctuation}${hint}`;
    })
    .join('\n');
}

export function formatFlintSoNSummary(module: FlintSoNModule): {
  readonly json: Readonly<Record<string, unknown>>;
  readonly text: string;
} {
  const json = {
    schemaVersion: module.schemaVersion,
    compilerVersion: module.compilerVersion,
    sourceHash: module.sourceHash,
    graphHash: module.graphHash,
    optimization: module.optimization,
    boundsChecks: module.boundsChecks,
    memoryModel: module.memoryModel,
    functions: module.functions.length,
    nodes: module.nodes.length,
    regions: module.regions.length,
    optimizerPasses: module.optimizationReport?.passes.map(({ name }) => name) ?? [],
  } as const;
  return {
    json,
    text: `SoN ${module.graphHash}: ${module.nodes.length} nodes, ${module.functions.length} functions, ${module.regions.length} regions; ${module.optimization} optimization; bounds checks ${module.boundsChecks}.`,
  };
}

export function outputDirectoryFor(
  entryFileName: string,
  outputDirectory = path.join(path.dirname(entryFileName), 'dist'),
): string {
  return outputDirectory;
}

import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { FlintArtifact, FlintDiagnostic, FlintSoNModule } from '@mission-platform/flint';

export { formatFlintSarif } from '@mission-platform/flint';

/**
 * Collection of artifact payloads to be written to disk.
 */
export interface FlintCliArtifactFiles {
  readonly wasm: Uint8Array;
  readonly wat: string;
  readonly manifest: string;
  readonly declarations: string;
  readonly esm: string;
  readonly sourceMap: string;
}

/**
 * Computes the base artifact name without file extension from an entry file path.
 *
 * @param entryFileName Path to the main entrypoint file.
 * @returns Base name suitable for artifact emission.
 */
export function flintArtifactBaseName(entryFileName: string): string {
  const name = path.basename(entryFileName);
  return name.endsWith('.flint') ? name.slice(0, -'.flint'.length) : name;
}

/**
 * Sanitizes and virtualizes a source file path to prevent host path traversal (e.g. `../`) and host filesystem disclosure.
 *
 * @param filePath Raw source path from AST or source map.
 * @param workspaceRoot Optional root directory to calculate relative paths against.
 * @returns Sanitized virtual or relative path string.
 */
export function sanitizeSourceMapPath(filePath: string, workspaceRoot?: string): string {
  if (filePath.length === 0) return 'source.flint';
  let normalized = filePath.replaceAll('\\', '/');

  // Strip workspace root prefix if present
  if (workspaceRoot !== undefined) {
    const normalizedRoot = workspaceRoot.replaceAll('\\', '/').replace(/\/+$/, '');
    if (normalized.startsWith(normalizedRoot)) {
      normalized = normalized.slice(normalizedRoot.length).replace(/^\/+/, '');
    }
  }

  // Strip drive letter if present (e.g. C:)
  normalized = normalized.replace(/^[a-z]:/i, '');
  // Strip host user and private system directories
  normalized = normalized.replace(/^(\/private|\/Users\/[^/]+|\/home\/[^/]+)/i, '');
  normalized = normalized.replace(/^\/+/, '');

  // Strip path traversal sequences (`../`, `..`)
  const segments = normalized.split('/').filter((seg) => seg.length > 0 && seg !== '.' && seg !== '..');
  const safePath = segments.length > 0 ? segments.join('/') : path.basename(filePath);

  return `flint://workspace/${safePath}`;
}

/**
 * Sanitizes a v3 source map JSON string, virtualizing all source paths to prevent traversal and leakage.
 */
export function sanitizeSourceMap(sourceMap: string, workspaceRoot?: string): string {
  if (sourceMap.trim().length === 0) return sourceMap;
  try {
    const parsed = JSON.parse(sourceMap) as Record<string, unknown>;
    if (Array.isArray(parsed.sources)) {
      parsed.sources = parsed.sources.map((source: unknown) =>
        typeof source === 'string' ? sanitizeSourceMapPath(source, workspaceRoot) : source,
      );
    }
    if (typeof parsed.file === 'string') {
      parsed.file = path.basename(parsed.file);
    }
    if (typeof parsed.sourceRoot === 'string') {
      parsed.sourceRoot = '';
    }
    return JSON.stringify(parsed);
  } catch {
    return sourceMap;
  }
}

/**
 * Extracts and prepares the binary and textual file payloads from a compiled Flint artifact.
 *
 * @param artifact Compiled Flint artifact containing WASM, WAT, and metadata.
 * @returns Object mapping artifact roles to their file contents.
 */
export function artifactFilesFor(artifact: FlintArtifact): FlintCliArtifactFiles {
  const { wasm, manifest, wat = '', declarations, esmSource, sourceMap = '' } = artifact;
  if (wasm === undefined || manifest === undefined) {
    throw new Error('Cannot write Flint artifacts without WASM and ABI manifest data.');
  }
  return {
    wasm,
    wat,
    manifest: `${JSON.stringify(manifest, undefined, 2)}\n`,
    declarations,
    esm: esmSource,
    sourceMap: sanitizeSourceMap(sourceMap),
  };
}

/**
 * Atomically writes the complete artifact set through a temporary directory and renames each file into place.
 *
 * @param outputDirectory Destination folder path.
 * @param entryFileName Path to the primary entrypoint.
 * @param artifact Compiled Flint artifact.
 * @returns Promise resolving to an array of written file paths.
 */
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

/**
 * Formats compiler diagnostics with multi-span carets, line gutters, and remediation notes.
 *
 * @param diagnostics Array of diagnostic records to format.
 * @param sourceResolver Optional source resolver returning file contents by file name.
 * @returns Human-readable multi-span caret diagnostic string.
 */
export function formatFlintCaretDiagnostics(
  diagnostics: readonly FlintDiagnostic[],
  sourceResolver?: (fileName: string) => string | undefined,
): string {
  return diagnostics
    .map((diagnostic) => {
      const { severity, code, message, fileName, span, hint, evidence } = diagnostic;
      const header = `${severity}[${code}]: ${message}`;
      const location = ` --> ${fileName}:${span.line}:${span.column}`;

      const source = sourceResolver?.(fileName);
      if (source === undefined || source.length === 0) {
        const hintText = hint === undefined ? '' : `\n = note: ${hint}`;
        return `${header}\n${location}${hintText}`;
      }

      const lines = source.split(/\r?\n/u);
      const targetLine = lines[span.line - 1] ?? '';
      const lineNumberString = String(span.line);
      const gutterPadding = ' '.repeat(lineNumberString.length);

      const colStart = Math.max(0, span.column - 1);
      const colEnd = span.endLine === span.line ? Math.max(colStart + 1, span.endColumn - 1) : targetLine.length;
      const underlineLength = Math.max(1, colEnd - colStart);
      const caretLine = `${' '.repeat(colStart)}${'^'.repeat(underlineLength)}`;

      const evidenceLines =
        evidence === undefined || evidence.length === 0
          ? []
          : evidence.flatMap((item) => {
              if (item.span === undefined) return [`${gutterPadding} = evidence: ${item.message}`];
              const itemLine = lines[item.span.line - 1] ?? '';
              const itemLineNumber = String(item.span.line);
              const itemGutter = ' '.repeat(itemLineNumber.length);
              const itemColStart = Math.max(0, item.span.column - 1);
              const itemColEnd =
                item.span.endLine === item.span.line
                  ? Math.max(itemColStart + 1, item.span.endColumn - 1)
                  : itemLine.length;
              const itemUnderline = `${' '.repeat(itemColStart)}${'-'.repeat(Math.max(1, itemColEnd - itemColStart))}`;
              return [
                `${itemGutter} |`,
                `${itemLineNumber} | ${itemLine}`,
                `${itemGutter} | ${itemUnderline} ${item.message}`,
              ];
            });

      const hintText = hint === undefined ? '' : `\n${gutterPadding} = note: ${hint}`;
      const middleSection = [
        `${gutterPadding} |`,
        `${lineNumberString} | ${targetLine}`,
        `${gutterPadding} | ${caretLine}`,
        ...evidenceLines,
      ].join('\n');

      return `${header}\n${location}\n${middleSection}${hintText}`;
    })
    .join('\n\n');
}

/**
 * Formats an array of diagnostics into human-readable compiler diagnostic messages.
 *
 * @param diagnostics Array of diagnostic records to format.
 * @returns Newline-separated diagnostic summary string.
 */
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

/**
 * Formats a Sea-of-Nodes IR module into JSON metadata and terminal summary text.
 *
 * @param module Flint Sea-of-Nodes module to format.
 * @returns Summary object containing structured JSON and human-readable text.
 */
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

/**
 * Computes the target output directory for artifact generation.
 *
 * @param entryFileName Path to the entry file.
 * @param outputDirectory Explicit or default output directory path.
 * @returns Resolved output directory string.
 */
export function outputDirectoryFor(entryFileName: string, outputDirectory?: string): string {
  return outputDirectory ?? path.join(path.dirname(entryFileName), 'dist');
}

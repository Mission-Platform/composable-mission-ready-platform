import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { inspectForgeModule } from './ast.js';

import type { ForgeExportFact, ForgeImportFact, ForgeSourceSpan } from './ast.js';

export type ForgeFileKind =
  'entry' | 'component' | 'composable' | 'code' | 'style' | 'folder' | 'asset' | 'declaration';

export interface ForgeFileNode {
  readonly id: string;
  readonly kind: ForgeFileKind;
  readonly exports: readonly ForgeExportFact[];
  readonly imports: readonly ForgeImportFact[];
  readonly sourceRelativePath: string;
  readonly frameworkDirective: 'react' | 'vue' | undefined;
}

export type ForgeFileEdgeRelation = 'import' | 're-export' | 'type-export' | 'style' | 'side-effect';

export interface ForgeFileEdge {
  readonly from: string;
  readonly to?: string;
  readonly relation: ForgeFileEdgeRelation;
  readonly specifier: string;
  readonly resolved: boolean;
  readonly external?: boolean;
  readonly span?: ForgeSourceSpan;
}

export type ForgeGraphDiagnosticCode =
  'missing-entry' | 'missing-file' | 'unsupported-extension' | 'ambiguous-export' | 'cycle';

export interface ForgeGraphDiagnostic {
  readonly code: ForgeGraphDiagnosticCode;
  readonly message: string;
  readonly source: string;
  readonly specifier: string;
  readonly span?: ForgeSourceSpan;
}

export interface ForgeFileGraph {
  readonly entry: string;
  readonly nodes: ReadonlyMap<string, ForgeFileNode>;
  readonly edges: readonly ForgeFileEdge[];
  readonly diagnostics: readonly ForgeGraphDiagnostic[];
}

export interface ForgeFileGraphOptions {
  readonly entry: string;
  readonly sourceRoot?: string;
}

const CODE_EXTENSIONS = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);
const STYLE_EXTENSIONS = new Set(['.css', '.less', '.sass', '.scss', '.styl']);
const ASSET_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp', '.woff', '.woff2']);
const PROBE_EXTENSIONS = [...CODE_EXTENSIONS, ...STYLE_EXTENSIONS, ...ASSET_EXTENSIONS];

function canonical(filePath: string): string {
  return path.resolve(filePath);
}

function isDeclaration(filePath: string): boolean {
  return filePath.endsWith('.d.ts') || filePath.endsWith('.d.mts') || filePath.endsWith('.d.cts');
}

function extensionOf(filePath: string): string {
  return isDeclaration(filePath) ? '.d.ts' : path.extname(filePath).toLowerCase();
}

function sourceRelativePath(filePath: string, sourceRoot: string): string {
  return path.relative(sourceRoot, filePath).split(path.sep).join('/');
}

function scriptKindFor(filePath: string): ts.ScriptKind {
  switch (path.extname(filePath).toLowerCase()) {
    case '.js':
    case '.cjs':
    case '.mjs': {
      return ts.ScriptKind.JS;
    }
    case '.jsx': {
      return ts.ScriptKind.JSX;
    }
    case '.ts':
    case '.cts':
    case '.d.ts':
    case '.d.cts':
    case '.d.mts':
    case '.mts': {
      return ts.ScriptKind.TS;
    }
    default: {
      return ts.ScriptKind.TSX;
    }
  }
}

function isSupportedSource(filePath: string): boolean {
  const extension = extensionOf(filePath);
  return (
    CODE_EXTENSIONS.has(extension) ||
    STYLE_EXTENSIONS.has(extension) ||
    ASSET_EXTENSIONS.has(extension) ||
    extension === '.d.ts'
  );
}

function isLocalSpecifier(specifier: string): boolean {
  return specifier.startsWith('.') || specifier.startsWith('@/');
}

function isStyleSpecifier(specifier: string): boolean {
  return STYLE_EXTENSIONS.has(path.extname(specifier).toLowerCase());
}

function nodeKind(
  filePath: string,
  entry: string,
  facts: ReturnType<typeof inspectForgeModule>,
  sourceRoot: string,
): ForgeFileKind {
  if (filePath === entry) {
    return 'entry';
  }
  const extension = extensionOf(filePath);
  if (STYLE_EXTENSIONS.has(extension)) {
    return 'style';
  }
  if (ASSET_EXTENSIONS.has(extension)) {
    return 'asset';
  }
  if (extension === '.d.ts') {
    return 'declaration';
  }
  if (path.basename(filePath, path.extname(filePath)) === 'index') {
    return 'folder';
  }
  const relative = sourceRelativePath(filePath, sourceRoot).split('/');
  const valueExports = facts.exports
    .filter((entryExport) => !entryExport.typeOnly)
    .map((entryExport) => entryExport.exportedName);
  if (facts.hasJsx || valueExports.some((name) => name?.startsWith('Forge') === true)) {
    return 'component';
  }
  if (relative.includes('composables') || valueExports.some((name) => name?.startsWith('use') === true)) {
    return 'composable';
  }
  return 'code';
}

function readSource(filePath: string): ts.SourceFile | undefined {
  if (
    !isSupportedSource(filePath) ||
    STYLE_EXTENSIONS.has(extensionOf(filePath)) ||
    ASSET_EXTENSIONS.has(extensionOf(filePath))
  ) {
    return undefined;
  }
  const source = fs.readFileSync(filePath, 'utf8');
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKindFor(filePath));
}

function existingFile(candidate: string): string | undefined {
  try {
    if (fs.statSync(candidate).isFile()) {
      return canonical(candidate);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function resolveLocalSpecifier(
  specifier: string,
  from: string,
  sourceRoot: string,
): { file?: string; unsupported?: string } {
  const target = specifier.startsWith('@/')
    ? path.resolve(sourceRoot, specifier.slice(2))
    : path.resolve(path.dirname(from), specifier);
  const explicitExtension = path.extname(target).length > 0;
  const exact = existingFile(target);
  if (exact !== undefined) {
    return isSupportedSource(exact) ? { file: exact } : { unsupported: exact };
  }
  const candidates = explicitExtension ? [] : PROBE_EXTENSIONS.map((extension) => `${target}${extension}`);
  for (const candidate of candidates) {
    const file = existingFile(candidate);
    if (file !== undefined) {
      return { file };
    }
  }
  try {
    if (fs.statSync(target).isDirectory()) {
      for (const extension of PROBE_EXTENSIONS) {
        const file = existingFile(path.join(target, `index${extension}`));
        if (file !== undefined) {
          return { file };
        }
        const namedFile = existingFile(path.join(target, `${path.basename(target)}${extension}`));
        if (namedFile !== undefined) {
          return { file: namedFile };
        }
      }
    }
  } catch {
    // The diagnostic below includes the authored specifier and source path.
  }
  return explicitExtension && !isSupportedSource(target) ? { unsupported: target } : {};
}

function parseModule(filePath: string): ReturnType<typeof inspectForgeModule> | undefined {
  const sourceFile = readSource(filePath);
  return sourceFile === undefined ? undefined : inspectForgeModule(sourceFile);
}

function edgeRelation(
  importFact: ForgeImportFact | undefined,
  reExport: ForgeExportFact | undefined,
  specifier: string,
): ForgeFileEdgeRelation {
  if (reExport !== undefined) {
    return reExport.typeOnly ? 'type-export' : 're-export';
  }
  if (isStyleSpecifier(specifier)) {
    return 'style';
  }
  if (importFact?.sideEffectOnly === true) {
    return 'side-effect';
  }
  return importFact !== undefined && importFact.typeNames.length > 0 && importFact.valueNames.length === 0
    ? 'type-export'
    : 'import';
}

function diagnostic(
  code: ForgeGraphDiagnosticCode,
  source: string,
  specifier: string,
  message: string,
  span?: ForgeSourceSpan,
): ForgeGraphDiagnostic {
  return { code, source, specifier, message, span };
}

/** Build the canonical source graph from one configured entry module. */
export function buildForgeFileGraph(options: ForgeFileGraphOptions): ForgeFileGraph {
  const entry = canonical(options.entry);
  const sourceRoot = canonical(options.sourceRoot ?? path.dirname(entry));
  const nodes = new Map<string, ForgeFileNode>();
  const edges: ForgeFileEdge[] = [];
  const diagnostics: ForgeGraphDiagnostic[] = [];
  const visiting: string[] = [];
  const cycleKeys = new Set<string>();

  if (existingFile(entry) === undefined) {
    diagnostics.push(diagnostic('missing-entry', entry, entry, `Forge graph entry does not exist: ${entry}`));
    return { entry, nodes, edges, diagnostics };
  }

  const visit = (filePath: string): void => {
    const id = canonical(filePath);
    if (nodes.has(id)) {
      return;
    }
    const facts = parseModule(id);
    if (facts === undefined) {
      nodes.set(id, {
        id,
        kind: STYLE_EXTENSIONS.has(extensionOf(id))
          ? 'style'
          : ASSET_EXTENSIONS.has(extensionOf(id))
            ? 'asset'
            : 'code',
        exports: [],
        imports: [],
        sourceRelativePath: sourceRelativePath(id, sourceRoot),
        frameworkDirective: undefined,
      });
      return;
    }
    nodes.set(id, {
      id,
      kind: nodeKind(id, entry, facts, sourceRoot),
      exports: facts.exports,
      imports: facts.imports,
      sourceRelativePath: sourceRelativePath(id, sourceRoot),
      frameworkDirective: facts.frameworkDirective,
    });
    visiting.push(id);
    const relationships = new Map<string, { importFact?: ForgeImportFact; reExports: ForgeExportFact[] }>();
    for (const importFact of facts.imports) {
      relationships.set(importFact.specifier, { importFact, reExports: [] });
    }
    for (const reExport of facts.exports) {
      if (reExport.specifier === undefined) {
        continue;
      }
      const relationship = relationships.get(reExport.specifier) ?? { reExports: [] };
      relationship.reExports.push(reExport);
      relationships.set(reExport.specifier, relationship);
    }
    for (const [specifier, relationship] of relationships) {
      const importFact = relationship.importFact;
      const exportFacts = relationship.reExports.length === 0 ? [undefined] : relationship.reExports;
      for (const reExport of exportFacts) {
        const local = isLocalSpecifier(specifier);
        const relation = edgeRelation(importFact, reExport, specifier);
        if (!local) {
          edges.push({
            from: id,
            relation,
            specifier,
            resolved: false,
            external: true,
            span: reExport?.span ?? importFact?.span,
          });
          continue;
        }
        const resolved = resolveLocalSpecifier(specifier, id, sourceRoot);
        if (resolved.file === undefined) {
          edges.push({
            from: id,
            relation,
            specifier,
            resolved: false,
            span: reExport?.span ?? importFact?.span,
          });
          diagnostics.push(
            diagnostic(
              resolved.unsupported === undefined ? 'missing-file' : 'unsupported-extension',
              id,
              specifier,
              resolved.unsupported === undefined
                ? `Unable to resolve local Forge import '${specifier}' from ${id}`
                : `Unsupported Forge source extension for '${specifier}' from ${id}`,
              reExport?.span ?? importFact?.span,
            ),
          );
          continue;
        }
        const target = resolved.file;
        edges.push({
          from: id,
          to: target,
          relation,
          specifier,
          resolved: true,
          span: reExport?.span ?? importFact?.span,
        });
        if (visiting.includes(target)) {
          const cycle = [...visiting.slice(visiting.indexOf(target)), target].join(' -> ');
          const key = `${id}:${specifier}`;
          if (!cycleKeys.has(key)) {
            cycleKeys.add(key);
            diagnostics.push(
              diagnostic(
                'cycle',
                id,
                specifier,
                `Forge graph cycle detected: ${cycle}`,
                importFact?.span ?? reExport?.span,
              ),
            );
          }
        } else {
          visit(target);
        }
      }
    }
    visiting.pop();
  };

  visit(entry);

  for (const fileNode of nodes.values()) {
    let directory = path.dirname(fileNode.id);
    while (directory === sourceRoot || directory.startsWith(`${sourceRoot}${path.sep}`)) {
      if (!nodes.has(directory)) {
        nodes.set(directory, {
          id: directory,
          kind: 'folder',
          exports: [],
          imports: [],
          sourceRelativePath: sourceRelativePath(directory, sourceRoot),
          frameworkDirective: undefined,
        });
      }
      if (directory === sourceRoot) {
        break;
      }
      directory = path.dirname(directory);
    }
  }

  for (const node of nodes.values()) {
    const namedSources = new Map<string, string>();
    for (const entryExport of node.exports) {
      if (entryExport.exportedName === undefined) {
        continue;
      }
      const owner = entryExport.specifier ?? node.id;
      const previous = namedSources.get(entryExport.exportedName);
      if (previous !== undefined && previous !== owner) {
        diagnostics.push(
          diagnostic(
            'ambiguous-export',
            node.id,
            entryExport.exportedName,
            `Ambiguous export '${entryExport.exportedName}' in ${node.id}: ${previous} and ${owner}`,
            entryExport.span,
          ),
        );
      } else {
        namedSources.set(entryExport.exportedName, owner);
      }
    }
  }

  diagnostics.sort((left, right) =>
    `${left.source}:${left.specifier}:${left.code}`.localeCompare(`${right.source}:${right.specifier}:${right.code}`),
  );
  return { entry, nodes, edges, diagnostics };
}

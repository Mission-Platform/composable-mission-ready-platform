import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { NEUTRAL_MODULE, resolveWorkspaceLocalImport } from './ast.js';

export type FileNodeKind = 'component' | 'composable' | 'code' | 'style' | 'folder' | 'asset';
export type FileEdgeKind = 'import' | 'export';

export interface FileGraphNode {
  readonly id: string;
  readonly filePath: string;
  readonly relativePath: string;
  readonly relativeDirectory: string;
  readonly kind: FileNodeKind;
}

export interface FileGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly specifier: string;
  readonly kind: FileEdgeKind;
}

export interface FileGraphOptions {
  readonly entryFile: string;
  readonly sourceRoot: string;
  readonly componentSpecifiers?: readonly string[];
}

export interface FileGraph {
  readonly entry: FileGraphNode;
  readonly nodes: readonly FileGraphNode[];
  readonly edges: readonly FileGraphEdge[];
  resolve(fromFile: string, specifier: string): FileGraphNode | undefined;
  classify(filePath: string, kind: FileNodeKind): FileGraphNode | undefined;
  node(filePath: string): FileGraphNode | undefined;
}

const SOURCE_EXTENSIONS = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.vue',
  '.svelte',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.styl',
];
const SOURCE_FILE_EXTENSIONS = new Set(SOURCE_EXTENSIONS.slice(1));
const STYLE_EXTENSIONS = new Set(['.css', '.scss', '.sass', '.less', '.styl']);

function normalise(filePath: string): string {
  return path.resolve(filePath);
}

function relativePath(sourceRoot: string, filePath: string): string {
  return path.relative(sourceRoot, filePath).split(path.sep).join('/');
}

function classify(filePath: string, componentPaths: ReadonlySet<string>, neutralImports: boolean): FileNodeKind {
  const extension = path.extname(filePath).toLowerCase();
  if (STYLE_EXTENSIONS.has(extension)) return 'style';
  if (componentPaths.has(filePath)) return 'component';
  if (neutralImports) return 'composable';
  return SOURCE_FILE_EXTENSIONS.has(extension) ? 'code' : 'asset';
}

function sourceFileKind(filePath: string): ts.ScriptKind {
  return filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

function moduleSpecifiers(filePath: string): { specifier: string; kind: FileEdgeKind }[] {
  const extension = path.extname(filePath).toLowerCase();
  if (!SOURCE_FILE_EXTENSIONS.has(extension)) return [];
  const source = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, sourceFileKind(filePath));
  const result: { specifier: string; kind: FileEdgeKind }[] = [];
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      result.push({ specifier: statement.moduleSpecifier.text, kind: 'import' });
    } else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined) {
      result.push({ specifier: statement.moduleSpecifier.text, kind: 'export' });
    }
  }
  return result;
}

function resolveCandidate(fromFile: string, specifier: string, sourceRoot: string): string | undefined {
  let base: string | undefined;
  if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    const relative = resolveWorkspaceLocalImport(specifier, fromFile, sourceRoot);
    if (relative === undefined) return undefined;
    base = path.resolve(path.dirname(fromFile), relative);
  }
  for (const candidate of SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`)) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  for (const extension of SOURCE_EXTENSIONS.slice(1)) {
    const candidate = path.join(base, `index${extension}`);
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return undefined;
}

export function createFileGraph(options: FileGraphOptions): FileGraph {
  const sourceRoot = normalise(options.sourceRoot);
  const componentPaths = new Set<string>();
  const discovered = new Map<string, FileGraphNode>();
  const edges: FileGraphEdge[] = [];
  const folderNodes = new Map<string, FileGraphNode>();

  const ensureFolder = (directory: string): void => {
    const normalised = normalise(directory);
    if (normalised === sourceRoot || folderNodes.has(normalised)) return;
    const parent = path.dirname(normalised);
    ensureFolder(parent);
    const node: FileGraphNode = {
      id: `folder:${normalised}`,
      filePath: normalised,
      relativePath: relativePath(sourceRoot, normalised),
      relativeDirectory: relativePath(sourceRoot, parent),
      kind: 'folder',
    };
    folderNodes.set(normalised, node);
  };

  const resolve = (fromFile: string, specifier: string): FileGraphNode | undefined => {
    const resolved = resolveCandidate(fromFile, specifier, sourceRoot);
    if (resolved === undefined) return undefined;
    visit(resolved);
    return discovered.get(resolved);
  };

  const visit = (filePath: string): void => {
    const normalised = normalise(filePath);
    if (discovered.has(normalised)) return;
    ensureFolder(path.dirname(normalised));
    const source =
      existsSync(normalised) && SOURCE_FILE_EXTENSIONS.has(path.extname(normalised).toLowerCase())
        ? readFileSync(normalised, 'utf8')
        : '';
    const neutralImports = source.includes(`from '${NEUTRAL_MODULE}'`) || source.includes(`from "${NEUTRAL_MODULE}"`);
    const node: FileGraphNode = {
      id: normalised,
      filePath: normalised,
      relativePath: relativePath(sourceRoot, normalised),
      relativeDirectory: relativePath(sourceRoot, path.dirname(normalised)),
      kind: classify(normalised, componentPaths, neutralImports),
    };
    discovered.set(normalised, node);
    for (const entry of moduleSpecifiers(normalised)) {
      const target = resolve(normalised, entry.specifier);
      if (target !== undefined) {
        edges.push({ from: normalised, to: target.filePath, specifier: entry.specifier, kind: entry.kind });
      }
    }
  };

  for (const specifier of options.componentSpecifiers ?? []) {
    const component = resolve(normalise(options.entryFile), specifier);
    if (component !== undefined) {
      componentPaths.add(component.filePath);
      discovered.set(component.filePath, { ...component, kind: 'component' });
    }
  }
  visit(options.entryFile);
  const nodes = [...folderNodes.values(), ...discovered.values()];

  return {
    entry: discovered.get(normalise(options.entryFile))!,
    nodes,
    edges,
    resolve,
    classify(filePath, kind) {
      const existing = discovered.get(normalise(filePath));
      if (existing === undefined) return;
      const updated = { ...existing, kind };
      discovered.set(updated.filePath, updated);
      return updated;
    },
    node(filePath) {
      return discovered.get(normalise(filePath));
    },
  };
}

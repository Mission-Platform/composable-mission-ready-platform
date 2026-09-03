import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { parseOxcModule, type OxcParsedModule } from './oxc.js';

import type { ForgeExportFact, ForgeImportFact, ForgeSourceSpan } from './ast.js';
import type { JsxFramework } from '@mission-platform/forge-plugin-api';

export type { ForgeExportFact, ForgeImportFact, ForgeSourceSpan } from './ast.js';

export type ForgeFileKind =
  'entry' | 'component' | 'composable' | 'code' | 'style' | 'folder' | 'asset' | 'declaration';

export interface ForgeFileNode {
  readonly id: string;
  /** Content fingerprint used to detect edits without relying on timestamps. */
  readonly fingerprint: string;
  readonly kind: ForgeFileKind;
  readonly exports: readonly ForgeExportFact[];
  readonly imports: readonly ForgeImportFact[];
  readonly sourceRelativePath: string;
  readonly frameworkDirective: JsxFramework | undefined;
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
  | 'missing-entry'
  | 'missing-file'
  | 'unsupported-extension'
  | 'ambiguous-export'
  | 'unsupported-authoring-form'
  | 'cycle';

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
  /** Direct dependencies keyed by importing node. */
  readonly dependencies: ReadonlyMap<string, readonly string[]>;
  /** Reverse direct-dependency index keyed by imported node. */
  readonly reverseDependencies: ReadonlyMap<string, readonly string[]>;
  readonly diagnostics: readonly ForgeGraphDiagnostic[];
}

export type ForgePathAliases = Readonly<Record<string, string | readonly string[]>>;

export interface ForgeFileGraphOptions {
  readonly entry: string;
  readonly sourceRoot?: string;
  /** Optional tsconfig used for `baseUrl` and `paths` resolution. */
  readonly tsconfig?: string;
  /** Alias configuration that takes precedence over tsconfig paths. */
  readonly paths?: ForgePathAliases;
  readonly baseUrl?: string;
}

const CODE_EXTENSIONS = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);
const STYLE_EXTENSIONS = new Set(['.css', '.less', '.sass', '.scss', '.styl']);
// Forge Web Script sources are consumed by the dedicated FWS plugin rather
// than the JavaScript authoring parser, but must remain resolvable when a
// framework component imports a package façade that uses a local `.fws` graph.
const ASSET_EXTENSIONS = new Set([
  '.avif',
  '.fws',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp',
  '.woff',
  '.woff2',
]);
const PROBE_EXTENSIONS = [...CODE_EXTENSIONS, ...STYLE_EXTENSIONS, ...ASSET_EXTENSIONS];

function canonical(filePath: string): string {
  return path.resolve(filePath);
}

function fingerprint(source: string | Uint8Array): string {
  return crypto.createHash('sha256').update(source).digest('hex');
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

interface AliasConfiguration {
  readonly baseUrl: string;
  readonly paths: ForgePathAliases;
}

function parseJsoncObject(text: string): Record<string, unknown> | undefined {
  try {
    const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const value = JSON.parse(stripped) as unknown;
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function readAliasConfiguration(options: ForgeFileGraphOptions, sourceRoot: string): AliasConfiguration {
  let baseUrl = canonical(options.baseUrl ?? sourceRoot);
  let paths: ForgePathAliases = options.paths ?? {};
  const tsconfigPath = options.tsconfig === undefined ? undefined : canonical(options.tsconfig);
  if (tsconfigPath !== undefined) {
    const configured = parseJsoncObject(fs.readFileSync(tsconfigPath, 'utf8'));
    if (configured !== undefined) {
      const compilerOptions = (configured.compilerOptions ?? {}) as {
        baseUrl?: unknown;
        paths?: unknown;
      };
      const configDirectory = path.dirname(tsconfigPath);
      if (options.baseUrl === undefined && typeof compilerOptions.baseUrl === 'string') {
        baseUrl = canonical(path.resolve(configDirectory, compilerOptions.baseUrl));
      }
      if (options.paths === undefined && compilerOptions.paths !== undefined) {
        paths = compilerOptions.paths as ForgePathAliases;
      }
    }
  }
  return { baseUrl, paths };
}

function aliasTarget(specifier: string, aliases: AliasConfiguration): string | undefined {
  const matches = Object.keys(aliases.paths)
    .filter((pattern) => {
      if (pattern.endsWith('*')) return specifier.startsWith(pattern.slice(0, -1));
      return pattern === specifier;
    })
    .sort((left, right) => right.length - left.length);
  const pattern = matches[0];
  if (pattern === undefined) {
    return specifier.startsWith('@/') ? path.resolve(aliases.baseUrl, specifier.slice(2)) : undefined;
  }
  const remainder = pattern.endsWith('*') ? specifier.slice(pattern.length - 1) : '';
  const target = aliases.paths[pattern];
  const firstTarget = typeof target === 'string' ? target : target?.[0];
  return firstTarget === undefined ? undefined : path.resolve(aliases.baseUrl, firstTarget.replaceAll('*', remainder));
}

function hasAlias(specifier: string, aliases: AliasConfiguration): boolean {
  return aliasTarget(specifier, aliases) !== undefined;
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

function readSource(filePath: string): OxcParsedModule | undefined {
  if (
    !isSupportedSource(filePath) ||
    STYLE_EXTENSIONS.has(extensionOf(filePath)) ||
    ASSET_EXTENSIONS.has(extensionOf(filePath))
  ) {
    return undefined;
  }
  const source = fs.readFileSync(filePath, 'utf8');
  return parseOxcModule(filePath, source);
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
  aliases: AliasConfiguration,
): { file?: string; unsupported?: string } {
  const target = aliasTarget(specifier, aliases) ?? path.resolve(path.dirname(from), specifier);
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

function parseModule(
  filePath: string,
): { facts: OxcParsedModule['facts']; fingerprint: string; parsed: OxcParsedModule } | undefined {
  const parsed = readSource(filePath);
  if (parsed === undefined) return undefined;
  return { facts: parsed.facts, fingerprint: fingerprint(fs.readFileSync(filePath)), parsed };
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
  const aliases = readAliasConfiguration(options, sourceRoot);
  const nodes = new Map<string, ForgeFileNode>();
  const edges: ForgeFileEdge[] = [];
  const diagnostics: ForgeGraphDiagnostic[] = [];
  const visiting: string[] = [];
  const visitingIndex = new Map<string, number>();
  const cycleKeys = new Set<string>();

  if (existingFile(entry) === undefined) {
    diagnostics.push(diagnostic('missing-entry', entry, entry, `Forge graph entry does not exist: ${entry}`));
    return { entry, nodes, edges, dependencies: new Map(), reverseDependencies: new Map(), diagnostics };
  }

  const visit = (filePath: string): void => {
    const id = canonical(filePath);
    if (nodes.has(id)) {
      return;
    }
    const parsed = parseModule(id);
    if (parsed === undefined) {
      const nodeFingerprint = (() => {
        try {
          return fingerprint(fs.readFileSync(id));
        } catch {
          return '';
        }
      })();
      nodes.set(id, {
        id,
        fingerprint: nodeFingerprint,
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
    const facts = parsed.facts;
    if (parsed.parsed.errors.length > 0) {
      for (const parseDiagnostic of parsed.parsed.errors) {
        const start = parseDiagnostic.start;
        const lineStart = parsed.parsed.source.lastIndexOf('\n', start - 1) + 1;
        diagnostics.push({
          code: 'unsupported-authoring-form',
          message: `Unable to parse ${id}: [OXC] ${parseDiagnostic.message}`,
          source: id,
          specifier: '',
          span: {
            start,
            end: parseDiagnostic.end,
            line: parsed.parsed.source.slice(0, start).split('\n').length,
            column: start - lineStart + 1,
          },
        });
      }
    }
    nodes.set(id, {
      id,
      fingerprint: parsed?.fingerprint ?? '',
      kind: nodeKind(id, entry, facts, sourceRoot),
      exports: facts.exports,
      imports: facts.imports,
      sourceRelativePath: sourceRelativePath(id, sourceRoot),
      frameworkDirective: facts.frameworkDirective,
    });
    visitingIndex.set(id, visiting.length);
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
        const local = isLocalSpecifier(specifier) || hasAlias(specifier, aliases);
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
        const resolved = resolveLocalSpecifier(specifier, id, aliases);
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
        const cycleStart = visitingIndex.get(target);
        if (cycleStart !== undefined) {
          const cycle = [...visiting.slice(cycleStart), target].join(' -> ');
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
    visitingIndex.delete(id);
  };

  visit(entry);

  for (const fileNode of nodes.values()) {
    let directory = path.dirname(fileNode.id);
    while (directory === sourceRoot || directory.startsWith(`${sourceRoot}${path.sep}`)) {
      if (!nodes.has(directory)) {
        nodes.set(directory, {
          id: directory,
          fingerprint: '',
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
  const dependencies = new Map<string, Set<string>>();
  const reverseDependencies = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!edge.resolved || edge.to === undefined) continue;
    const direct = dependencies.get(edge.from) ?? new Set<string>();
    direct.add(edge.to);
    dependencies.set(edge.from, direct);
    const reverse = reverseDependencies.get(edge.to) ?? new Set<string>();
    reverse.add(edge.from);
    reverseDependencies.set(edge.to, reverse);
  }
  const stableDependencies = new Map<string, readonly string[]>(
    [...dependencies].map(([from, targets]) => [from, [...targets].sort()] as const),
  );
  const stableReverseDependencies = new Map<string, readonly string[]>(
    [...reverseDependencies].map(([to, dependents]) => [to, [...dependents].sort()] as const),
  );
  return {
    entry,
    nodes,
    edges,
    dependencies: stableDependencies,
    reverseDependencies: stableReverseDependencies,
    diagnostics,
  };
}

/** Return a stable, sorted transitive dependent closure for watch invalidation. */
export function collectForgeDependents(graph: ForgeFileGraph, changedFiles: readonly string[]): string[] {
  const affected = new Set(changedFiles.map((fileName) => canonical(fileName)));
  const pending = [...affected];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;
    for (const dependent of graph.reverseDependencies.get(current) ?? []) {
      if (!affected.has(dependent)) {
        affected.add(dependent);
        pending.push(dependent);
      }
    }
  }
  return [...affected].sort();
}

/**
 * Discovery helpers shared by the two-stage compiler.
 *
 * The neutral components are authored in a per-component folder
 * (`src/components/<name>/<name>.tsx`, or nested under an atomic-design level
 * such as `src/components/atoms/<name>/<name>.tsx`) and re-exported from a
 * single barrel (`src/components/index.ts`). Both the Stage-1 code generator and
 * the declaration synthesiser need to know, for each component: its neutral
 * export name (`ForgeBadge`), the public name it ships under (`Badge`), the
 * folder/file base name (`forge-badge`, always flat for generated output), the
 * source directory relative to the barrel (`atoms/forge-badge` when nested), and
 * the exported props interface (`BadgeProperties`) — all of which are derived
 * here by parsing the barrel's `export { … } from './…'` re-exports.
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  createCompilerDiagnostic,
  throwOnCompilerErrors,
  type CompilerDiagnostic,
} from '@mission-platform/forge-plugin-api';

import {
  oxcArray,
  oxcIdentifierName,
  oxcNodeText,
  oxcObject,
  oxcProgramBody,
  oxcUnwrapModuleStatement,
  parseOxcModule,
  type OxcNode,
  type OxcParsedModule,
} from './oxc.js';

import type { ForgeExportFact, ForgeFileGraph, ForgeFileNode } from './graph.js';

export const DUPLICATE_COMPONENT_TARGET = 'DUPLICATE_COMPONENT_TARGET';

/** A neutral component discovered in the barrel, plus its derived public shape. */
export interface DiscoveredComponent {
  /** The neutral export name, e.g. `ForgeBadge`. */
  neutralName: string;
  /** The public export name, e.g. `Badge`. */
  publicName: string;
  /** The exported props interface name, e.g. `BadgeProperties` (if present). */
  propertiesType: string | undefined;
  /** Every type re-exported alongside the component, e.g. `['BadgeVariant', 'BadgeProperties']`. */
  typeExports: string[];
  /**
   * The folder / file base name the component is authored in, e.g. `forge-badge`.
   * Always the **basename** — used for the flat generated output (`dist/<fw>/forge-badge.js`)
   * and entry re-exports (`./forge-badge`), regardless of source nesting.
   */
  folder: string;
  /**
   * The re-export specifier relative to the barrel, stripped of a leading `./`
   * and any trailing `/index`, preserving nested folders — e.g. `./forge-badge`
   * → `forge-badge`, `./atoms/forge-badge` → `atoms/forge-badge`. The Stage-1
   * generator joins this under `componentsDir` to locate the source `.tsx`.
   */
  sourceDir: string;
  /** The export specifier that identifies the component source module. */
  sourceSpecifier: string;
  /** Canonical source node selected by graph-backed discovery. */
  sourcePath?: string;
}

/** A single `export { … } from '…'` re-export parsed from the barrel. */
interface ReExport {
  /** Value (component) export names. */
  values: string[];
  /** Type export names. */
  types: Set<string>;
  /** The module path the names are re-exported from. */
  from: string;
}

/** Parse raw export specifier tokens into value and type names. */
function parseReExportTokens(specifiersText: string): { values: string[]; types: Set<string> } {
  const values: string[] = [];
  const types = new Set<string>();
  for (const raw of specifiersText.split(',')) {
    const token = raw.trim();
    if (token.startsWith('type ')) {
      types.add(token.slice('type '.length).trim());
    } else if (/^[A-Z]/.test(token)) {
      values.push(token);
    }
  }
  return { values, types };
}

/** Parse every `export { … } from '…'` statement in a barrel module. */
function parseReExports(source: string): ReExport[] {
  const result: ReExport[] = [];
  const reExport = /export\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null = reExport.exec(source);
  while (match !== null) {
    const { values, types } = parseReExportTokens(match[1]);
    result.push({ values, types, from: match[2] });
    match = reExport.exec(source);
  }
  return result;
}

/** The final path segment of a module specifier, e.g. `./forge-badge` → `forge-badge`. */
function moduleBaseName(specifier: string): string {
  const segments = specifier.split('/').filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
  return segments.at(-1) ?? specifier;
}

/**
 * The re-export specifier relative to the barrel, stripped of a leading `./` and
 * any trailing `/index`, preserving nested folders — e.g. `./composables/use-d3`
 * → `composables/use-d3`, `./use-d3` → `use-d3`.
 */
function moduleRelativePath(specifier: string): string {
  const segments = specifier.split('/').filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
  if (segments.length > 1 && segments.at(-1) === 'index') {
    segments.pop();
  }
  return segments.join('/') || (segments.at(-1) ?? specifier);
}

/**
 * Collapse a trailing duplicated path segment, so a file-style component
 * re-export folds onto its containing folder — e.g. `organisms/three-canvas/
 * three-canvas` → `organisms/three-canvas` (the barrel points at the file, not
 * the folder's `index`). A folder-style path (`atoms/forge-badge`) is unchanged.
 */
function stripTrailingDuplicate(relativePath: string): string {
  const segments = relativePath.split('/');
  if (segments.length >= 2 && segments.at(-1) === segments.at(-2)) {
    segments.pop();
  }
  return segments.join('/');
}

/**
 * A non-component **helper module** re-exported from the barrel (e.g. the
 * `toast-store`), so its public API rides through the generated `./react` /
 * `./vue` entry alongside the components.
 */
export interface DiscoveredHelperExport {
  /** The folder / file base name the helper lives in, e.g. `toast-store`. */
  base: string;
  /**
   * The re-export specifier relative to the barrel, **without** the leading
   * `./`, preserving any nested folders — e.g. `composables/use-observable` or
   * `toast-store`. The Stage-1 generator uses this (not {@link base}) to mirror
   * the source `src/` layout (`composables/`, `utils/`, …) into the generated
   * tree so hook libraries follow the same hierarchy as component packages.
   */
  relativePath: string;
  /** Value export bindings (functions/consts), e.g. `useToast`, `showToast`. */
  values: DiscoveredHelperBinding[];
  /** Type export bindings, e.g. `ToastOptions`, `ToastRecord`. */
  types: DiscoveredHelperBinding[];
  /** Canonical source node selected by graph-backed discovery. */
  sourcePath?: string;
}

/** A helper binding's source name and the name exposed by the package barrel. */
export interface DiscoveredHelperBinding {
  localName: string;
  exportedName: string;
  /** Component identifier aliased by this binding (`const Alias = Component`). */
  componentAlias?: string;
}

/** A public barrel export whose source is another package rather than local Forge source. */
export interface DiscoveredExternalExport {
  /** The package or other external module specifier. */
  specifier: string;
  /** The name exposed by the public barrel, or `undefined` for a star export. */
  exportedName: string | undefined;
  /** The source module name when the barrel aliases the export. */
  localName: string | undefined;
  /** Whether the binding is type-only. */
  typeOnly: boolean;
  /** Whether this is an `export *` or `export * as name` declaration. */
  star: boolean;
}

/** Extracts the base module or directory name from a source file path. */
export function sourceBase(filePath: string): string {
  const fileName = path.basename(filePath);
  if (fileName === 'index.ts' || fileName === 'index.tsx' || fileName === 'index.js' || fileName === 'index.jsx') {
    return path.basename(path.dirname(filePath));
  }
  return fileName.replace(/\.d?\w+$/, '');
}

/** Derives a disambiguated folder name for a source path relative to an entry module. */
export function deriveDisambiguatedFolder(entryPath: string, sourcePath: string, base: string): string {
  const entryDir = path.dirname(entryPath);
  const sourceDir = path.dirname(sourcePath);
  const rel = path.relative(entryDir, sourceDir).split(path.sep).join('/');
  return deriveDisambiguatedFolderFromDir(rel, base);
}

/** Derives a disambiguated folder name from a relative directory path and base component name. */
export function deriveDisambiguatedFolderFromDir(relDir: string, base: string): string {
  const segments = relDir.split(/[\\/]/).filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
  if (segments.length >= 1 && segments.at(-1) === base) {
    segments.pop();
  }
  if (segments.length === 0) {
    return base;
  }
  return `${segments.join('-')}-${base}`;
}

/** Computes POSIX relative module path between an entry and a source file path. */
function relativeModulePath(entry: string, sourcePath: string): string {
  const relative = path.relative(path.dirname(entry), path.dirname(sourcePath)).split(path.sep).join('/');
  return relative.length === 0 ? '' : relative;
}

/** Resolve the target node of a module specifier edge in the graph. */
function resolveEdgeTarget(graph: ForgeFileGraph, fromId: string, specifier: string): ForgeFileNode | undefined {
  const edge = graph.edges.find(
    (candidate) =>
      candidate.from === fromId &&
      candidate.specifier === specifier &&
      candidate.resolved &&
      candidate.to !== undefined,
  );
  return edge?.to === undefined ? undefined : graph.nodes.get(edge.to);
}

/** Resolve an export target across wildcard star re-export declarations. */
function resolveStarExportTarget(
  graph: ForgeFileGraph,
  start: ForgeFileNode,
  exportedName: string,
  typeOnly: boolean,
  visited: Set<string>,
): ForgeFileNode | undefined {
  for (const star of start.exports) {
    if (!star.star || star.specifier === undefined) {
      continue;
    }
    const target = resolveEdgeTarget(graph, start.id, star.specifier);
    const resolved =
      target === undefined
        ? undefined
        : graphExportTarget(graph, target, exportedName, typeOnly || star.typeOnly, new Set(visited));
    if (resolved !== undefined) {
      return resolved;
    }
  }
  return undefined;
}

/** Resolves the target node for a specific export fact with a specifier. */
function resolveFactTarget(
  graph: ForgeFileGraph,
  start: ForgeFileNode,
  fact: ForgeExportFact,
  exportedName: string,
  typeOnly: boolean,
  visited: Set<string>,
): ForgeFileNode | undefined {
  if (fact.specifier !== undefined) {
    const target = resolveEdgeTarget(graph, start.id, fact.specifier);
    return target === undefined
      ? undefined
      : graphExportTarget(graph, target, fact.localName ?? exportedName, typeOnly, visited);
  }
  return start;
}

/** Resolves the canonical export target node across module graph re-export edges. */
// skipcq: JS-R1005
function graphExportTarget(
  graph: ForgeFileGraph,
  start: ForgeFileNode,
  exportedName: string,
  typeOnly = false,
  visited = new Set<string>(),
): ForgeFileNode | undefined {
  if (visited.has(start.id)) {
    return undefined;
  }
  visited.add(start.id);

  const fact = start.exports.find(
    (entryExport) => entryExport.typeOnly === typeOnly && entryExport.exportedName === exportedName,
  );
  if (fact !== undefined) {
    return resolveFactTarget(graph, start, fact, exportedName, typeOnly, visited);
  }

  return resolveStarExportTarget(graph, start, exportedName, typeOnly, visited);
}

interface ResolvedGraphExport {
  readonly fact: ForgeExportFact;
  readonly sourceNode: ForgeFileNode | undefined;
}

/** Resolves a single export fact against the graph. */
// skipcq: JS-R1005
function resolveSingleGraphExport(
  graph: ForgeFileGraph,
  node: ForgeFileNode,
  fact: ForgeExportFact,
  inheritedTypeOnly: boolean,
): ResolvedGraphExport {
  const typeOnly = inheritedTypeOnly || fact.typeOnly;
  const target = fact.specifier ? resolveEdgeTarget(graph, node.id, fact.specifier) : undefined;
  const sourceNode = target ? graphExportTarget(graph, node, fact.exportedName ?? '', typeOnly) : undefined;
  return {
    fact: { ...fact, typeOnly },
    sourceNode,
  };
}

/** Resolves export facts for a single node across barrel nodes. */
function resolveNodeExports(
  graph: ForgeFileGraph,
  node: ForgeFileNode,
  inheritedTypeOnly: boolean,
  nextVisited: ReadonlySet<string>,
  resolve: (node: ForgeFileNode, inheritedTypeOnly: boolean, visited: ReadonlySet<string>) => ResolvedGraphExport[],
): ResolvedGraphExport[] {
  const resolved: ResolvedGraphExport[] = [];
  for (const fact of node.exports) {
    if (fact.specifier === undefined) {
      resolved.push({
        fact: { ...fact, typeOnly: inheritedTypeOnly || fact.typeOnly },
        sourceNode: node,
      });
      continue;
    }
    const target = resolveEdgeTarget(graph, node.id, fact.specifier);
    if (fact.star && target !== undefined) {
      resolved.push(...resolve(target, inheritedTypeOnly || fact.typeOnly, nextVisited));
      continue;
    }
    resolved.push(resolveSingleGraphExport(graph, node, fact, inheritedTypeOnly));
  }
  return resolved;
}

/**
 * Expand local `export *` barrels while retaining the public binding names.
 * Named exports are resolved to their canonical source node so callers can
 * distinguish transformed components from neutral helper modules regardless of
 * how many local barrels sit between the package entry and the source.
 */
function resolveGraphExports(graph: ForgeFileGraph, entry: ForgeFileNode): ResolvedGraphExport[] {
  /** Recursively resolves export facts across barrel nodes. */
  // skipcq: JS-R1005
  const resolve = (
    node: ForgeFileNode,
    inheritedTypeOnly: boolean,
    visited: ReadonlySet<string>,
  ): ResolvedGraphExport[] => {
    if (visited.has(node.id)) {
      return [];
    }
    const nextVisited = new Set(visited).add(node.id);
    return resolveNodeExports(graph, node, inheritedTypeOnly, nextVisited, resolve);
  };

  return resolve(entry, false, new Set());
}

/** Resolves the default exported symbol identifier from AST statements. */
function resolveDefaultSymbolName(program: OxcNode): string | undefined {
  for (const statement of oxcProgramBody(program)) {
    if (statement.type === 'ExportDefaultDeclaration') {
      const declaration = oxcObject(statement, 'declaration');
      const id = oxcObject(declaration, 'id');
      const name = oxcIdentifierName(id) ?? oxcIdentifierName(declaration);
      if (name !== undefined) {
        return name;
      }
    }
  }
  return undefined;
}

/** Matches a specifier against an exported symbol name and returns its local identifier. */
function matchSpecifierLocal(spec: OxcNode, exportedName: string): string | undefined {
  const exported = oxcObject(spec, 'exported');
  const exportedIdent =
    oxcIdentifierName(exported) ?? (exported?.type === 'Literal' ? String(exported.value) : undefined);
  if (exportedIdent === exportedName) {
    const local = oxcObject(spec, 'local');
    return oxcIdentifierName(local);
  }
  return undefined;
}

/** Resolves a named exported symbol identifier from AST statements. */
// skipcq: JS-R1005
function resolveNamedSymbolName(program: OxcNode, exportedName: string): string | undefined {
  for (const statement of oxcProgramBody(program)) {
    if (statement.type === 'ExportNamedDeclaration') {
      const specifiers = oxcArray(statement, 'specifiers');
      for (const spec of specifiers) {
        const localIdent = matchSpecifierLocal(spec, exportedName);
        if (localIdent !== undefined) {
          return localIdent;
        }
      }
    }
  }
  return undefined;
}

/** Resolves the local identifier name for an exported symbol in a module program AST. */
function resolveLocalSymbolName(program: OxcNode, exportedName: string): string {
  if (exportedName === 'default') {
    const defaultName = resolveDefaultSymbolName(program);
    if (defaultName !== undefined) {
      return defaultName;
    }
  }
  return resolveNamedSymbolName(program, exportedName) ?? exportedName;
}

const DECLARATION_TYPES_WITH_ID = new Set([
  'FunctionDeclaration',
  'ClassDeclaration',
  'TSInterfaceDeclaration',
  'TSTypeAliasDeclaration',
  'TSEnumDeclaration',
]);

/** Matches a declaration node against a target local symbol name. */
// skipcq: JS-R1005
function matchStatementDeclaration(node: OxcNode, localName: string): OxcNode | undefined {
  if (DECLARATION_TYPES_WITH_ID.has(node.type)) {
    const id = oxcObject(node, 'id');
    return oxcIdentifierName(id) === localName ? node : undefined;
  }
  if (node.type === 'VariableDeclaration') {
    for (const declarator of oxcArray(node, 'declarations')) {
      const id = oxcObject(declarator, 'id');
      if (oxcIdentifierName(id) === localName) {
        return declarator;
      }
    }
  }
  return undefined;
}

/** Matches an export default declaration against a target local symbol name. */
function matchDefaultDeclaration(statement: OxcNode, localName: string): OxcNode | undefined {
  if (statement.type !== 'ExportDefaultDeclaration') {
    return undefined;
  }
  const declaration = oxcObject(statement, 'declaration');
  if (declaration !== undefined) {
    const id = oxcObject(declaration, 'id');
    if (oxcIdentifierName(id) === localName || localName === 'default') {
      return declaration;
    }
  }
  return undefined;
}

/** Find a top-level AST declaration corresponding to a local symbol name. */
// skipcq: JS-R1005
function findDeclaration(program: OxcNode, localName: string): OxcNode | undefined {
  for (const statement of oxcProgramBody(program)) {
    const defaultMatched = matchDefaultDeclaration(statement, localName);
    if (defaultMatched !== undefined) {
      return defaultMatched;
    }
    const unwrapped = oxcUnwrapModuleStatement(statement);
    const matched = matchStatementDeclaration(unwrapped.node, localName);
    if (matched !== undefined) {
      return matched;
    }
  }
  return undefined;
}

const UNWRAP_EXPRESSION_TYPES = new Set([
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSTypeAssertion',
  'TSNonNullExpression',
]);

/** Unwraps parentheses, type assertions, and non-null assertions from an expression. */
// skipcq: JS-R1005
function unwrapExpression(expression: OxcNode | undefined): OxcNode | undefined {
  let current = expression;
  while (current !== undefined && UNWRAP_EXPRESSION_TYPES.has(current.type)) {
    current = oxcObject(current, 'expression');
  }
  return current;
}

/** Safely retrieves or parses an Oxc parsed module from cache or disk. */
function getOrParseModule(sourcePath: string, astCache?: Map<string, OxcParsedModule>): OxcParsedModule | undefined {
  let parsed = astCache?.get(sourcePath);
  if (parsed === undefined) {
    if (!fs.existsSync(sourcePath)) {
      return undefined;
    }
    try {
      const source = fs.readFileSync(sourcePath, 'utf8');
      parsed = parseOxcModule(sourcePath, source);
      astCache?.set(sourcePath, parsed);
    } catch {
      return undefined;
    }
  }
  return parsed;
}

const COMPONENT_FACTORY_CALLEES = new Set(['forwardRef', 'memo', 'createComponent', 'defineComponent']);

/** Check whether a callee represents a known component wrapper or factory. */
function isComponentFactoryCallee(callee: OxcNode | undefined): boolean {
  const calleeName =
    oxcIdentifierName(callee) ??
    (callee?.type === 'MemberExpression' ? oxcIdentifierName(oxcObject(callee, 'property')) : undefined);
  return calleeName !== undefined && COMPONENT_FACTORY_CALLEES.has(calleeName);
}

/** Check whether an initializer expression represents a non-component value. */
function isNonComponentInitializer(init: OxcNode | undefined): boolean {
  if (init === undefined) {
    return true;
  }
  if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
    return false;
  }
  if (init.type === 'CallExpression') {
    return !isComponentFactoryCallee(oxcObject(init, 'callee'));
  }
  return true;
}

const NON_COMPONENT_DECLARATION_TYPES = new Set([
  'ClassDeclaration',
  'TSEnumDeclaration',
  'TSInterfaceDeclaration',
  'TSTypeAliasDeclaration',
]);

/**
 * Check whether a declaration is positively identifiable as a non-component value
 * (such as a createContext call, object literal, constant primitive, class, or type).
 */
// skipcq: JS-R1005
function isNonComponentDeclaration(declaration: OxcNode): boolean {
  if (NON_COMPONENT_DECLARATION_TYPES.has(declaration.type)) {
    return true;
  }
  if (declaration.type === 'VariableDeclarator') {
    const init = unwrapExpression(oxcObject(declaration, 'init'));
    return isNonComponentInitializer(init);
  }
  return false;
}

/** Determine whether an exported symbol represents a UI component rather than a helper or type. */
export function isComponentExport(
  sourcePath: string,
  symbolName: string,
  astCache?: Map<string, OxcParsedModule>,
): boolean {
  if (!/^[A-Z]/.test(symbolName)) {
    return false;
  }
  const parsed = getOrParseModule(sourcePath, astCache);
  if (parsed === undefined) {
    return false;
  }
  const localName = resolveLocalSymbolName(parsed.program, symbolName);
  const declaration = findDeclaration(parsed.program, localName);
  return declaration === undefined ? true : !isNonComponentDeclaration(declaration);
}

/** Resolve a simple identifier alias declared in a source module. */
function componentAliasTarget(
  sourcePath: string,
  symbolName: string,
  astCache: Map<string, OxcParsedModule>,
): string | undefined {
  const parsed = getOrParseModule(sourcePath, astCache);
  if (parsed === undefined) {
    return undefined;
  }
  const localName = resolveLocalSymbolName(parsed.program, symbolName);
  const declaration = findDeclaration(parsed.program, localName);
  if (declaration?.type !== 'VariableDeclarator') {
    return undefined;
  }
  const initializer = unwrapExpression(oxcObject(declaration, 'init'));
  return oxcIdentifierName(initializer);
}

/** Check whether a candidate type name matches one of the discovered helper names. */
function isHelperTypeName(name: string, helperExportNames: ReadonlySet<string>): boolean {
  if (helperExportNames.size === 0) {
    return false;
  }
  for (const helperName of helperExportNames) {
    if (name === helperName || name.startsWith(helperName)) {
      return true;
    }
  }
  return false;
}

/** Collects type exports from entry barrel matching the target component or source node. */
function collectEntryTypeExports(
  graph: ForgeFileGraph,
  entry: ForgeFileNode,
  sourceNode: ForgeFileNode,
  componentSpecifier: string | undefined,
  helperExportNames: ReadonlySet<string>,
  names: Set<string>,
): void {
  for (const entryExport of entry.exports) {
    if (!entryExport.typeOnly || entryExport.exportedName === undefined || entryExport.specifier === undefined) {
      continue;
    }
    if (isHelperTypeName(entryExport.exportedName, helperExportNames)) {
      continue;
    }
    if (componentSpecifier !== undefined && entryExport.specifier === componentSpecifier) {
      names.add(entryExport.exportedName);
      continue;
    }
    const target = resolveEdgeTarget(graph, entry.id, entryExport.specifier);
    if (target?.id === sourceNode.id) {
      names.add(entryExport.exportedName);
    }
  }
}

/** Collects type exports directly declared on the source node. */
function collectSourceTypeExports(
  sourceNode: ForgeFileNode,
  helperExportNames: ReadonlySet<string>,
  names: Set<string>,
): void {
  for (const sourceExport of sourceNode.exports) {
    if (
      sourceExport.typeOnly &&
      sourceExport.exportedName !== undefined &&
      !isHelperTypeName(sourceExport.exportedName, helperExportNames)
    ) {
      names.add(sourceExport.exportedName);
    }
  }
}

/** Resolves all type exports related to a component from the entry barrel and source node. */
// skipcq: JS-R1005
function graphTypeExports(
  graph: ForgeFileGraph,
  entry: ForgeFileNode,
  sourceNode: ForgeFileNode,
  componentSpecifier: string | undefined,
  helperExportNames: ReadonlySet<string> = new Set(),
): string[] {
  const names = new Set<string>();
  collectEntryTypeExports(graph, entry, sourceNode, componentSpecifier, helperExportNames, names);
  collectSourceTypeExports(sourceNode, helperExportNames, names);
  return [...names];
}

const graphComponentCache = new WeakMap<ForgeFileGraph, DiscoveredComponent[]>();
const graphHelperCache = new WeakMap<ForgeFileGraph, DiscoveredHelperExport[]>();

/** Derives the neutral export name of a component from its node and entry export fact. */
function deriveNeutralName(sourceNode: ForgeFileNode, entryExport: ForgeExportFact): string {
  const targetName = entryExport.localName ?? entryExport.exportedName;
  const match = sourceNode.exports.find(
    (sourceExport) => !sourceExport.typeOnly && sourceExport.exportedName === targetName,
  );
  return match?.exportedName ?? targetName ?? '';
}

/** Derives the public component name by removing the strip prefix. */
function derivePublicName(
  exportedName: string | undefined,
  localName: string | undefined,
  neutralName: string,
  stripPrefix: string,
): string {
  const base = exportedName !== undefined && localName !== undefined ? exportedName : neutralName;
  return base.startsWith(stripPrefix) ? base.slice(stripPrefix.length) : base;
}

/** Collects all non-component exported names from a source node. */
function extractHelperExportNames(sourceNode: ForgeFileNode, astCache: Map<string, OxcParsedModule>): Set<string> {
  const helperExportNames = new Set<string>();
  for (const sourceExport of sourceNode.exports) {
    if (
      !sourceExport.typeOnly &&
      sourceExport.exportedName !== undefined &&
      !isComponentExport(sourceNode.id, sourceExport.exportedName, astCache)
    ) {
      helperExportNames.add(sourceExport.exportedName);
    }
  }
  return helperExportNames;
}

/** Validates whether an export fact represents an exported component node. */
function findComponentSourceNode(resolvedExport: ResolvedGraphExport): ForgeFileNode | undefined {
  const entryExport = resolvedExport.fact;
  if (entryExport.typeOnly || !entryExport.exportedName) return undefined;
  const sourceNode = resolvedExport.sourceNode;
  if (!sourceNode || sourceNode.kind !== 'component') return undefined;
  return sourceNode;
}

/** Formats a relative module specifier from the graph entry to a source file. */
function deriveSourceSpecifier(graphEntry: string, sourcePath: string, specifier?: string): string {
  if (specifier) return specifier;
  const relative = path.relative(path.dirname(graphEntry), sourcePath).split(path.sep).join('/');
  return `./${relative}`;
}

/** Check whether an AST node is an arrow function or function expression. */
function isFunctionExpression(node: OxcNode | undefined): boolean {
  return node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression';
}

/** Extracts a function node from a variable initializer expression. */
function extractFunctionFromInit(init: OxcNode | undefined): OxcNode | undefined {
  if (init === undefined) return undefined;
  if (isFunctionExpression(init)) return init;
  if (init.type === 'CallExpression') {
    return oxcArray(init, 'arguments').find((arg) => isFunctionExpression(arg));
  }
  return undefined;
}

/** Extracts a function node from an AST declaration. */
// skipcq: JS-R1005
function extractFunctionNode(declaration: OxcNode): OxcNode | undefined {
  if (declaration.type === 'FunctionDeclaration') {
    return declaration;
  }
  if (declaration.type === 'VariableDeclarator') {
    return extractFunctionFromInit(unwrapExpression(oxcObject(declaration, 'init')));
  }
  return undefined;
}

/** Extracts the type annotation from a parameter node. */
function extractParamTypeAnnotation(param: OxcNode): OxcNode | undefined {
  const direct = oxcObject(param, 'typeAnnotation');
  if (direct !== undefined) return direct;
  const pattern = oxcObject(param, 'pattern') ?? oxcObject(param, 'argument');
  return pattern ? oxcObject(pattern, 'typeAnnotation') : undefined;
}

/** Extracts the first parameter type annotation from a function node. */
// skipcq: JS-R1005
function extractFirstParameterTypeAnnotation(fn: OxcNode): OxcNode | undefined {
  const paramsNode = oxcObject(fn, 'params');
  const items = paramsNode ? oxcArray(paramsNode, 'items') : [];
  const firstParam = items[0] ?? oxcArray(fn, 'params')[0];
  return firstParam === undefined ? undefined : extractParamTypeAnnotation(firstParam);
}

/** Extracts the props interface identifier from a type annotation node. */
function parsePropsTypeIdentifier(typeAnnotation: OxcNode, source: string): string | undefined {
  const rawText = oxcNodeText(source, typeAnnotation).trim().replace(/^:\s*/, '');
  const readonlyMatch = /^Readonly<\s*([A-Za-z0-9_]+)\s*>$/.exec(rawText);
  if (readonlyMatch !== null) {
    return readonlyMatch[1];
  }
  const identMatch = /^[A-Za-z0-9_]+$/.exec(rawText);
  return identMatch ? identMatch[0] : undefined;
}

/** Extracts the props type identifier from a component's AST declaration. */
function extractPropsTypeFromAst(
  sourcePath: string,
  neutralName: string,
  astCache: Map<string, OxcParsedModule>,
): string | undefined {
  const parsed = getOrParseModule(sourcePath, astCache);
  if (parsed === undefined) {
    return undefined;
  }

  const localName = resolveLocalSymbolName(parsed.program, neutralName);
  const declaration = findDeclaration(parsed.program, localName);
  if (declaration === undefined) {
    return undefined;
  }

  const fn = extractFunctionNode(declaration);
  if (fn === undefined) {
    return undefined;
  }

  const typeAnnotation = extractFirstParameterTypeAnnotation(fn);
  return typeAnnotation ? parsePropsTypeIdentifier(typeAnnotation, parsed.source) : undefined;
}

/** Builds candidate props type names for a component. */
function buildCandidatePropertiesNames(publicName: string, neutralName: string): string[] {
  const baseName = publicName.replace(/^Forge/, '');
  const neutralBase = neutralName.replace(/^Forge/, '');
  return [
    `${baseName}Properties`,
    `${neutralBase}Properties`,
    `${publicName}Properties`,
    `${neutralName}Properties`,
    `Forge${baseName}Properties`,
    `Forge${neutralBase}Properties`,
    `${baseName}Props`,
    `${neutralBase}Props`,
    `${publicName}Props`,
    `${neutralName}Props`,
    `Forge${baseName}Props`,
    `Forge${neutralBase}Props`,
  ];
}

/** Matches fallback props type names when explicit candidates are not found. */
function matchFallbackPropertiesType(typeExports: string[], baseName: string, neutralBase: string): string | undefined {
  const propTypes = typeExports.filter(
    (t) =>
      (t.endsWith('Properties') || t.endsWith('Props')) &&
      !t.endsWith('StyleProperties') &&
      !t.endsWith('CSSProperties') &&
      !t.endsWith('StyleProps'),
  );
  if (propTypes.length === 1) {
    return propTypes[0];
  }
  if (propTypes.length > 1) {
    const match = propTypes.find(
      (t) => t.toLowerCase().includes(baseName.toLowerCase()) || t.toLowerCase().includes(neutralBase.toLowerCase()),
    );
    return match ?? propTypes[0];
  }
  return undefined;
}

/** Resolves the properties type for a component using conventions and AST inspection. */
function findComponentPropertiesType(
  publicName: string,
  neutralName: string,
  typeExports: string[],
  sourcePath: string,
  astCache: Map<string, OxcParsedModule>,
): string | undefined {
  const candidates = buildCandidatePropertiesNames(publicName, neutralName);
  const matchedCandidate = candidates.find((cand) => typeExports.includes(cand));
  if (matchedCandidate !== undefined) {
    return matchedCandidate;
  }

  const baseName = publicName.replace(/^Forge/, '');
  const neutralBase = neutralName.replace(/^Forge/, '');
  const fallback = matchFallbackPropertiesType(typeExports, baseName, neutralBase);
  if (fallback !== undefined) {
    return fallback;
  }

  const astPropsType = extractPropsTypeFromAst(sourcePath, neutralName, astCache);
  if (astPropsType !== undefined) {
    if (!typeExports.includes(astPropsType)) {
      typeExports.push(astPropsType);
    }
    return astPropsType;
  }

  return undefined;
}

/** Resolves a single graph export into a DiscoveredComponent when it represents a component. */
function resolveDiscoveredComponent(
  graph: ForgeFileGraph,
  entry: ForgeFileNode,
  resolvedExport: ResolvedGraphExport,
  stripPrefix: string,
  astCache: Map<string, OxcParsedModule>,
): DiscoveredComponent | undefined {
  const sourceNode = findComponentSourceNode(resolvedExport);
  if (!sourceNode) return undefined;

  const entryExport = resolvedExport.fact;
  const neutralName = deriveNeutralName(sourceNode, entryExport);
  if (!isComponentExport(sourceNode.id, neutralName, astCache)) return undefined;

  const publicName = derivePublicName(entryExport.exportedName, entryExport.localName, neutralName, stripPrefix);
  const helperExportNames = extractHelperExportNames(sourceNode, astCache);
  const typeExports = graphTypeExports(graph, entry, sourceNode, entryExport.specifier, helperExportNames);
  const propertiesType = findComponentPropertiesType(publicName, neutralName, typeExports, sourceNode.id, astCache);
  const sourceSpecifier = deriveSourceSpecifier(graph.entry, sourceNode.id, entryExport.specifier);
  return {
    neutralName,
    publicName,
    propertiesType,
    typeExports,
    folder: sourceBase(sourceNode.id),
    sourceDir: relativeModulePath(graph.entry, sourceNode.id),
    sourceSpecifier,
    sourcePath: sourceNode.id,
  };
}

/** Groups discovered components by their folder basename. */
function groupComponentsByFolder(components: readonly DiscoveredComponent[]): Map<string, DiscoveredComponent[]> {
  const componentsByFolder = new Map<string, DiscoveredComponent[]>();
  for (const component of components) {
    const list = componentsByFolder.get(component.folder);
    if (list === undefined) {
      componentsByFolder.set(component.folder, [component]);
    } else {
      list.push(component);
    }
  }
  return componentsByFolder;
}

/** Disambiguates folder names within a collision group. */
function disambiguateFolderGroup(group: readonly DiscoveredComponent[], folder: string, entryPath: string): void {
  const uniqueSources = new Set(group.map((c) => c.sourcePath ?? c.sourceSpecifier));
  if (uniqueSources.size <= 1) return;
  for (const component of group) {
    component.folder =
      component.sourcePath !== undefined
        ? deriveDisambiguatedFolder(entryPath, component.sourcePath, folder)
        : deriveDisambiguatedFolderFromDir(component.sourceDir, folder);
  }
}

/** Disambiguates folder basenames when multiple components share the same folder name. */
function disambiguateComponentFolders(components: readonly DiscoveredComponent[], entryPath: string): void {
  const componentsByFolder = groupComponentsByFolder(components);
  for (const [folder, group] of componentsByFolder) {
    disambiguateFolderGroup(group, folder, entryPath);
  }
}

/** Returns a stable path or specifier identifier for a discovered component. */
function componentKey(component: DiscoveredComponent): string {
  return component.sourcePath ?? component.sourceSpecifier;
}

/** Constructs a CompilerDiagnostic for a duplicate target folder collision. */
function buildDuplicateTargetDiagnostic(
  component: DiscoveredComponent,
  existing: DiscoveredComponent,
  entryPath: string,
): CompilerDiagnostic {
  const currentKey = componentKey(component);
  const existingKey = componentKey(existing);
  const relatedFiles = existing.sourcePath ? [existing.sourcePath] : undefined;
  return createCompilerDiagnostic({
    phase: 'generation',
    severity: 'error',
    code: DUPLICATE_COMPONENT_TARGET,
    message: `Duplicate component target "${component.folder}" detected for "${component.neutralName}" (${currentKey}) and "${existing.neutralName}" (${existingKey}).`,
    fileName: component.sourcePath ?? entryPath,
    relatedFiles,
  });
}

/** Records a diagnostic if two components produce conflicting target folders. */
function recordDuplicateTargetDiagnostic(
  component: DiscoveredComponent,
  existing: DiscoveredComponent,
  entryPath: string,
  diagnostics?: CompilerDiagnostic[],
): void {
  if (componentKey(existing) === componentKey(component)) return;
  const diagnostic = buildDuplicateTargetDiagnostic(component, existing, entryPath);
  diagnostics?.push(diagnostic);
  throwOnCompilerErrors([diagnostic]);
}

/** Verifies that target folders are unique across distinct source components. */
function validateUniqueComponentFolders(
  components: readonly DiscoveredComponent[],
  entryPath: string,
  diagnostics?: CompilerDiagnostic[],
): void {
  const targetFolders = new Map<string, DiscoveredComponent>();
  for (const component of components) {
    const existing = targetFolders.get(component.folder);
    if (existing !== undefined) {
      recordDuplicateTargetDiagnostic(component, existing, entryPath, diagnostics);
    } else {
      targetFolders.set(component.folder, component);
    }
  }
}

/** Collects discovered component exports from the graph entry and ast cache. */
function discoverGraphComponents(graph: ForgeFileGraph, stripPrefix: string): DiscoveredComponent[] {
  const entry = graph.nodes.get(graph.entry);
  if (entry === undefined) {
    return [];
  }
  const astCache = new Map<string, OxcParsedModule>();
  const exports = resolveGraphExports(graph, entry);
  const components: DiscoveredComponent[] = [];
  for (const resolvedExport of exports) {
    const component = resolveDiscoveredComponent(graph, entry, resolvedExport, stripPrefix, astCache);
    if (component !== undefined) {
      components.push(component);
    }
  }
  return components;
}

/** Project public component exports from the canonical graph while retaining the legacy result shape. */
export function discoverComponentsFromGraph(
  graph: ForgeFileGraph,
  stripPrefix = 'Forge',
  diagnostics?: CompilerDiagnostic[],
): DiscoveredComponent[] {
  const useCache = stripPrefix === 'Forge' && diagnostics === undefined;
  if (useCache) {
    const cached = graphComponentCache.get(graph);
    if (cached !== undefined) {
      return cached;
    }
  }

  const components = discoverGraphComponents(graph, stripPrefix);
  disambiguateComponentFolders(components, graph.entry);
  validateUniqueComponentFolders(components, graph.entry, diagnostics);

  if (useCache) {
    graphComponentCache.set(graph, components);
  }

  return components;
}

/** Derives a helper module's path relative to the graph entry directory. */
function deriveHelperRelativePath(sourceRelativePath: string, entryDirectory: string): string {
  const stripped = sourceRelativePath.replace(/\.(?:d\.ts|d\.mts|d\.cts|[cm]?[jt]sx?)$/, '').replace(/\/index$/, '');
  return stripped.startsWith(`${entryDirectory}/`) ? stripped.slice(entryDirectory.length + 1) : stripped;
}

/** Determines if a candidate export is part of component exports or existing types. */
function isHelperExportExcluded(
  sourceNode: ForgeFileNode,
  exportedName: string,
  localName: string,
  isType: boolean,
  componentNames: ReadonlySet<string>,
  componentTypes: ReadonlySet<string>,
  astCache: Map<string, OxcParsedModule>,
): boolean {
  if (isType) {
    return componentTypes.has(exportedName);
  }
  if (componentNames.has(exportedName) || componentNames.has(localName)) {
    return true;
  }
  return sourceNode.kind === 'component' && isComponentExport(sourceNode.id, localName, astCache);
}

/** Appends a helper binding to the helper record if not already recorded. */
function appendHelperBinding(helper: DiscoveredHelperExport, binding: DiscoveredHelperBinding, isType: boolean): void {
  const targetList = isType ? helper.types : helper.values;
  if (!targetList.some((existing) => existing.exportedName === binding.exportedName)) {
    targetList.push(binding);
  }
}

/** Collects or creates a DiscoveredHelperExport entry in the helper map. */
function getOrCreateHelperEntry(
  helpers: Map<string, DiscoveredHelperExport>,
  sourceNode: ForgeFileNode,
  entryDirectory: string,
): DiscoveredHelperExport {
  let helper = helpers.get(sourceNode.id);
  if (helper === undefined) {
    helper = {
      base: sourceBase(sourceNode.id),
      relativePath: deriveHelperRelativePath(sourceNode.sourceRelativePath, entryDirectory),
      values: [],
      types: [],
      sourcePath: sourceNode.id,
    };
    helpers.set(sourceNode.id, helper);
  }
  return helper;
}

/** Collects public component names and type export names from discovered components. */
function collectComponentTypesAndNames(components: readonly DiscoveredComponent[]) {
  const componentNames = new Set(components.flatMap((c) => [c.neutralName, c.publicName]));
  const componentTypes = new Set<string>();
  for (const component of components) {
    if (component.propertiesType) componentTypes.add(component.propertiesType);
    for (const typeName of component.typeExports ?? []) componentTypes.add(typeName);
  }
  return { componentNames, componentTypes };
}

/** Determines if an export fact represents a type-only export. */
function isTypeExport(entryExport: ForgeExportFact, sourceNode: ForgeFileNode, localName: string): boolean {
  if (entryExport.typeOnly) return true;
  const matched = sourceNode.exports.find((e) => e.exportedName === localName);
  return matched?.typeOnly === true;
}

/** Constructs a helper binding with optional component alias target. */
function buildHelperBinding(
  localName: string,
  exportedName: string,
  isType: boolean,
  sourceNodeId: string,
  astCache: Map<string, OxcParsedModule>,
): DiscoveredHelperBinding {
  const componentAlias = isType ? undefined : componentAliasTarget(sourceNodeId, localName, astCache);
  return { localName, exportedName, componentAlias };
}

/** Validates that a resolved export belongs to a valid non-entry source node. */
function isValidHelperSourceNode(sourceNode: ForgeFileNode | undefined, entryId: string): sourceNode is ForgeFileNode {
  return sourceNode !== undefined && sourceNode.id !== entryId;
}

/** Processes a single resolved graph export and registers helper bindings. */
function processGraphHelperExport(
  resolvedExport: ResolvedGraphExport,
  entry: ForgeFileNode,
  entryDirectory: string,
  helpers: Map<string, DiscoveredHelperExport>,
  componentNames: ReadonlySet<string>,
  componentTypes: ReadonlySet<string>,
  astCache: Map<string, OxcParsedModule>,
): void {
  const entryExport = resolvedExport.fact;
  const exportedName = entryExport.exportedName;
  if (exportedName === undefined) return;
  const sourceNode = resolvedExport.sourceNode;
  if (!isValidHelperSourceNode(sourceNode, entry.id)) return;

  const localName = entryExport.localName ?? exportedName;
  const isType = isTypeExport(entryExport, sourceNode, localName);
  if (isHelperExportExcluded(sourceNode, exportedName, localName, isType, componentNames, componentTypes, astCache)) {
    return;
  }

  const helper = getOrCreateHelperEntry(helpers, sourceNode, entryDirectory);
  const binding = buildHelperBinding(localName, exportedName, isType, sourceNode.id, astCache);
  appendHelperBinding(helper, binding, isType);
}

/** Retrieves cached helper exports if explicit components were not provided. */
function getCachedHelperExports(
  graph: ForgeFileGraph,
  discoveredComponents?: readonly DiscoveredComponent[],
): DiscoveredHelperExport[] | undefined {
  return discoveredComponents === undefined ? graphHelperCache.get(graph) : undefined;
}

/** Resolves the discovered components, falling back to graph discovery if omitted. */
function resolveDiscoveredComponents(
  graph: ForgeFileGraph,
  discoveredComponents?: readonly DiscoveredComponent[],
): readonly DiscoveredComponent[] {
  return discoveredComponents ?? discoverComponentsFromGraph(graph);
}

/** Collects non-component helper exports from the resolved graph exports. */
function collectGraphHelperExports(
  graph: ForgeFileGraph,
  entry: ForgeFileNode,
  components: readonly DiscoveredComponent[],
): DiscoveredHelperExport[] {
  const { componentNames, componentTypes } = collectComponentTypesAndNames(components);
  const astCache = new Map<string, OxcParsedModule>();
  const helpers = new Map<string, DiscoveredHelperExport>();
  const entryDirectory = entry.sourceRelativePath.replace(/\/[^/]+$/, '');

  for (const resolvedExport of resolveGraphExports(graph, entry)) {
    processGraphHelperExport(resolvedExport, entry, entryDirectory, helpers, componentNames, componentTypes, astCache);
  }
  return [...helpers.values()];
}

/** Project non-component public exports from the canonical graph. */
export function discoverHelperExportsFromGraph(
  graph: ForgeFileGraph,
  componentFolders: ReadonlySet<string>,
  discoveredComponents?: readonly DiscoveredComponent[],
): DiscoveredHelperExport[] {
  const cached = getCachedHelperExports(graph, discoveredComponents);
  if (cached !== undefined) return cached;

  const entry = graph.nodes.get(graph.entry);
  if (entry === undefined) return [];

  const components = resolveDiscoveredComponents(graph, discoveredComponents);
  const result = collectGraphHelperExports(graph, entry, components);
  if (discoveredComponents === undefined) {
    graphHelperCache.set(graph, result);
  }
  return result;
}

/** Discover external re-exports through local barrels so generated entries preserve the package public API. */
export function discoverExternalExportsFromGraph(graph: ForgeFileGraph): DiscoveredExternalExport[] {
  const entry = graph.nodes.get(graph.entry);
  if (entry === undefined) {
    return [];
  }
  return resolveGraphExports(graph, entry).flatMap(({ fact: entryExport }) => {
    if (entryExport.specifier === undefined || entryExport.specifier.startsWith('.')) {
      return [];
    }
    const external = graph.edges.some((edge) => edge.specifier === entryExport.specifier && edge.external === true);
    if (!external) {
      return [];
    }
    return [
      {
        specifier: entryExport.specifier,
        exportedName: entryExport.exportedName,
        localName: entryExport.localName,
        typeOnly: entryExport.typeOnly,
        star: entryExport.star,
      },
    ];
  });
}

/**
 * Discover the **helper modules** a barrel re-exports — every `export { … }
 * from './…'` statement whose module base name is **not** one of the discovered
 * component folders. Used to forward shared framework-agnostic APIs (such as the
 * `toast-store`'s imperative `useToast`/`showToast`/… helpers, the counterpart
 * of the Vue package's `useToast` composable) through the generated entry, so
 * consumers drive the very same per-framework singleton the components use.
 */
export function discoverHelperExports(
  barrelSource: string,
  componentFolders: ReadonlySet<string>,
): DiscoveredHelperExport[] {
  const helpers: DiscoveredHelperExport[] = [];
  for (const reExport of parseReExports(barrelSource)) {
    const base = moduleBaseName(reExport.from);
    if (componentFolders.has(base)) {
      continue;
    }
    // `parseReExports` keeps only PascalCase value names (components); a helper
    // module's value exports are typically lowercase functions/consts, so
    // re-scan the statement to collect every non-type token as a value export.
    const values = collectHelperValues(barrelSource, reExport.from);
    const types = [...reExport.types].map((type) => parseHelperBinding(type));
    if (values.length > 0 || types.length > 0) {
      helpers.push({ base, relativePath: moduleRelativePath(reExport.from), values, types });
    }
  }
  return helpers;
}

/** Re-scan a barrel for the value (non-type) names a given module is re-exported under. */
function collectHelperValues(barrelSource: string, from: string): DiscoveredHelperBinding[] {
  const escaped = from.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const statement = new RegExp(String.raw`export\s*\{([^}]*)\}\s*from\s*['"]${escaped}['"]`);
  const match = statement.exec(barrelSource);
  if (match === null) {
    return [];
  }
  const values: DiscoveredHelperBinding[] = [];
  for (const raw of match[1].split(',')) {
    const token = raw.trim();
    if (token.length === 0 || token.startsWith('type ')) {
      continue;
    }
    values.push(parseHelperBinding(token));
  }
  return values;
}

/** Parse a local/exported binding pair from an export-list token. */
function parseHelperBinding(token: string): DiscoveredHelperBinding {
  const [localName, exportedName] = token.split(/\s+as\s+/).map((name) => name.trim());
  return { localName, exportedName: exportedName ?? localName };
}

/** Matches the properties interface name from candidate type exports. */
function matchComponentPropertiesType(publicName: string, neutralName: string, types: Set<string>): string | undefined {
  const candidates = buildCandidatePropertiesNames(publicName, neutralName);
  const matched = candidates.find((c) => types.has(c));
  return (
    matched ??
    [...types].find(
      (t) =>
        (t.endsWith('Properties') || t.endsWith('Props')) &&
        !t.endsWith('StyleProperties') &&
        !t.endsWith('CSSProperties') &&
        !t.endsWith('StyleProps'),
    )
  );
}

/** Disambiguate folder basenames for colliding components from distinct source directories. */
// skipcq: JS-R1005
function disambiguateCollidingFolders(components: DiscoveredComponent[]): void {
  const componentsByFolder = groupComponentsByFolder(components);
  for (const [folder, group] of componentsByFolder) {
    const uniqueSources = new Set(group.map((c) => c.sourceSpecifier));
    if (uniqueSources.size <= 1) {
      continue;
    }
    for (const component of group) {
      component.folder = deriveDisambiguatedFolderFromDir(component.sourceDir, folder);
    }
  }
}

/** Validates that each target folder name uniquely maps to a single source specifier. */
function validateTargetFolderUniqueness(components: DiscoveredComponent[]): void {
  const targetFolders = new Map<string, DiscoveredComponent>();
  for (const component of components) {
    const existing = targetFolders.get(component.folder);
    if (existing !== undefined && existing.sourceSpecifier !== component.sourceSpecifier) {
      const diagnostic = createCompilerDiagnostic({
        phase: 'generation',
        severity: 'error',
        code: DUPLICATE_COMPONENT_TARGET,
        message: `Duplicate component target "${component.folder}" detected for "${component.neutralName}" (${component.sourceSpecifier}) and "${existing.neutralName}" (${existing.sourceSpecifier}).`,
        fileName: component.sourceSpecifier,
        relatedFiles: [existing.sourceSpecifier],
      });
      throwOnCompilerErrors([diagnostic]);
    }
    targetFolders.set(component.folder, component);
  }
}

/**
 * Discover the components a barrel exports and derive their public shape. Each
 * value export is paired with the props interface re-exported from the same
 * statement (by the `<PublicName>Properties` convention) and the folder it lives
 * in (the re-export's module base name).
 */
export function discoverComponents(barrelSource: string, stripPrefix = 'Forge'): DiscoveredComponent[] {
  const components: DiscoveredComponent[] = [];
  for (const reExport of parseReExports(barrelSource)) {
    const folder = moduleBaseName(reExport.from);
    const sourceDir = stripTrailingDuplicate(moduleRelativePath(reExport.from));
    for (const neutralName of reExport.values) {
      const publicName = neutralName.startsWith(stripPrefix) ? neutralName.slice(stripPrefix.length) : neutralName;
      const propertiesType = matchComponentPropertiesType(publicName, neutralName, reExport.types);
      components.push({
        neutralName,
        publicName,
        propertiesType,
        typeExports: [...reExport.types],
        folder,
        sourceDir,
        sourceSpecifier: reExport.from,
      });
    }
  }

  disambiguateCollidingFolders(components);
  validateTargetFolderUniqueness(components);

  return components;
}

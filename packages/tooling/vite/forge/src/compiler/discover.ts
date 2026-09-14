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

/** Parse every `export { … } from '…'` statement in a barrel module. */
function parseReExports(source: string): ReExport[] {
  const result: ReExport[] = [];
  const reExport = /export\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null = reExport.exec(source);
  while (match !== null) {
    const values: string[] = [];
    const types = new Set<string>();
    for (const raw of match[1].split(',')) {
      const token = raw.trim();
      if (token.length === 0) {
        continue;
      }
      if (token.startsWith('type ')) {
        types.add(token.slice('type '.length).trim());
      } else if (/^[A-Z]/.test(token)) {
        values.push(token);
      }
    }
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

export function sourceBase(filePath: string): string {
  const fileName = path.basename(filePath);
  if (fileName === 'index.ts' || fileName === 'index.tsx' || fileName === 'index.js' || fileName === 'index.jsx') {
    return path.basename(path.dirname(filePath));
  }
  return fileName.replace(/\.d?\w+$/, '');
}

export function deriveDisambiguatedFolder(entryPath: string, sourcePath: string, base: string): string {
  const entryDir = path.dirname(entryPath);
  const sourceDir = path.dirname(sourcePath);
  const rel = path.relative(entryDir, sourceDir).split(path.sep).join('/');
  return deriveDisambiguatedFolderFromDir(rel, base);
}

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

function relativeModulePath(entry: string, sourcePath: string): string {
  const relative = path.relative(path.dirname(entry), path.dirname(sourcePath)).split(path.sep).join('/');
  return relative.length === 0 ? '' : relative;
}

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
  if (fact?.specifier !== undefined) {
    const targetId = graph.edges.find(
      (edge) => edge.from === start.id && edge.specifier === fact.specifier && edge.resolved && edge.to !== undefined,
    )?.to;
    const target = targetId === undefined ? undefined : graph.nodes.get(targetId);
    return target === undefined
      ? undefined
      : graphExportTarget(graph, target, fact.localName ?? exportedName, typeOnly, visited);
  }
  if (fact !== undefined) {
    return start;
  }

  for (const star of start.exports.filter((entryExport) => entryExport.star)) {
    if (star.specifier === undefined) {
      continue;
    }
    const targetId = graph.edges.find(
      (edge) => edge.from === start.id && edge.specifier === star.specifier && edge.resolved && edge.to !== undefined,
    )?.to;
    const target = targetId === undefined ? undefined : graph.nodes.get(targetId);
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

interface ResolvedGraphExport {
  readonly fact: ForgeExportFact;
  readonly sourceNode: ForgeFileNode | undefined;
}

/**
 * Expand local `export *` barrels while retaining the public binding names.
 * Named exports are resolved to their canonical source node so callers can
 * distinguish transformed components from neutral helper modules regardless of
 * how many local barrels sit between the package entry and the source.
 */
function resolveGraphExports(graph: ForgeFileGraph, entry: ForgeFileNode): ResolvedGraphExport[] {
  const resolve = (
    node: ForgeFileNode,
    inheritedTypeOnly: boolean,
    visited: ReadonlySet<string>,
  ): ResolvedGraphExport[] => {
    if (visited.has(node.id)) {
      return [];
    }
    const nextVisited = new Set(visited).add(node.id);
    const resolved: ResolvedGraphExport[] = [];
    for (const fact of node.exports) {
      if (fact.specifier === undefined) {
        resolved.push({
          fact: { ...fact, typeOnly: inheritedTypeOnly || fact.typeOnly },
          sourceNode: node,
        });
        continue;
      }
      const edge = graph.edges.find(
        (candidate) =>
          candidate.from === node.id &&
          candidate.specifier === fact.specifier &&
          candidate.resolved &&
          candidate.to !== undefined,
      );
      const target = edge?.to === undefined ? undefined : graph.nodes.get(edge.to);
      if (fact.star && target !== undefined) {
        resolved.push(...resolve(target, inheritedTypeOnly || fact.typeOnly, nextVisited));
        continue;
      }
      resolved.push({
        fact: { ...fact, typeOnly: inheritedTypeOnly || fact.typeOnly },
        sourceNode:
          target === undefined
            ? undefined
            : graphExportTarget(graph, node, fact.exportedName ?? '', inheritedTypeOnly || fact.typeOnly),
      });
    }
    return resolved;
  };

  return resolve(entry, false, new Set());
}

function resolveLocalSymbolName(program: OxcNode, exportedName: string): string {
  if (exportedName === 'default') {
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
  }
  for (const statement of oxcProgramBody(program)) {
    if (statement.type === 'ExportNamedDeclaration') {
      const specifiers = oxcArray(statement, 'specifiers');
      for (const spec of specifiers) {
        const exported = oxcObject(spec, 'exported');
        const local = oxcObject(spec, 'local');
        const exportedIdent =
          oxcIdentifierName(exported) ?? (exported?.type === 'Literal' ? String(exported.value) : undefined);
        if (exportedIdent === exportedName) {
          const localIdent = oxcIdentifierName(local);
          if (localIdent !== undefined) {
            return localIdent;
          }
        }
      }
    }
  }
  return exportedName;
}

function findDeclaration(program: OxcNode, localName: string): OxcNode | undefined {
  for (const statement of oxcProgramBody(program)) {
    if (statement.type === 'ExportDefaultDeclaration') {
      const declaration = oxcObject(statement, 'declaration');
      if (declaration !== undefined) {
        const id = oxcObject(declaration, 'id');
        if (oxcIdentifierName(id) === localName || localName === 'default') {
          return declaration;
        }
      }
    }
    const unwrapped = oxcUnwrapModuleStatement(statement);
    const node = unwrapped.node;
    switch (node.type) {
      case 'FunctionDeclaration': {
        const id = oxcObject(node, 'id');
        if (oxcIdentifierName(id) === localName) {
          return node;
        }
        break;
      }
      case 'VariableDeclaration': {
        for (const declarator of oxcArray(node, 'declarations')) {
          const id = oxcObject(declarator, 'id');
          if (oxcIdentifierName(id) === localName) {
            return declarator;
          }
        }
        break;
      }
      case 'ClassDeclaration': {
        const id = oxcObject(node, 'id');
        if (oxcIdentifierName(id) === localName) {
          return node;
        }
        break;
      }
      case 'TSInterfaceDeclaration':
      case 'TSTypeAliasDeclaration':
      case 'TSEnumDeclaration': {
        const id = oxcObject(node, 'id');
        if (oxcIdentifierName(id) === localName) {
          return node;
        }
        break;
      }
    }
  }
  return undefined;
}

/**
 * Check whether a declaration is positively identifiable as a non-component value
 * (such as a createContext call, object literal, constant primitive, class, or type).
 */
function isNonComponentDeclaration(declaration: OxcNode): boolean {
  if (
    declaration.type === 'ClassDeclaration' ||
    declaration.type === 'TSEnumDeclaration' ||
    declaration.type === 'TSInterfaceDeclaration' ||
    declaration.type === 'TSTypeAliasDeclaration'
  ) {
    return true;
  }
  if (declaration.type === 'VariableDeclarator') {
    let init = oxcObject(declaration, 'init');
    while (
      init !== undefined &&
      (init.type === 'ParenthesizedExpression' ||
        init.type === 'TSAsExpression' ||
        init.type === 'TSTypeAssertion' ||
        init.type === 'TSNonNullExpression')
    ) {
      init = oxcObject(init, 'expression');
    }
    if (init === undefined) {
      return true;
    }
    if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
      return false;
    }
    if (init.type === 'CallExpression') {
      const callee = oxcObject(init, 'callee');
      const calleeName =
        oxcIdentifierName(callee) ??
        (callee?.type === 'MemberExpression' ? oxcIdentifierName(oxcObject(callee, 'property')) : undefined);
      return !(
        calleeName === 'forwardRef' ||
        calleeName === 'memo' ||
        calleeName === 'createComponent' ||
        calleeName === 'defineComponent'
      );
    }
    // ObjectExpression, Literal, ArrayExpression, NewExpression, MemberExpression, Identifier, etc.
    return true;
  }
  return false;
}

export function isComponentExport(
  sourcePath: string,
  symbolName: string,
  astCache?: Map<string, OxcParsedModule>,
): boolean {
  if (!/^[A-Z]/.test(symbolName)) {
    return false;
  }
  let parsed = astCache?.get(sourcePath);
  if (parsed === undefined) {
    if (!fs.existsSync(sourcePath)) {
      return false;
    }
    try {
      const source = fs.readFileSync(sourcePath, 'utf8');
      parsed = parseOxcModule(sourcePath, source);
      astCache?.set(sourcePath, parsed);
    } catch {
      return false;
    }
  }
  const localName = resolveLocalSymbolName(parsed.program, symbolName);
  const declaration = findDeclaration(parsed.program, localName);
  if (declaration === undefined) {
    return true;
  }
  return !isNonComponentDeclaration(declaration);
}

/** Resolve a simple identifier alias declared in a source module. */
function componentAliasTarget(
  sourcePath: string,
  symbolName: string,
  astCache: Map<string, OxcParsedModule>,
): string | undefined {
  let parsed = astCache.get(sourcePath);
  if (parsed === undefined) {
    if (!fs.existsSync(sourcePath)) {
      return undefined;
    }
    try {
      parsed = parseOxcModule(sourcePath, fs.readFileSync(sourcePath, 'utf8'));
      astCache.set(sourcePath, parsed);
    } catch {
      return undefined;
    }
  }
  const localName = resolveLocalSymbolName(parsed.program, symbolName);
  const declaration = findDeclaration(parsed.program, localName);
  if (declaration?.type !== 'VariableDeclarator') {
    return undefined;
  }
  let initializer = oxcObject(declaration, 'init');
  while (
    initializer !== undefined &&
    (initializer.type === 'ParenthesizedExpression' ||
      initializer.type === 'TSAsExpression' ||
      initializer.type === 'TSTypeAssertion' ||
      initializer.type === 'TSNonNullExpression')
  ) {
    initializer = oxcObject(initializer, 'expression');
  }
  return oxcIdentifierName(initializer);
}

function graphTypeExports(
  graph: ForgeFileGraph,
  entry: ForgeFileNode,
  sourceNode: ForgeFileNode,
  componentSpecifier: string | undefined,
  helperExportNames: ReadonlySet<string> = new Set(),
): string[] {
  const names = new Set<string>();
  const isHelperType = (name: string): boolean => {
    if (helperExportNames.size === 0) {
      return false;
    }
    for (const helperName of helperExportNames) {
      if (name === helperName || name.startsWith(helperName)) {
        return true;
      }
    }
    return false;
  };

  for (const entryExport of entry.exports) {
    if (!entryExport.typeOnly || entryExport.exportedName === undefined || entryExport.specifier === undefined) {
      continue;
    }
    if (isHelperType(entryExport.exportedName)) {
      continue;
    }
    if (componentSpecifier !== undefined && entryExport.specifier === componentSpecifier) {
      names.add(entryExport.exportedName);
      continue;
    }
    const targetId = graph.edges.find(
      (edge) =>
        edge.from === entry.id && edge.specifier === entryExport.specifier && edge.resolved && edge.to !== undefined,
    )?.to;
    if (targetId === sourceNode.id) {
      names.add(entryExport.exportedName);
    }
  }
  for (const entryExport of sourceNode.exports) {
    if (entryExport.typeOnly && entryExport.exportedName !== undefined && !isHelperType(entryExport.exportedName)) {
      names.add(entryExport.exportedName);
    }
  }
  return [...names];
}

const graphComponentCache = new WeakMap<ForgeFileGraph, DiscoveredComponent[]>();
const graphHelperCache = new WeakMap<ForgeFileGraph, DiscoveredHelperExport[]>();

/** Resolves a single graph export into a DiscoveredComponent when it represents a component. */
function resolveDiscoveredComponent(
  graph: ForgeFileGraph,
  entry: ForgeFileNode,
  resolvedExport: ResolvedGraphExport,
  stripPrefix: string,
  astCache: Map<string, OxcParsedModule>,
): DiscoveredComponent | undefined {
  const entryExport = resolvedExport.fact;
  if (entryExport.typeOnly || entryExport.exportedName === undefined) {
    return undefined;
  }
  const sourceNode = resolvedExport.sourceNode;
  if (sourceNode === undefined || sourceNode.kind !== 'component') {
    return undefined;
  }
  const neutralName =
    sourceNode.exports.find(
      (sourceExport) =>
        !sourceExport.typeOnly && sourceExport.exportedName === (entryExport.localName ?? entryExport.exportedName),
    )?.exportedName ??
    entryExport.localName ??
    entryExport.exportedName;

  if (!isComponentExport(sourceNode.id, neutralName, astCache)) {
    return undefined;
  }

  const publicName =
    entryExport.exportedName !== undefined && entryExport.localName !== undefined
      ? entryExport.exportedName.startsWith(stripPrefix)
        ? entryExport.exportedName.slice(stripPrefix.length)
        : entryExport.exportedName
      : neutralName.startsWith(stripPrefix)
        ? neutralName.slice(stripPrefix.length)
        : neutralName;
  const helperExportNames = new Set(
    sourceNode.exports
      .filter(
        (sourceExport) =>
          !sourceExport.typeOnly &&
          sourceExport.exportedName !== undefined &&
          !isComponentExport(sourceNode.id, sourceExport.exportedName, astCache),
      )
      .map((sourceExport) => sourceExport.exportedName as string),
  );
  const typeExports = graphTypeExports(graph, entry, sourceNode, entryExport.specifier, helperExportNames);
  const candidate = `${publicName}Properties`;
  const sourceSpecifier =
    entryExport.specifier ?? `./${path.relative(path.dirname(graph.entry), sourceNode.id).split(path.sep).join('/')}`;
  return {
    neutralName,
    publicName,
    propertiesType: typeExports.includes(candidate) ? candidate : undefined,
    typeExports,
    folder: sourceBase(sourceNode.id),
    sourceDir: relativeModulePath(graph.entry, sourceNode.id),
    sourceSpecifier,
    sourcePath: sourceNode.id,
  };
}

/** Disambiguates folder basenames when multiple components share the same folder name. */
function disambiguateComponentFolders(components: readonly DiscoveredComponent[], entryPath: string): void {
  const componentsByFolder = new Map<string, DiscoveredComponent[]>();
  for (const component of components) {
    const list = componentsByFolder.get(component.folder);
    if (list === undefined) {
      componentsByFolder.set(component.folder, [component]);
    } else {
      list.push(component);
    }
  }

  for (const [folder, group] of componentsByFolder) {
    const uniqueSources = new Set(group.map((c) => c.sourcePath ?? c.sourceSpecifier));
    if (uniqueSources.size <= 1) {
      continue;
    }
    for (const component of group) {
      component.folder =
        component.sourcePath !== undefined
          ? deriveDisambiguatedFolder(entryPath, component.sourcePath, folder)
          : deriveDisambiguatedFolderFromDir(component.sourceDir, folder);
    }
  }
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
      const existingKey = existing.sourcePath ?? existing.sourceSpecifier;
      const currentKey = component.sourcePath ?? component.sourceSpecifier;
      if (existingKey !== currentKey) {
        const diagnostic = createCompilerDiagnostic({
          phase: 'generation',
          severity: 'error',
          code: DUPLICATE_COMPONENT_TARGET,
          message: `Duplicate component target "${component.folder}" detected for "${component.neutralName}" (${currentKey}) and "${existing.neutralName}" (${existingKey}).`,
          fileName: component.sourcePath ?? entryPath,
          relatedFiles: existing.sourcePath ? [existing.sourcePath] : undefined,
        });
        diagnostics?.push(diagnostic);
        throwOnCompilerErrors([diagnostic]);
      }
    } else {
      targetFolders.set(component.folder, component);
    }
  }
}

/** Project public component exports from the canonical graph while retaining the legacy result shape. */
export function discoverComponentsFromGraph(
  graph: ForgeFileGraph,
  stripPrefix = 'Forge',
  diagnostics?: CompilerDiagnostic[],
): DiscoveredComponent[] {
  if (stripPrefix === 'Forge' && diagnostics === undefined) {
    const cached = graphComponentCache.get(graph);
    if (cached !== undefined) {
      return cached;
    }
  }
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

  disambiguateComponentFolders(components, graph.entry);
  validateUniqueComponentFolders(components, graph.entry, diagnostics);

  if (stripPrefix === 'Forge' && diagnostics === undefined) {
    graphComponentCache.set(graph, components);
  }

  return components;
}

/** Project non-component public exports from the canonical graph. */
export function discoverHelperExportsFromGraph(
  graph: ForgeFileGraph,
  componentFolders: ReadonlySet<string>,
  discoveredComponents?: readonly DiscoveredComponent[],
): DiscoveredHelperExport[] {
  if (discoveredComponents === undefined) {
    const cached = graphHelperCache.get(graph);
    if (cached !== undefined) {
      return cached;
    }
  }
  const entry = graph.nodes.get(graph.entry);
  if (entry === undefined) {
    return [];
  }
  const components = discoveredComponents ?? discoverComponentsFromGraph(graph);
  const componentNames = new Set(components.flatMap((c) => [c.neutralName, c.publicName]));
  const componentTypes = new Set(
    components.flatMap((c) =>
      c.propertiesType ? [c.propertiesType, ...(c.typeExports ?? [])] : (c.typeExports ?? []),
    ),
  );
  const astCache = new Map<string, OxcParsedModule>();

  const helpers = new Map<string, DiscoveredHelperExport>();
  const entryDirectory = entry.sourceRelativePath.replace(/\/[^/]+$/, '');
  for (const resolvedExport of resolveGraphExports(graph, entry)) {
    const entryExport = resolvedExport.fact;
    if (entryExport.exportedName === undefined) {
      continue;
    }
    const sourceNode = resolvedExport.sourceNode;
    if (sourceNode === undefined || sourceNode.id === entry.id) {
      continue;
    }

    const exportedName = entryExport.exportedName;
    const localName = entryExport.localName ?? exportedName;
    const isType =
      entryExport.typeOnly || sourceNode.exports.find((e) => e.exportedName === localName)?.typeOnly === true;

    if (isType) {
      if (componentTypes.has(exportedName)) {
        continue;
      }
    } else {
      if (componentNames.has(exportedName) || componentNames.has(localName)) {
        continue;
      }
      if (sourceNode.kind === 'component' && isComponentExport(sourceNode.id, localName, astCache)) {
        continue;
      }
    }

    const base = sourceBase(sourceNode.id);
    const key = sourceNode.id;
    const helper = helpers.get(key) ?? {
      base,
      relativePath: (() => {
        const sourceRelative = sourceNode.sourceRelativePath
          .replace(/\.(?:d\.ts|d\.mts|d\.cts|[cm]?[jt]sx?)$/, '')
          .replace(/\/index$/, '');
        const relativeToEntryDirectory = sourceRelative.startsWith(`${entryDirectory}/`)
          ? sourceRelative.slice(entryDirectory.length + 1)
          : sourceRelative;
        return relativeToEntryDirectory;
      })(),
      values: [],
      types: [],
      sourcePath: sourceNode.id,
    };
    const binding: DiscoveredHelperBinding = {
      localName,
      exportedName,
      ...(isType ? {} : { componentAlias: componentAliasTarget(sourceNode.id, localName, astCache) }),
    };
    if (isType) {
      if (!helper.types.some((existing) => existing.exportedName === binding.exportedName)) {
        helper.types.push(binding);
      }
    } else {
      if (!helper.values.some((existing) => existing.exportedName === binding.exportedName)) {
        helper.values.push(binding);
      }
    }
    helpers.set(key, helper);
  }
  const result = [...helpers.values()];
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
    // The component's source **folder** relative to the barrel. A folder-style
    // re-export (`./atoms/forge-badge`) yields the folder directly; a file-style
    // re-export (`./organisms/three-canvas/three-canvas`, pointing at the file
    // rather than the folder's `index`) ends with the basename twice, so drop
    // the trailing duplicate — the generator appends `<folder>.tsx` itself.
    const sourceDir = stripTrailingDuplicate(moduleRelativePath(reExport.from));
    for (const neutralName of reExport.values) {
      const publicName = neutralName.startsWith(stripPrefix) ? neutralName.slice(stripPrefix.length) : neutralName;
      const candidate = `${publicName}Properties`;
      components.push({
        neutralName,
        publicName,
        propertiesType: reExport.types.has(candidate) ? candidate : undefined,
        typeExports: [...reExport.types],
        folder,
        sourceDir,
        sourceSpecifier: reExport.from,
      });
    }
  }

  // Check for collision among component `folder` basenames and disambiguate nested paths
  const componentsByFolder = new Map<string, DiscoveredComponent[]>();
  for (const component of components) {
    const list = componentsByFolder.get(component.folder);
    if (list === undefined) {
      componentsByFolder.set(component.folder, [component]);
    } else {
      list.push(component);
    }
  }

  for (const [folder, group] of componentsByFolder) {
    const uniqueSources = new Set(group.map((c) => c.sourceSpecifier));
    if (uniqueSources.size <= 1) {
      continue;
    }
    for (const component of group) {
      component.folder = deriveDisambiguatedFolderFromDir(component.sourceDir, folder);
    }
  }

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

  return components;
}

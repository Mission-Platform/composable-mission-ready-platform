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
import path from 'node:path';

import type { ForgeFileGraph, ForgeFileNode } from './graph.js';

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
  /** Value export names (functions/consts), e.g. `useToast`, `showToast`. */
  values: string[];
  /** Type export names, e.g. `ToastOptions`, `ToastRecord`. */
  types: string[];
  /** Canonical source node selected by graph-backed discovery. */
  sourcePath?: string;
}

function sourceBase(filePath: string): string {
  const fileName = path.basename(filePath);
  if (fileName === 'index.ts' || fileName === 'index.tsx' || fileName === 'index.js' || fileName === 'index.jsx') {
    return path.basename(path.dirname(filePath));
  }
  return fileName.replace(/\.d?\w+$/, '');
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
): ForgeFileNode | undefined {
  let node = start;
  let name = exportedName;
  const visited = new Set<string>();
  while (!visited.has(node.id)) {
    visited.add(node.id);
    const fact = node.exports.find(
      (entryExport) =>
        entryExport.typeOnly === typeOnly && entryExport.exportedName === name && entryExport.specifier !== undefined,
    );
    if (fact?.specifier === undefined) {
      return node;
    }
    const targetId = graph.edges.find(
      (edge) => edge.from === node.id && edge.specifier === fact.specifier && edge.resolved && edge.to !== undefined,
    )?.to;
    if (targetId === undefined) {
      return undefined;
    }
    const target = graph.nodes.get(targetId);
    if (target === undefined) {
      return undefined;
    }
    node = target;
    name = fact.localName ?? name;
  }
  return undefined;
}

function graphTypeExports(
  graph: ForgeFileGraph,
  entry: ForgeFileNode,
  sourceNode: ForgeFileNode,
  componentSpecifier: string,
): string[] {
  const names = new Set<string>();
  for (const entryExport of entry.exports) {
    if (!entryExport.typeOnly || entryExport.exportedName === undefined || entryExport.specifier === undefined) {
      continue;
    }
    if (entryExport.specifier === componentSpecifier) {
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
    if (entryExport.typeOnly && entryExport.exportedName !== undefined) {
      names.add(entryExport.exportedName);
    }
  }
  return [...names];
}

/** Project public component exports from the canonical graph while retaining the legacy result shape. */
export function discoverComponentsFromGraph(graph: ForgeFileGraph, stripPrefix = 'Forge'): DiscoveredComponent[] {
  const entry = graph.nodes.get(graph.entry);
  if (entry === undefined) {
    return [];
  }
  const components: DiscoveredComponent[] = [];
  for (const entryExport of entry.exports) {
    if (entryExport.typeOnly || entryExport.exportedName === undefined || entryExport.specifier === undefined) {
      continue;
    }
    const sourceNode = graphExportTarget(graph, entry, entryExport.exportedName, entryExport.typeOnly);
    if (sourceNode === undefined || sourceNode.kind !== 'component') {
      continue;
    }
    const neutralName =
      sourceNode.exports.find(
        (sourceExport) =>
          !sourceExport.typeOnly && sourceExport.exportedName === (entryExport.localName ?? entryExport.exportedName),
      )?.exportedName ??
      entryExport.localName ??
      entryExport.exportedName;
    const publicName = neutralName.startsWith(stripPrefix) ? neutralName.slice(stripPrefix.length) : neutralName;
    const typeExports = graphTypeExports(graph, entry, sourceNode, entryExport.specifier);
    const candidate = `${publicName}Properties`;
    components.push({
      neutralName,
      publicName,
      propertiesType: typeExports.includes(candidate) ? candidate : undefined,
      typeExports,
      folder: sourceBase(sourceNode.id),
      sourceDir: relativeModulePath(graph.entry, sourceNode.id),
      sourceSpecifier: entryExport.specifier,
      sourcePath: sourceNode.id,
    });
  }
  return components;
}

/** Project non-component public exports from the canonical graph. */
export function discoverHelperExportsFromGraph(
  graph: ForgeFileGraph,
  componentFolders: ReadonlySet<string>,
): DiscoveredHelperExport[] {
  const entry = graph.nodes.get(graph.entry);
  if (entry === undefined) {
    return [];
  }
  const helpers = new Map<string, DiscoveredHelperExport>();
  const entryDirectory = entry.sourceRelativePath.replace(/\/[^/]+$/, '');
  for (const entryExport of entry.exports) {
    if (entryExport.exportedName === undefined || entryExport.specifier === undefined) {
      continue;
    }
    const sourceNode = graphExportTarget(graph, entry, entryExport.exportedName, entryExport.typeOnly);
    if (sourceNode === undefined || sourceNode.id === entry.id || sourceNode.kind === 'component') {
      continue;
    }
    const base = sourceBase(sourceNode.id);
    if (componentFolders.has(base)) {
      continue;
    }
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
    if (entryExport.typeOnly) {
      helper.types.push(entryExport.exportedName);
    } else {
      helper.values.push(entryExport.exportedName);
    }
    helpers.set(key, helper);
  }
  return [...helpers.values()];
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
    const types = [...reExport.types];
    if (values.length > 0 || types.length > 0) {
      helpers.push({ base, relativePath: moduleRelativePath(reExport.from), values, types });
    }
  }
  return helpers;
}

/** Re-scan a barrel for the value (non-type) names a given module is re-exported under. */
function collectHelperValues(barrelSource: string, from: string): string[] {
  const escaped = from.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const statement = new RegExp(String.raw`export\s*\{([^}]*)\}\s*from\s*['"]${escaped}['"]`);
  const match = statement.exec(barrelSource);
  if (match === null) {
    return [];
  }
  const values: string[] = [];
  for (const raw of match[1].split(',')) {
    const token = raw.trim();
    if (token.length === 0 || token.startsWith('type ')) {
      continue;
    }
    values.push(token);
  }
  return values;
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
  return components;
}

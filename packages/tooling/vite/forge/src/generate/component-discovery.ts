import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { moduleTargetsFramework } from '../compiler/directives.js';
import { discoverComponentsFromGraph, type DiscoveredComponent } from '../compiler/discover.js';

import type { ForgeFileEdge, ForgeFileGraph, ForgeFileNode } from '../compiler/graph.js';
import type { CompilerDiagnostic } from '@mission-platform/forge-plugin-api';

const toPosix = (value: string): string => value.split(path.sep).join('/');

export function componentSourcePath(component: DiscoveredComponent): string {
  if (component.sourcePath === undefined) {
    throw new Error(`Missing graph source node for component ${component.neutralName}`);
  }
  return component.sourcePath;
}

/**
 * Discover components from the graph and filter out those that gate themselves
 * to other frameworks via `"use <framework>";` directives.
 */
export function discoverAndFilterComponents(
  graph: ForgeFileGraph,
  stripPrefix: string,
  targetId: string,
  diagnostics?: CompilerDiagnostic[],
): DiscoveredComponent[] {
  return discoverComponentsFromGraph(graph, stripPrefix, diagnostics).filter((component) => {
    if (component.sourcePath === undefined || !existsSync(component.sourcePath)) {
      return false;
    }
    return moduleTargetsFramework(component.sourcePath, readFileSync(component.sourcePath, 'utf8'), targetId);
  });
}

export interface DiscoverSiblingComponentsOptions {
  readonly graph: ForgeFileGraph;
  readonly components: readonly DiscoveredComponent[];
  readonly stripPrefix: string;
  readonly targetId: string;
  readonly componentsDir: string;
  readonly componentFolders: Set<string>;
}

/** Indexes resolved graph edges by their source module path. */
function indexResolvedGraphEdges(edges: readonly ForgeFileEdge[]): Map<string, ForgeFileEdge[]> {
  const edgesByFrom = new Map<string, ForgeFileEdge[]>();
  for (const edge of edges) {
    if (edge.resolved && edge.to !== undefined) {
      let list = edgesByFrom.get(edge.from);
      if (list === undefined) {
        list = [];
        edgesByFrom.set(edge.from, list);
      }
      list.push(edge);
    }
  }
  return edgesByFrom;
}

/** Derives the target folder basename for a child component node. */
function deriveChildFolder(nodeId: string): string {
  const childFileName = path.basename(nodeId);
  return childFileName.startsWith('index.')
    ? path.basename(path.dirname(nodeId))
    : childFileName.replace(/\.[^.]+$/, '');
}

/** Validates whether a child node is an eligible co-located sibling component. */
function isEligibleSiblingNode(
  childNode: ForgeFileNode | undefined,
  currentNode: ForgeFileNode,
  edgeSpecifier: string,
  childFolder: string,
  discoveredFolders: ReadonlySet<string>,
  targetId: string,
): boolean {
  if (childNode === undefined || childNode.kind !== 'component') return false;
  if (discoveredFolders.has(childFolder)) return false;
  if (childNode.frameworkDirective !== undefined && childNode.frameworkDirective !== targetId) return false;

  const importedNames = currentNode.imports
    .filter((entryImport) => entryImport.specifier === edgeSpecifier)
    .flatMap((entryImport) => entryImport.valueNames);
  return importedNames.some((name) => /^[A-Z]/.test(name));
}

/** Constructs a DiscoveredComponent descriptor for an eligible sibling component node. */
function buildSiblingDiscoveredComponent(
  childNode: ForgeFileNode,
  childFolder: string,
  edgeSpecifier: string,
  stripPrefix: string,
  componentsDir: string,
): DiscoveredComponent | undefined {
  const childName = childNode.exports.find(
    (entryExport) =>
      !entryExport.typeOnly && entryExport.exportedName !== undefined && /^[A-Z]/.test(entryExport.exportedName),
  )?.exportedName;
  if (childName === undefined) return undefined;

  const childPublicName = childName.startsWith(stripPrefix) ? childName.slice(stripPrefix.length) : childName;
  const childTypeNames = childNode.exports
    .filter((entryExport) => entryExport.typeOnly && entryExport.exportedName !== undefined)
    .map((entryExport) => entryExport.exportedName as string);
  const candidate = `${childPublicName}Properties`;

  return {
    neutralName: childName,
    publicName: childPublicName,
    propertiesType: childTypeNames.includes(candidate) ? candidate : undefined,
    typeExports: childTypeNames,
    folder: childFolder,
    sourceDir: toPosix(path.relative(componentsDir, path.dirname(childNode.id))),
    sourceSpecifier: edgeSpecifier,
    sourcePath: childNode.id,
  };
}

/** Inspects an edge from a parent component and registers newly discovered sibling components. */
function inspectSiblingEdge(
  edge: ForgeFileEdge,
  currentNode: ForgeFileNode,
  graph: ForgeFileGraph,
  options: DiscoverSiblingComponentsOptions,
  discoveredFolders: Set<string>,
  siblingComponents: DiscoveredComponent[],
  discoveryQueue: DiscoveredComponent[],
): void {
  const childNode = graph.nodes.get(edge.to as string);
  const childFolder = deriveChildFolder(childNode?.id ?? '');
  if (
    !isEligibleSiblingNode(childNode, currentNode, edge.specifier, childFolder, discoveredFolders, options.targetId)
  ) {
    return;
  }
  const child = buildSiblingDiscoveredComponent(
    childNode as ForgeFileNode,
    childFolder,
    edge.specifier,
    options.stripPrefix,
    options.componentsDir,
  );
  if (child === undefined) return;

  discoveredFolders.add(child.folder);
  options.componentFolders.add(child.folder);
  siblingComponents.push(child);
  discoveryQueue.push(child);
}

/**
 * Discover co-located sibling components: child components authored beside the primary
 * (e.g. `forge-tree-view/` holds `forge-tree-view.tsx` + `forge-tree-view-item.tsx`).
 * They are found recursively by following relative PascalCase imports to co-located
 * neutral components.
 */
export function discoverSiblingComponents(options: DiscoverSiblingComponentsOptions): DiscoveredComponent[] {
  const siblingComponents: DiscoveredComponent[] = [];
  const discoveredFolders = new Set(options.components.map((component) => component.folder));
  const discoveryQueue: DiscoveredComponent[] = [...options.components];
  const edgesByFrom = indexResolvedGraphEdges(options.graph.edges);

  while (discoveryQueue.length > 0) {
    const current = discoveryQueue.shift() as DiscoveredComponent;
    const currentPath = componentSourcePath(current);
    const currentNode = options.graph.nodes.get(currentPath);
    if (currentNode === undefined) continue;

    for (const edge of edgesByFrom.get(currentPath) ?? []) {
      inspectSiblingEdge(
        edge,
        currentNode,
        options.graph,
        options,
        discoveredFolders,
        siblingComponents,
        discoveryQueue,
      );
    }
  }

  return siblingComponents;
}

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { moduleTargetsFramework } from '../compiler/directives.js';
import { discoverComponentsFromGraph, type DiscoveredComponent } from '../compiler/discover.js';

import type { ForgeFileGraph } from '../compiler/graph.js';
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

/**
 * Discover co-located sibling components: child components authored beside the primary
 * (e.g. `forge-tree-view/` holds `forge-tree-view.tsx` + `forge-tree-view-item.tsx`).
 * They are found recursively by following relative PascalCase imports to co-located
 * neutral components.
 */
export function discoverSiblingComponents(options: DiscoverSiblingComponentsOptions): DiscoveredComponent[] {
  const { graph, components, stripPrefix, targetId, componentsDir, componentFolders } = options;
  const siblingComponents: DiscoveredComponent[] = [];
  const discoveredFolders = new Set(components.map((component) => component.folder));
  const discoveryQueue: DiscoveredComponent[] = [...components];

  while (discoveryQueue.length > 0) {
    const current = discoveryQueue.shift() as DiscoveredComponent;
    const currentPath = componentSourcePath(current);
    const currentNode = graph.nodes.get(currentPath);
    if (currentNode === undefined) {
      continue;
    }
    for (const edge of graph.edges.filter((candidate) => candidate.from === currentPath && candidate.resolved)) {
      if (edge.to === undefined) {
        continue;
      }
      const childNode = graph.nodes.get(edge.to);
      const childFileName = path.basename(childNode?.id ?? '');
      const childFolder = childFileName.startsWith('index.')
        ? path.basename(path.dirname(childNode?.id ?? ''))
        : childFileName.replace(/\.[^.]+$/, '');
      const importedNames = currentNode.imports
        .filter((entryImport) => entryImport.specifier === edge.specifier)
        .flatMap((entryImport) => entryImport.valueNames);
      if (
        childNode === undefined ||
        childNode.kind !== 'component' ||
        discoveredFolders.has(childFolder) ||
        !importedNames.some((name) => /^[A-Z]/.test(name)) ||
        (childNode.frameworkDirective !== undefined && childNode.frameworkDirective !== targetId)
      ) {
        continue;
      }
      const childName = childNode.exports.find(
        (entryExport) =>
          !entryExport.typeOnly && entryExport.exportedName !== undefined && /^[A-Z]/.test(entryExport.exportedName),
      )?.exportedName;
      if (childName === undefined) {
        continue;
      }
      const childPublicName = childName.startsWith(stripPrefix) ? childName.slice(stripPrefix.length) : childName;
      const childTypeNames = childNode.exports
        .filter((entryExport) => entryExport.typeOnly && entryExport.exportedName !== undefined)
        .map((entryExport) => entryExport.exportedName as string);
      const child: DiscoveredComponent = {
        neutralName: childName,
        publicName: childPublicName,
        propertiesType: childTypeNames.includes(`${childPublicName}Properties`)
          ? `${childPublicName}Properties`
          : undefined,
        typeExports: childTypeNames,
        folder: childFolder,
        sourceDir: toPosix(path.relative(componentsDir, path.dirname(childNode.id))),
        sourceSpecifier: edge.specifier,
        sourcePath: childNode.id,
      };
      discoveredFolders.add(child.folder);
      componentFolders.add(child.folder);
      siblingComponents.push(child);
      discoveryQueue.push(child);
    }
  }

  return siblingComponents;
}

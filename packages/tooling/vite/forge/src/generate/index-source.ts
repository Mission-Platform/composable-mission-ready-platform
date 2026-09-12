import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  oxcArray,
  oxcIdentifierName,
  oxcLiteralValue,
  oxcObject,
  oxcProgramBody,
  parseOxcModule,
} from '../compiler/oxc.js';

import type { DiscoveredComponent } from '../compiler/discover.js';
import type { ForgeFileGraph } from '../compiler/graph.js';
import type { FrameworkSourceTarget } from '../generate.js';

export interface IndexSourceBuilderOptions {
  readonly graphs: readonly ForgeFileGraph[];
  readonly components: readonly DiscoveredComponent[];
  readonly siblingComponents: readonly DiscoveredComponent[];
  readonly sourceModuleRegistry: ReadonlyMap<string, { file: string; dir: string }>;
  readonly moduleBase: (file: string) => string;
  readonly mirrorDir: (sourcePath: string) => string;
  readonly relSpecifier: (fromDir: string, toDir: string, toFile: string) => string;
  readonly target: FrameworkSourceTarget;
}

export function createGeneratedIndexSourceBuilder(options: IndexSourceBuilderOptions) {
  const {
    graphs,
    components,
    siblingComponents,
    sourceModuleRegistry,
    moduleBase,
    mirrorDir,
    relSpecifier,
    target,
  } = options;

  const graphForSource = (sourcePath: string): ForgeFileGraph | undefined =>
    graphs.find((candidate) => candidate.nodes.has(path.resolve(sourcePath)));

  const componentForSource = (sourcePath: string): DiscoveredComponent | undefined =>
    [...components, ...siblingComponents].find((component) => component.sourcePath === sourcePath);

  const componentForIndexExport = (
    sourceNode: ReturnType<ForgeFileGraph['nodes']['get']>,
    exportedName: string,
    typeOnly: boolean,
  ): DiscoveredComponent | undefined => {
    const sourceGraph = sourceNode === undefined ? undefined : graphForSource(sourceNode.id);
    let node = sourceNode;
    let name = exportedName;
    const visited = new Set<string>();
    while (node !== undefined && !visited.has(node.id)) {
      visited.add(node.id);
      const directComponent = componentForSource(node.id);
      if (directComponent !== undefined && node.id !== sourceNode?.id) {
        return directComponent;
      }
      const exportFact = node.exports.find(
        (entryExport) =>
          entryExport.exportedName === name && entryExport.specifier !== undefined && entryExport.typeOnly === typeOnly,
      );
      if (exportFact?.specifier === undefined) {
        return componentForSource(node.id);
      }
      const targetId = sourceGraph?.edges.find(
        (edge) =>
          edge.from === node?.id && edge.specifier === exportFact.specifier && edge.resolved && edge.to !== undefined,
      )?.to;
      if (targetId === undefined) {
        return undefined;
      }
      node = sourceGraph?.nodes.get(targetId) ?? graphs[1]?.nodes.get(targetId);
      name = exportFact.localName ?? name;
    }
    return undefined;
  };

  const exportMember = (localName: string, exportedName: string): string =>
    localName === exportedName ? localName : `${localName} as ${exportedName}`;

  const generatedModuleSpecifier = (fromSourcePath: string, targetSourcePath: string): string | undefined => {
    const registryTarget = sourceModuleRegistry.get(path.resolve(targetSourcePath));
    if (registryTarget === undefined) {
      const targetNode = graphForSource(targetSourcePath)?.nodes.get(path.resolve(targetSourcePath));
      if (targetNode === undefined || path.basename(targetNode.id, path.extname(targetNode.id)) !== 'index') {
        return undefined;
      }
      return relSpecifier(mirrorDir(fromSourcePath), mirrorDir(targetNode.id), 'index.ts');
    }
    const targetFile =
      path.extname(registryTarget.file) === '.ts' || path.extname(registryTarget.file) === '.tsx'
        ? moduleBase(registryTarget.file)
        : registryTarget.file;
    return relSpecifier(mirrorDir(fromSourcePath), registryTarget.dir, targetFile);
  };

  const generatedIndexSource = (sourcePath: string): string | undefined => {
    const sourceGraph = graphForSource(sourcePath);
    const moduleNode = sourceGraph?.nodes.get(sourcePath);
    if (moduleNode === undefined) {
      return undefined;
    }
    const source = readFileSync(sourcePath, 'utf8');
    const parsed = parseOxcModule(sourcePath, source);
    // A shared companion type is routinely re-exported from both its own helper
    // module and the component that ships it (`DateRange` from `date-time` and
    // from `forge-date-range-input`). The authored barrel tolerates that because
    // at least one side arrives through `export *`, whose ambiguous names are
    // dropped silently; the mirrored barrel names every binding explicitly, so
    // the repeat would become a duplicate identifier. First mention wins.
    const claimedExports = new Set<string>();
    let cursor = 0;
    let generated = '';
    for (const statement of oxcProgramBody(parsed.program)) {
      const original = source.slice(statement.start, statement.end);
      let replacement = original;
      const sourceNode = oxcObject(statement, 'source');
      const authoredSpecifier = oxcLiteralValue(sourceNode);
      if (
        (statement.type !== 'ExportNamedDeclaration' && statement.type !== 'ExportAllDeclaration') ||
        typeof authoredSpecifier !== 'string'
      ) {
        generated += source.slice(cursor, statement.end);
        cursor = statement.end;
        continue;
      }
      const edge = sourceGraph?.edges.find(
        (candidate) =>
          candidate.from === sourcePath &&
          candidate.specifier === authoredSpecifier &&
          candidate.resolved &&
          candidate.to !== undefined,
      );
      if (edge?.to === undefined) {
        generated += source.slice(cursor, statement.end);
        cursor = statement.end;
        continue;
      }
      const targetSpecifier = generatedModuleSpecifier(sourcePath, edge.to);
      if (targetSpecifier === undefined) {
        generated += source.slice(cursor, statement.end);
        cursor = statement.end;
        continue;
      }
      const quote = sourceNode === undefined || source[sourceNode.start] !== '"' ? "'" : '"';
      const quotedTarget = `${quote}${targetSpecifier}${quote}`;
      const exportClause = oxcArray(statement, 'specifiers');
      if (statement.type === 'ExportAllDeclaration' || exportClause.length === 0) {
        const typePrefix = statement.exportKind === 'type' ? 'type ' : '';
        replacement = `export ${typePrefix}* from ${quotedTarget};\n`;
      } else if (exportClause.every((specifier) => specifier.type === 'ExportSpecifier')) {
        const lines = exportClause.flatMap((element) => {
          const exportedName = oxcIdentifierName(oxcObject(element, 'exported'));
          if (exportedName === undefined) {
            return [undefined];
          }
          if (claimedExports.has(exportedName)) {
            return [];
          }
          claimedExports.add(exportedName);
          const typeOnly = statement.exportKind === 'type' || element.exportKind === 'type';
          const matchedComponent = componentForIndexExport(moduleNode, exportedName, typeOnly);
          if (matchedComponent?.sourcePath !== undefined) {
            const componentSpecifier = generatedModuleSpecifier(sourcePath, matchedComponent.sourcePath);
            if (componentSpecifier === undefined) {
              return undefined;
            }
            if (typeOnly) {
              return `export type { ${exportMember(oxcIdentifierName(oxcObject(element, 'local')) ?? exportedName, exportedName)} } from '${componentSpecifier}';`;
            }
            return target.componentReExport(matchedComponent, exportedName, componentSpecifier);
          }
          const typePrefix = typeOnly ? 'type ' : '';
          const localName = oxcIdentifierName(oxcObject(element, 'local')) ?? exportedName;
          return `export { ${typePrefix}${exportMember(localName, exportedName)} } from '${targetSpecifier}';`;
        });
        if (lines.includes(undefined)) {
          generated += source.slice(cursor, statement.end);
          cursor = statement.end;
          continue;
        }
        replacement = lines.length === 0 ? '' : `${(lines as string[]).join('\n')}\n`;
      } else {
        const sourceStart = sourceNode?.start ?? statement.start;
        const sourceEnd = sourceNode?.end ?? sourceStart;
        replacement = `${original.slice(0, sourceStart - statement.start)}${quotedTarget}${original.slice(
          sourceEnd - statement.start,
        )}`;
      }
      generated += `${source.slice(cursor, statement.start)}${replacement}`;
      cursor = statement.end;
    }
    return `${generated}${source.slice(cursor)}`;
  };

  return {
    generatedIndexSource,
    generatedModuleSpecifier,
    componentForIndexExport,
  };
}

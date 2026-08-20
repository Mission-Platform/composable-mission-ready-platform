import path from 'node:path';

import type { ForgeArtifactWriter } from '../compiler/artifact-writer.js';
import type { DiscoveredComponent } from '../compiler/discover.js';
import type { ForgeFileGraph } from '../compiler/graph.js';

type RewriteFlatImports = (code: string, fromDir: string, sourceId?: string) => string;

export function createFlatImportRewriter(input: {
  readonly graph: ForgeFileGraph;
  readonly components: readonly DiscoveredComponent[];
  readonly moduleRegistry: Map<string, { dir: string; file: string }>;
  readonly moduleRegistryCollisions: Set<string>;
  readonly sourceModuleRegistry: Map<string, { dir: string; file: string }>;
  readonly moduleBase: (fileName: string) => string;
  readonly relSpecifier: (fromDir: string, targetDir: string, fileName: string) => string;
}): RewriteFlatImports {
  const { graph, components, moduleRegistry, moduleRegistryCollisions, sourceModuleRegistry, moduleBase, relSpecifier } = input;

  return (code, fromDir, sourceId) => {
    const rewrite = (specifier: string): string => {
      const rest = specifier.slice(2);
      const fileName = path.posix.basename(rest);

      const graphTargets =
        sourceId === undefined
          ? []
          : graph.edges
              .filter((edge) => edge.from === path.resolve(sourceId) && edge.resolved && edge.to !== undefined)
              .map((edge) => ({ edge, node: graph.nodes.get(edge.to as string) }))
              .filter(({ node }) =>
                node !== undefined && moduleBase(path.basename(node.id)) === moduleBase(fileName),
              );

      const graphTarget =
        graphTargets.length === 1
          ? sourceModuleRegistry.get(path.resolve(graphTargets[0].edge.to as string))
          : undefined;

      const componentTarget = components.find((component) => component.folder === moduleBase(fileName));
      const registeredTarget =
        graphTarget ??
        (componentTarget?.sourcePath === undefined
          ? undefined
          : sourceModuleRegistry.get(path.resolve(componentTarget.sourcePath))) ??
        (moduleRegistryCollisions.has(moduleBase(fileName)) ? undefined : moduleRegistry.get(moduleBase(fileName)));

      if (registeredTarget === undefined) {
        return specifier;
      }

      const targetFile =
        path.extname(registeredTarget.file) === '.ts' || path.extname(registeredTarget.file) === '.tsx'
          ? moduleBase(registeredTarget.file)
          : registeredTarget.file;

      return relSpecifier(fromDir, registeredTarget.dir, targetFile);
    };

    return code
      .replace(
        /(\bfrom\s+)(['"])(\.\/[^'\"]+)(['"])/g,
        (_match, pre, quote, specifier) => `${pre}${quote}${rewrite(specifier)}${quote}`,
      )
      .replace(
        /(\bimport\s+)(['"])(\.\/[^'\"]+)(['"])/g,
        (_match, pre, quote, specifier) => `${pre}${quote}${rewrite(specifier)}${quote}`,
      );
  };
}

export function rewriteFlatImportsInTargets(input: {
  readonly writer: ForgeArtifactWriter;
  readonly outDir: string;
  readonly entryFile: string;
  readonly rewriteTargets: readonly {
    readonly file: string;
    readonly dir: string;
    readonly sourceId?: string;
  }[];
  readonly rewriteFlatImports: RewriteFlatImports;
}): void {
  const { writer, outDir, entryFile, rewriteTargets, rewriteFlatImports } = input;

  for (const target of rewriteTargets) {
    const relative = path.relative(outDir, target.file);
    const code = writer.readText(relative);
    const rewritten = rewriteFlatImports(code, target.dir, target.sourceId);
    if (rewritten !== code) {
      writer.writeText(relative, rewritten, target.file === entryFile ? 'entry' : 'module');
    }
  }
}

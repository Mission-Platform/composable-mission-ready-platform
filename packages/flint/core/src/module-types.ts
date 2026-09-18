import type { FlintFunction } from './ast.js';
import type { FlintModuleGraph, FlintResolvedModule } from './graph.js';

export interface FlintImportTypeEnvironment {
  readonly externalFunctions: readonly FlintFunction[];
}

export function resolveFlintImportTypeEnvironment(
  importer: FlintResolvedModule,
  graph: FlintModuleGraph,
): FlintImportTypeEnvironment {
  const externalFunctions = graph.edges
    .filter(({ importer: importerFileName }) => importerFileName === importer.fileName)
    .flatMap((edge) => {
      const alias = importer.module.sourceImports.find(({ source }) => source === edge.source)?.alias;
      return (graph.modules.find(({ fileName }) => fileName === edge.resolved)?.module.functions ?? [])
        .filter(({ exported }) => exported)
        .flatMap((declaration) =>
          alias === undefined ? [declaration] : [declaration, { ...declaration, name: `${alias}.${declaration.name}` }],
        );
    });

  return { externalFunctions };
}

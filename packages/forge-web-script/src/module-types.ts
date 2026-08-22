import type { ForgeWebScriptFunction } from './ast.js';
import type { ForgeWebScriptModuleGraph, ForgeWebScriptResolvedModule } from './graph.js';

export interface ForgeWebScriptImportTypeEnvironment {
  readonly externalFunctions: readonly ForgeWebScriptFunction[];
}

export function resolveForgeWebScriptImportTypeEnvironment(
  importer: ForgeWebScriptResolvedModule,
  graph: ForgeWebScriptModuleGraph,
): ForgeWebScriptImportTypeEnvironment {
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

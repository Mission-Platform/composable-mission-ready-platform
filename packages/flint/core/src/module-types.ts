import type { FlintFunction } from '@mission-platform/flint-ast';

import type { FlintModuleGraph, FlintResolvedModule } from './graph.js';

/**
 * External type environment containing declarations imported into a module.
 */
export interface FlintImportTypeEnvironment {
  /** External function declarations exported by resolved dependency modules. */
  readonly externalFunctions: readonly FlintFunction[];
}

/**
 * Resolves imported function signatures from upstream dependency modules in a module graph.
 *
 * @param importer - Resolved module whose import dependencies are being inspected.
 * @param graph - Multi-module dependency graph containing all linked modules and edges.
 * @returns An import type environment containing exported external functions (both bare and alias-prefixed).
 */
export function resolveFlintImportTypeEnvironment(
  importer: FlintResolvedModule,
  graph: FlintModuleGraph,
): FlintImportTypeEnvironment {
  const externalFunctions = graph.edges
    .filter(({ importer: importerFileName }) => importerFileName === importer.fileName)
    .flatMap((edge) => {
      const sourceImport = importer.module.sourceImports.find(({ source }) => source === edge.source);
      const exportedFunctions = (
        graph.modules.find(({ fileName }) => fileName === edge.resolved)?.module.functions ?? []
      ).filter(({ exported }) => exported);
      if (sourceImport === undefined) return exportedFunctions;
      if (sourceImport.bindings === undefined) {
        return exportedFunctions.flatMap((declaration) => [
          declaration,
          { ...declaration, name: `${sourceImport.alias}.${declaration.name}` },
        ]);
      }
      if (sourceImport.bindingKind === 'named') {
        return (sourceImport.bindings ?? []).flatMap((binding) => {
          if (binding.kind !== 'named') return [];
          const declaration = exportedFunctions.find(({ name }) => name === binding.importedName);
          return declaration === undefined ? [] : [{ ...declaration, name: binding.localName }];
        });
      }
      const namespace = (sourceImport.bindings ?? []).find(({ kind }) => kind === 'namespace');
      const alias = namespace?.localName ?? sourceImport.alias;
      return exportedFunctions.map((declaration) => ({ ...declaration, name: `${alias}.${declaration.name}` }));
    });

  return { externalFunctions };
}

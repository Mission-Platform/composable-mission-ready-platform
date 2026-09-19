import type { FlintFunction } from './ast.js';
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
      const alias = importer.module.sourceImports.find(({ source }) => source === edge.source)?.alias;
      return (graph.modules.find(({ fileName }) => fileName === edge.resolved)?.module.functions ?? [])
        .filter(({ exported }) => exported)
        .flatMap((declaration) =>
          alias === undefined ? [declaration] : [declaration, { ...declaration, name: `${alias}.${declaration.name}` }],
        );
    });

  return { externalFunctions };
}

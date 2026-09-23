/**
 * Function summary record within a ThinLTO module summary.
 */
export interface ThinLtoFunctionSummary {
  readonly name: string;
  readonly isExported: boolean;
  readonly calls: readonly string[];
  readonly capabilityImports: readonly string[];
  readonly memoryEffects: 'none' | 'read' | 'write' | 'readwrite';
  readonly inlineCandidate: boolean;
  readonly instructionCount: number;
}

/**
 * Summary record for a single compilation unit (.sonir module).
 */
export interface ThinLtoModuleSummary {
  readonly moduleName: string;
  readonly functions: readonly ThinLtoFunctionSummary[];
  readonly importedCapabilities: readonly string[];
  readonly exportedSymbols: readonly string[];
}

/**
 * Global ThinLTO index combining summaries from all linked modules.
 */
export interface ThinLtoIndex {
  readonly modules: readonly ThinLtoModuleSummary[];
  readonly globalCallGraph: ReadonlyMap<string, readonly string[]>;
  readonly liveSymbols: ReadonlySet<string>;
  readonly prunedCapabilities: ReadonlySet<string>;
}

/**
 * Computes a ThinLTO summary for a module.
 */
export function createModuleSummary(
  moduleName: string,
  functions: readonly ThinLtoFunctionSummary[],
): ThinLtoModuleSummary {
  const exportedSymbols = functions.filter((function_) => function_.isExported).map((function_) => function_.name);
  const importedCapabilities = [...new Set(functions.flatMap((function_) => function_.capabilityImports))].toSorted();

  return {
    moduleName,
    functions,
    importedCapabilities,
    exportedSymbols,
  };
}

/**
 * Builds a global ThinLTO summary index across a set of module summaries.
 */
export function buildThinLtoIndex(
  moduleSummaries: readonly ThinLtoModuleSummary[],
  rootEntryPoints: readonly string[],
): ThinLtoIndex {
  const callGraph = new Map<string, string[]>();
  const functionMap = new Map<string, ThinLtoFunctionSummary>();

  for (const module of moduleSummaries) {
    for (const function_ of module.functions) {
      functionMap.set(function_.name, function_);
      callGraph.set(function_.name, [...function_.calls]);
    }
  }

  // Reachability analysis from root entry points (Dead Code Elimination)
  const reachable = new Set<string>();
  const queue = [...rootEntryPoints];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || reachable.has(current)) continue;

    reachable.add(current);
    const callees = callGraph.get(current) ?? [];
    for (const callee of callees) {
      if (!reachable.has(callee)) {
        queue.push(callee);
      }
    }
  }

  // Capability pruning: determine which capabilities are actually reached
  const activeCapabilities = new Set<string>();
  const allDeclaredCapabilities = new Set<string>();

  for (const module of moduleSummaries) {
    for (const capability of module.importedCapabilities) {
      allDeclaredCapabilities.add(capability);
    }
  }

  for (const name of reachable) {
    const function_ = functionMap.get(name);
    if (function_ !== undefined) {
      for (const capability of function_.capabilityImports) {
        activeCapabilities.add(capability);
      }
    }
  }

  const prunedCapabilities = new Set<string>();
  for (const capability of allDeclaredCapabilities) {
    if (!activeCapabilities.has(capability)) {
      prunedCapabilities.add(capability);
    }
  }

  return {
    modules: moduleSummaries,
    globalCallGraph: callGraph,
    liveSymbols: reachable,
    prunedCapabilities,
  };
}

/**
 * Computes cross-module inlining and devirtualization candidates from a ThinLTO index.
 */
export function computeThinLtoInliningPlan(
  index: ThinLtoIndex,
  maxInlineInstructions = 50,
): ReadonlyMap<string, readonly string[]> {
  const inlinePlan = new Map<string, string[]>();

  for (const module of index.modules) {
    for (const function_ of module.functions) {
      if (!index.liveSymbols.has(function_.name)) continue;

      const inlineTargets: string[] = [];
      for (const calleeName of function_.calls) {
        const callee = index.modules.flatMap((m) => m.functions).find((f) => f.name === calleeName);

        if (callee !== undefined && callee.inlineCandidate && callee.instructionCount <= maxInlineInstructions) {
          inlineTargets.push(callee.name);
        }
      }

      if (inlineTargets.length > 0) {
        inlinePlan.set(function_.name, inlineTargets);
      }
    }
  }

  return inlinePlan;
}

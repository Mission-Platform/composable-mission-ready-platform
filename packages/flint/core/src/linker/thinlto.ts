/**
 * Function summary record within a ThinLTO module summary.
 */
export interface ThinLtoFunctionSummary {
  readonly name: string;
  readonly isExported: boolean;
  readonly calls: readonly string[];
  readonly indirectCalls?: readonly string[];
  readonly dispatchTableTargets?: readonly string[];
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
  readonly dispatchTableRoots?: readonly string[];
}

/**
 * Global ThinLTO index combining summaries from all linked modules.
 */
export interface ThinLtoIndex {
  readonly modules: readonly ThinLtoModuleSummary[];
  readonly globalCallGraph: ReadonlyMap<string, readonly string[]>;
  readonly liveSymbols: ReadonlySet<string>;
  readonly prunedCapabilities: ReadonlySet<string>;
  readonly transitiveModuleCapabilities?: ReadonlyMap<string, ReadonlySet<string>>;
}

/**
 * Configuration options for ThinLTO index building.
 */
export interface ThinLtoBuildOptions {
  readonly dynamicDispatchRoots?: readonly string[];
}

/**
 * Computes a ThinLTO summary for a module.
 */
export function createModuleSummary(
  moduleName: string,
  functions: readonly ThinLtoFunctionSummary[],
  dispatchTableRoots?: readonly string[],
): ThinLtoModuleSummary {
  const exportedSymbols = functions.filter((function_) => function_.isExported).map((function_) => function_.name);
  const importedCapabilities = [...new Set(functions.flatMap((function_) => function_.capabilityImports))].toSorted();

  return {
    moduleName,
    functions,
    importedCapabilities,
    exportedSymbols,
    ...(dispatchTableRoots === undefined ? {} : { dispatchTableRoots }),
  };
}

/**
 * Builds a global ThinLTO summary index across a set of module summaries.
 */
export function buildThinLtoIndex(
  moduleSummaries: readonly ThinLtoModuleSummary[],
  rootEntryPoints: readonly string[],
  options?: ThinLtoBuildOptions,
): ThinLtoIndex {
  const callGraph = new Map<string, string[]>();
  const functionMap = new Map<string, ThinLtoFunctionSummary>();

  for (const module of moduleSummaries) {
    for (const function_ of module.functions) {
      functionMap.set(function_.name, function_);
      const allCallees = [
        ...function_.calls,
        ...(function_.indirectCalls ?? []),
        ...(function_.dispatchTableTargets ?? []),
      ];
      callGraph.set(function_.name, allCallees);
    }
  }

  // Reachability analysis from root entry points and dynamic dispatch roots
  const moduleDispatchRoots = moduleSummaries.flatMap((m) => m.dispatchTableRoots ?? []);
  const reachable = new Set<string>();
  const queue = [...rootEntryPoints, ...(options?.dynamicDispatchRoots ?? []), ...moduleDispatchRoots];

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

  const transitiveModuleCapabilities = computeTransitiveModuleCapabilitiesInternal(
    moduleSummaries,
    callGraph,
    functionMap,
  );

  return {
    modules: moduleSummaries,
    globalCallGraph: callGraph,
    liveSymbols: reachable,
    prunedCapabilities,
    transitiveModuleCapabilities,
  };
}

/**
 * Computes the transitive closure of required capabilities for each module in the index.
 */
function computeTransitiveModuleCapabilitiesInternal(
  modules: readonly ThinLtoModuleSummary[],
  callGraph: ReadonlyMap<string, readonly string[]>,
  functionMap: ReadonlyMap<string, ThinLtoFunctionSummary>,
): ReadonlyMap<string, ReadonlySet<string>> {
  const result = new Map<string, Set<string>>();

  for (const module of modules) {
    const requiredCaps = new Set<string>();
    const visited = new Set<string>();
    const queue = [...module.functions.map((f) => f.name)];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined || visited.has(current)) continue;
      visited.add(current);

      const function_ = functionMap.get(current);
      if (function_ !== undefined) {
        for (const cap of function_.capabilityImports) {
          requiredCaps.add(cap);
        }
      }

      const callees = callGraph.get(current) ?? [];
      for (const callee of callees) {
        if (!visited.has(callee)) {
          queue.push(callee);
        }
      }
    }

    result.set(module.moduleName, requiredCaps);
  }

  return result;
}

/**
 * Public accessor for computing transitive module capabilities from a built ThinLTO index.
 */
export function computeTransitiveModuleCapabilities(index: ThinLtoIndex): ReadonlyMap<string, ReadonlySet<string>> {
  if (index.transitiveModuleCapabilities !== undefined) {
    return index.transitiveModuleCapabilities;
  }
  const functionMap = new Map<string, ThinLtoFunctionSummary>();
  for (const module of index.modules) {
    for (const function_ of module.functions) {
      functionMap.set(function_.name, function_);
    }
  }
  return computeTransitiveModuleCapabilitiesInternal(index.modules, index.globalCallGraph, functionMap);
}

/**
 * Verifies that a module's transitively reachable capabilities do not exceed its allowed or declared capability set.
 */
export function verifyTransitiveCapabilityClosure(
  index: ThinLtoIndex,
  moduleName: string,
  allowedCapabilities?: readonly string[],
): {
  readonly valid: boolean;
  readonly transitiveCapabilities: readonly string[];
  readonly undeclaredCapabilities: readonly string[];
} {
  const transitiveMap = computeTransitiveModuleCapabilities(index);
  const transitiveSet = transitiveMap.get(moduleName) ?? new Set<string>();
  const module = index.modules.find((m) => m.moduleName === moduleName);

  const allowedSet = new Set(allowedCapabilities ?? module?.importedCapabilities);
  const undeclared: string[] = [];

  for (const cap of transitiveSet) {
    if (!allowedSet.has(cap)) {
      undeclared.push(cap);
    }
  }

  return {
    valid: undeclared.length === 0,
    transitiveCapabilities: [...transitiveSet].toSorted(),
    undeclaredCapabilities: undeclared.toSorted(),
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

/**
 * Import requirement descriptor specifying two-level namespace qualification and function signature.
 */
export interface ThinLtoImportRequirement {
  readonly moduleNamespace: string;
  readonly fieldName: string;
  readonly parameterTypes: readonly string[];
  readonly returnType: string;
}

/**
 * Export definition descriptor specifying module, field name, and function signature.
 */
export interface ThinLtoExportDefinition {
  readonly moduleNamespace: string;
  readonly fieldName: string;
  readonly parameterTypes: readonly string[];
  readonly returnType: string;
}

/**
 * Result of link-time import and namespace verification across multi-module assemblies.
 */
export interface ThinLtoLinkVerificationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly resolvedBindings: ReadonlyMap<string, string>;
}

/**
 * Verifies link-time imports across modules, asserting two-level namespace qualification and 1:1 structural type signature equivalence.
 */
export function verifyLinkTimeImports(
  imports: readonly ThinLtoImportRequirement[],
  exports: readonly ThinLtoExportDefinition[],
): ThinLtoLinkVerificationResult {
  const errors: string[] = [];
  const resolvedBindings = new Map<string, string>();

  const exportMap = new Map<string, ThinLtoExportDefinition>();
  for (const exp of exports) {
    const key = `${exp.moduleNamespace}::${exp.fieldName}`;
    if (exportMap.has(key)) {
      errors.push(`Duplicate export definition for symbol '${key}'.`);
    } else {
      exportMap.set(key, exp);
    }
  }

  for (const imp of imports) {
    const key = `${imp.moduleNamespace}::${imp.fieldName}`;
    const exp = exportMap.get(key);
    if (exp === undefined) {
      errors.push(`Unresolved import '${key}': no matching export found in module namespace '${imp.moduleNamespace}'.`);
      continue;
    }

    if (imp.parameterTypes.length !== exp.parameterTypes.length) {
      errors.push(
        `Signature mismatch on import '${key}': expected ${imp.parameterTypes.length} parameters (${imp.parameterTypes.join(', ')}), but export has ${exp.parameterTypes.length} (${exp.parameterTypes.join(', ')}).`,
      );
      continue;
    }

    for (let index = 0; index < imp.parameterTypes.length; index += 1) {
      if (imp.parameterTypes[index] !== exp.parameterTypes[index]) {
        errors.push(
          `Signature parameter ${index} mismatch on import '${key}': expected '${imp.parameterTypes[index]}', got '${exp.parameterTypes[index]}'.`,
        );
      }
    }

    if (imp.returnType !== exp.returnType) {
      errors.push(`Return type mismatch on import '${key}': expected '${imp.returnType}', got '${exp.returnType}'.`);
    }

    resolvedBindings.set(key, `${exp.moduleNamespace}::${exp.fieldName}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    resolvedBindings,
  };
}

/**
 * Global variable import descriptor specifying module namespace, field name, value type, and mutability.
 */
export interface ThinLtoGlobalImport {
  readonly moduleNamespace: string;
  readonly fieldName: string;
  readonly valueType: string;
  readonly mutable: boolean;
}

/**
 * Global variable export descriptor specifying module namespace, field name, value type, and mutability.
 */
export interface ThinLtoGlobalExport {
  readonly moduleNamespace: string;
  readonly fieldName: string;
  readonly valueType: string;
  readonly mutable: boolean;
}

/**
 * Verifies link-time global variable imports, ensuring type and mutability equivalence.
 */
export function verifyLinkTimeGlobals(
  imports: readonly ThinLtoGlobalImport[],
  exports: readonly ThinLtoGlobalExport[],
): ThinLtoLinkVerificationResult {
  const errors: string[] = [];
  const resolvedBindings = new Map<string, string>();

  const exportMap = new Map<string, ThinLtoGlobalExport>();
  for (const exp of exports) {
    const key = `${exp.moduleNamespace}::${exp.fieldName}`;
    if (exportMap.has(key)) {
      errors.push(`Duplicate global export definition for symbol '${key}'.`);
    } else {
      exportMap.set(key, exp);
    }
  }

  for (const imp of imports) {
    const key = `${imp.moduleNamespace}::${imp.fieldName}`;
    const exp = exportMap.get(key);
    if (exp === undefined) {
      errors.push(
        `Unresolved global import '${key}': no matching export found in module namespace '${imp.moduleNamespace}'.`,
      );
      continue;
    }

    if (imp.valueType !== exp.valueType) {
      errors.push(
        `Global value type mismatch on import '${key}': expected '${imp.valueType}', but export has '${exp.valueType}'.`,
      );
    }

    if (imp.mutable !== exp.mutable) {
      errors.push(
        `Global mutability mismatch on import '${key}': expected mutable=${imp.mutable}, but export has mutable=${exp.mutable}.`,
      );
    }

    resolvedBindings.set(key, `${exp.moduleNamespace}::${exp.fieldName}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    resolvedBindings,
  };
}

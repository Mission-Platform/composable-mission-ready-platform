import type { FlintFunction, FlintModule } from "@mission-platform/flint-ast";

export interface ThinLtoFunctionSummary {
  readonly name: string;
  readonly module?: string;
  readonly instructionCount?: number;
  readonly isLeaf?: boolean;
  readonly inlineCandidate?: boolean;
  readonly isExported?: boolean;
  readonly calls?: readonly string[];
  readonly callees?: readonly string[];
  readonly capabilityImports?: readonly string[];
  readonly capabilities?: readonly string[];
  readonly memoryEffects?: string;
}

export interface ThinLtoModuleSummary {
  readonly module: string;
  readonly functions: readonly ThinLtoFunctionSummary[];
}

export interface ThinLtoIndex {
  readonly moduleSummaries: ReadonlyMap<string, ThinLtoModuleSummary>;
  readonly rootEntries?: readonly string[];
}

export function createModuleSummary(
  moduleName: string,
  functions: readonly ThinLtoFunctionSummary[],
): ThinLtoModuleSummary {
  return {
    module: moduleName,
    functions,
  };
}

/**
 * Builds a ThinLTO index from modules or module summaries.
 */
export function buildThinLtoIndex(
  input: readonly (FlintModule | ThinLtoModuleSummary)[],
  rootEntries: readonly string[] = [],
): ThinLtoIndex {
  const summaries = new Map<string, ThinLtoModuleSummary>();

  for (const item of input) {
    if ("module" in item && typeof item.module === "string") {
      summaries.set(item.module, item);
      continue;
    }
    const mod = item as FlintModule;
    const fnSummaries: ThinLtoFunctionSummary[] = mod.functions.map((fn) => {
      const insCount = fn.body.length;
      return {
        name: fn.name,
        module: mod.name,
        instructionCount: insCount,
        isLeaf: true,
        inlineCandidate: insCount <= 5,
        calls: [],
        callees: [],
        capabilityImports: [],
        capabilities: [],
      };
    });

    summaries.set(mod.name, {
      module: mod.name,
      functions: fnSummaries,
    });
  }

  return { moduleSummaries: summaries, rootEntries };
}

/**
 * Verifies that all capabilities reachable through the call graph are declared by the root module.
 */
export function verifyTransitiveCapabilityClosure(
  index: ThinLtoIndex,
  entryModuleName: string,
  declaredCapabilities: readonly string[] = [],
): {
  readonly valid: boolean;
  readonly transitiveCapabilities: readonly string[];
  readonly undeclaredCapabilities: readonly string[];
} {
  const declared = new Set(declaredCapabilities);
  const transitive = new Set<string>();
  const undeclared = new Set<string>();
  const visitedFunctions = new Set<string>();

  const rootSummary = index.moduleSummaries.get(entryModuleName);

  function traverseFunction(fnName: string): void {
    if (visitedFunctions.has(fnName)) return;
    visitedFunctions.add(fnName);

    for (const summary of index.moduleSummaries.values()) {
      const fn = summary.functions.find((f) => f.name === fnName);
      if (fn) {
        const caps = fn.capabilityImports ?? fn.capabilities ?? [];
        for (const cap of caps) {
          transitive.add(cap);
          if (!declared.has(cap)) {
            undeclared.add(cap);
          }
        }
        const callTargets = fn.calls ?? fn.callees ?? [];
        for (const target of callTargets) {
          traverseFunction(target);
        }
      }
    }
  }

  if (rootSummary) {
    for (const fn of rootSummary.functions) {
      traverseFunction(fn.name);
    }
  }

  return {
    valid: undeclared.size === 0,
    transitiveCapabilities: [...transitive],
    undeclaredCapabilities: [...undeclared],
  };
}

export interface LinkTimeImportDescriptor {
  readonly moduleNamespace: string;
  readonly fieldName: string;
  readonly parameterTypes?: readonly string[];
  readonly returnType?: string;
}

export interface LinkTimeExportDescriptor {
  readonly moduleNamespace: string;
  readonly fieldName: string;
  readonly parameterTypes?: readonly string[];
  readonly returnType?: string;
}

/**
 * Validates link-time function imports against available exports with two-level namespace qualification.
 */
export function verifyLinkTimeImports(
  imports: readonly LinkTimeImportDescriptor[],
  exports: readonly LinkTimeExportDescriptor[],
): {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly resolvedBindings: ReadonlyMap<string, string>;
} {
  const errors: string[] = [];
  const resolvedBindings = new Map<string, string>();

  for (const imp of imports) {
    const importKey = `${imp.moduleNamespace}::${imp.fieldName}`;
    const matching = exports.find(
      (exp) =>
        exp.moduleNamespace === imp.moduleNamespace &&
        exp.fieldName === imp.fieldName,
    );
    if (!matching) {
      errors.push(
        `Unresolved import: '${importKey}' could not be resolved in target exports`,
      );
      continue;
    }

    if (
      imp.parameterTypes &&
      matching.parameterTypes &&
      JSON.stringify(imp.parameterTypes) !==
        JSON.stringify(matching.parameterTypes)
    ) {
      errors.push(
        `Signature mismatch for '${importKey}': expected (${imp.parameterTypes.join(", ")}), received (${matching.parameterTypes.join(", ")})`,
      );
    }

    if (
      imp.returnType &&
      matching.returnType &&
      imp.returnType !== matching.returnType
    ) {
      errors.push(
        `Signature mismatch for '${importKey}': expected return '${imp.returnType}', received '${matching.returnType}'`,
      );
    }

    resolvedBindings.set(importKey, importKey);
  }

  return {
    valid: errors.length === 0,
    errors,
    resolvedBindings,
  };
}

export interface LinkTimeGlobalDescriptor {
  readonly moduleNamespace: string;
  readonly fieldName: string;
  readonly valueType: string;
  readonly mutable: boolean;
}

/**
 * Validates link-time global variable equivalence across multi-module boundaries.
 */
export function verifyLinkTimeGlobals(
  imports: readonly LinkTimeGlobalDescriptor[],
  exports: readonly LinkTimeGlobalDescriptor[],
): {
  readonly valid: boolean;
  readonly errors: readonly string[];
} {
  const errors: string[] = [];

  for (const imp of imports) {
    const globalKey = `${imp.moduleNamespace}.${imp.fieldName}`;
    const matching = exports.find(
      (exp) =>
        exp.moduleNamespace === imp.moduleNamespace &&
        exp.fieldName === imp.fieldName,
    );
    if (!matching) {
      errors.push(`Missing link-time global '${globalKey}'`);
      continue;
    }
    if (imp.valueType !== matching.valueType) {
      errors.push(
        `Global value type mismatch for '${globalKey}': expected '${imp.valueType}', received '${matching.valueType}'`,
      );
    }
    if (imp.mutable !== matching.mutable) {
      errors.push(
        `Global mutability mismatch for '${globalKey}': import is ${imp.mutable ? "mutable" : "immutable"}, export is ${matching.mutable ? "mutable" : "immutable"}`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Optimizes a module graph using ThinLTO summaries to inline cross-module candidates.
 */
export function applyThinLtoOptimization(
  entryModule: FlintModule,
  depModules: readonly FlintModule[],
  index: ThinLtoIndex = buildThinLtoIndex([entryModule, ...depModules]),
): FlintModule {
  const inlineCandidates = new Map<string, FlintFunction>();
  for (const dep of depModules) {
    const summary = index.moduleSummaries.get(dep.name);
    if (summary !== undefined) {
      for (const fn of dep.functions) {
        const fnSum = summary.functions.find((f) => f.name === fn.name);
        if (fnSum?.inlineCandidate) {
          inlineCandidates.set(fn.name, fn);
        }
      }
    }
  }

  return {
    ...entryModule,
    functions: [...entryModule.functions, ...inlineCandidates.values()],
  };
}

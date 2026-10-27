import type {
  FlintDiagnostic,
  FlintExpression,
  FlintMatchArm,
  FlintModule,
  FlintStatement,
  FlintSwitchCase,
} from "@mission-platform/flint-ast";

import {
  buildFlintModuleGraph,
  type FlintModuleGraph,
  type FlintResolvedModule,
} from "./graph.js";
import { buildFlintAbiManifest, type FlintAbiManifest } from "./manifest.js";
import {
  applyThinLtoOptimization,
  buildThinLtoIndex,
  type ThinLtoIndex,
} from "./thinlto.js";

function renamePrivateFunctions(mod: FlintModule, prefix: string): FlintModule {
  const privateFnNames = new Set(
    mod.functions.filter((fn) => !fn.exported).map((fn) => fn.name),
  );
  if (privateFnNames.size === 0) return mod;

  const rename = (name: string): string => {
    return privateFnNames.has(name) ? `${prefix}_${name}` : name;
  };

  const transformExpr = (expr: FlintExpression): FlintExpression => {
    switch (expr.kind) {
      case "call":
        return {
          ...expr,
          callee: rename(expr.callee),
          arguments: expr.arguments.map(transformExpr),
        };
      case "function-value":
        return {
          ...expr,
          name: rename(expr.name),
        };
      case "binary":
        return {
          ...expr,
          left: transformExpr(expr.left),
          right: transformExpr(expr.right),
        };
      case "unary":
        return {
          ...expr,
          operand: transformExpr(expr.operand),
        };
      case "struct-value": {
        const fields: Record<string, FlintExpression> = {};
        for (const [k, v] of Object.entries(expr.fields)) {
          fields[k] = transformExpr(v);
        }
        return { ...expr, fields };
      }
      case "array-literal":
        return {
          ...expr,
          elements: expr.elements.map(transformExpr),
        };
      case "vector-literal":
        return {
          ...expr,
          elements: expr.elements.map(transformExpr),
        };
      case "index":
        return {
          ...expr,
          receiver: transformExpr(expr.receiver),
          index: transformExpr(expr.index),
        };
      case "match":
        return {
          ...expr,
          value: transformExpr(expr.value),
          arms: expr.arms.map((arm: FlintMatchArm) => ({
            ...arm,
            value: transformExpr(arm.value),
          })),
        };
      case "comptime-expression":
        return {
          ...expr,
          expression: transformExpr(expr.expression),
        };
      default:
        return expr;
    }
  };

  const transformStmt = (stmt: FlintStatement): FlintStatement => {
    switch (stmt.kind) {
      case "let":
        return {
          ...stmt,
          value: transformExpr(stmt.value),
        };
      case "assignment":
        return {
          ...stmt,
          value: transformExpr(stmt.value),
          ...(stmt.index ? { index: transformExpr(stmt.index) } : {}),
        };
      case "return":
        return {
          ...stmt,
          ...(stmt.value ? { value: transformExpr(stmt.value) } : {}),
        };
      case "expression-statement":
        return {
          ...stmt,
          expression: transformExpr(stmt.expression),
        };
      case "if":
        return {
          ...stmt,
          condition: transformExpr(stmt.condition),
          consequent: stmt.consequent.map(transformStmt),
          ...(stmt.alternate
            ? { alternate: stmt.alternate.map(transformStmt) }
            : {}),
        };
      case "while":
        return {
          ...stmt,
          condition: transformExpr(stmt.condition),
          body: stmt.body.map(transformStmt),
        };
      case "for":
        return {
          ...stmt,
          ...(stmt.initializer
            ? { initializer: transformStmt(stmt.initializer) }
            : {}),
          condition: transformExpr(stmt.condition),
          ...(stmt.update ? { update: transformStmt(stmt.update) } : {}),
          body: stmt.body.map(transformStmt),
        };
      case "do-while":
        return {
          ...stmt,
          body: stmt.body.map(transformStmt),
          condition: transformExpr(stmt.condition),
        };
      case "yield":
        return {
          ...stmt,
          value: transformExpr(stmt.value),
        };
      case "iterator-loop":
        return {
          ...stmt,
          iterator: transformExpr(stmt.iterator),
          body: stmt.body.map(transformStmt),
        };
      case "match-statement":
        return {
          ...stmt,
          value: transformExpr(stmt.value),
          arms: stmt.arms.map((arm: FlintMatchArm) => ({
            ...arm,
            value: transformExpr(arm.value),
          })),
        };
      case "switch":
        return {
          ...stmt,
          value: transformExpr(stmt.value),
          cases: stmt.cases.map((c: FlintSwitchCase) => ({
            ...c,
            body: c.body.map(transformStmt),
          })),
          ...(stmt.defaultCase
            ? { defaultCase: stmt.defaultCase.map(transformStmt) }
            : {}),
        };
      default:
        return stmt;
    }
  };

  const functions = mod.functions.map((fn) => ({
    ...fn,
    name: rename(fn.name),
    body: fn.body.map(transformStmt),
  }));

  return {
    ...mod,
    functions,
  };
}

export interface FlintLinkResult {
  readonly linkedModule: FlintModule;
  readonly manifest: FlintAbiManifest;
  readonly graph: FlintModuleGraph;
  readonly thinLtoIndex?: ThinLtoIndex;
}

export interface FlintLinkOptions {
  readonly enableThinLto?: boolean;
}

/**
 * Static Link Orchestrator for Flint compilation graphs.
 * Connects entry modules with dependent modules, validates topological graphs,
 * runs ThinLTO inlining passes, and produces a consolidated module ready for backend emission.
 */
export class FlintLinker {
  public link(
    entryModule: FlintModule,
    resolvedModules: ReadonlyMap<string, FlintModule> = new Map(),
    options: FlintLinkOptions = {},
  ): FlintLinkResult {
    const graph = buildFlintModuleGraph(entryModule, resolvedModules);
    const depModules = [...resolvedModules.values()];

    let finalModule = entryModule;
    let thinLtoIndex: ThinLtoIndex | undefined;

    if (options.enableThinLto && depModules.length > 0) {
      thinLtoIndex = buildThinLtoIndex([entryModule, ...depModules]);
      finalModule = applyThinLtoOptimization(
        entryModule,
        depModules,
        thinLtoIndex,
      );
    } else if (depModules.length > 0) {
      const mergedFunctions = [...entryModule.functions];
      for (const dep of depModules) {
        const safePrefix = dep.name.replace(/[^a-zA-Z0-9_]/g, "_");
        const isolatedDep = renamePrivateFunctions(dep, safePrefix);
        for (const fn of isolatedDep.functions) {
          if (!mergedFunctions.some((f) => f.name === fn.name)) {
            mergedFunctions.push(fn);
          }
        }
      }
      finalModule = {
        ...entryModule,
        functions: mergedFunctions,
      };
    }

    const manifest = buildFlintAbiManifest(finalModule, entryModule.name);

    return {
      linkedModule: finalModule,
      manifest,
      graph,
      ...(thinLtoIndex === undefined ? {} : { thinLtoIndex }),
    };
  }
}

export function linkFlintModules(
  entryModule: FlintModule,
  resolvedModules: ReadonlyMap<string, FlintModule> = new Map(),
  options: FlintLinkOptions = {},
): FlintLinkResult {
  return new FlintLinker().link(entryModule, resolvedModules, options);
}

export interface FlintLinkValidationResult {
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly staticModules: readonly FlintModule[];
}

/**
 * Validates links and produces merged static module components from a module graph.
 */
export function validateFlintLinks(
  graph: FlintModuleGraph,
  _configuration: unknown = {},
): FlintLinkValidationResult {
  const staticModules: FlintModule[] = [];
  const diagnostics: FlintDiagnostic[] = [];

  for (const rootModule of graph.modules) {
    const visited = new Set<string>();
    const toMerge: FlintResolvedModule[] = [];

    const visit = (fileName: string): void => {
      if (visited.has(fileName)) return;
      visited.add(fileName);
      const mod = graph.modules.find((m) => m.fileName === fileName);
      if (mod) {
        toMerge.push(mod);
        for (const edge of graph.edges) {
          if (edge.importer === fileName && edge.linkMode === "static") {
            visit(edge.resolved);
          }
        }
      }
    };

    visit(rootModule.fileName);

    const mergedFunctions = [...rootModule.module.functions];
    const exportedNames = new Map<string, string>();
    for (const fn of rootModule.module.functions) {
      if (fn.exported) {
        exportedNames.set(fn.name, rootModule.moduleId);
      }
    }

    const seenFunctions = new Set(mergedFunctions.map((f) => f.name));
    const mergedStructs = [...rootModule.module.structs];
    const seenStructs = new Set(mergedStructs.map((s) => s.name));
    const mergedEnums = [...rootModule.module.enums];
    const seenEnums = new Set(mergedEnums.map((e) => e.name));

    const isolatedModules = new Map<string, FlintModule>();
    for (const dep of toMerge) {
      if (dep.fileName === rootModule.fileName) {
        isolatedModules.set(dep.fileName, dep.module);
      } else {
        const safePrefix = dep.moduleId.replace(/[^a-zA-Z0-9_]/g, "_");
        isolatedModules.set(
          dep.fileName,
          renamePrivateFunctions(dep.module, safePrefix),
        );
      }
    }

    for (const dep of toMerge) {
      if (dep.fileName === rootModule.fileName) continue;
      const isolatedDep = isolatedModules.get(dep.fileName) ?? dep.module;
      for (const fn of isolatedDep.functions) {
        if (fn.exported) {
          if (exportedNames.has(fn.name)) {
            diagnostics.push({
              code: "FLINT-LINK-004",
              severity: "error",
              phase: "link",
              message: `Export collision: symbol '${fn.name}' is exported by both '${exportedNames.get(fn.name)}' and '${dep.moduleId}'.`,
              fileName: dep.fileName,
              span: fn.span,
            });
          } else {
            exportedNames.set(fn.name, dep.moduleId);
          }
        }
        if (!seenFunctions.has(fn.name)) {
          seenFunctions.add(fn.name);
          mergedFunctions.push(fn);
        }
      }
      for (const struct of isolatedDep.structs) {
        if (!seenStructs.has(struct.name)) {
          seenStructs.add(struct.name);
          mergedStructs.push(struct);
        }
      }
      for (const enumDecl of isolatedDep.enums) {
        if (!seenEnums.has(enumDecl.name)) {
          seenEnums.add(enumDecl.name);
          mergedEnums.push(enumDecl);
        }
      }
    }

    for (const dep of toMerge) {
      for (const edge of graph.edges) {
        if (edge.importer === dep.fileName && edge.linkMode === "static") {
          const target = graph.modules.find(
            (m) => m.fileName === edge.resolved,
          );
          const importDecl = dep.module.sourceImports.find(
            (imp) => imp.source === edge.source,
          );
          if (target && importDecl?.alias) {
            const targetModule =
              isolatedModules.get(target.fileName) ?? target.module;
            for (const fn of targetModule.functions) {
              if (fn.exported) {
                const qualifiedName = `${importDecl.alias}.${fn.name}`;
                if (!seenFunctions.has(qualifiedName)) {
                  seenFunctions.add(qualifiedName);
                  mergedFunctions.push({
                    ...fn,
                    name: qualifiedName,
                    exported: false,
                  });
                }
              }
            }
          }
        }
      }
    }

    // Filter out static imports so type-checking doesn't see conflicting namespace bindings
    const staticImportSources = new Set(
      graph.edges
        .filter(
          (edge) =>
            edge.importer === rootModule.fileName && edge.linkMode === "static",
        )
        .map((edge) => edge.source),
    );
    const dynamicSourceImports = rootModule.module.sourceImports.filter(
      (imp) => !staticImportSources.has(imp.source),
    );

    staticModules.push({
      ...rootModule.module,
      name: rootModule.moduleId,
      sourceImports: dynamicSourceImports,
      functions: mergedFunctions,
      structs: mergedStructs,
      enums: mergedEnums,
    });
  }

  return {
    diagnostics,
    staticModules,
  };
}

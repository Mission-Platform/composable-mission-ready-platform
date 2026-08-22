import { createDiagnostic, type ForgeWebScriptDiagnostic } from './diagnostics.js';

import type {
  ForgeWebScriptExpression,
  ForgeWebScriptFunction,
  ForgeWebScriptModule,
  ForgeWebScriptStatement,
} from './ast.js';
import type { ForgeWebScriptLinkConfiguration, ForgeWebScriptModuleEdge, ForgeWebScriptModuleGraph } from './graph.js';

export interface ForgeWebScriptLinkResult {
  readonly graph: ForgeWebScriptModuleGraph;
  readonly diagnostics: readonly ForgeWebScriptDiagnostic[];
  readonly staticModules: readonly ForgeWebScriptModule[];
  readonly dynamicEdges: readonly ForgeWebScriptModuleEdge[];
}

const emptySpan = { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 } as const;

function callableSignature(declaration: ForgeWebScriptFunction): string {
  return `${declaration.parameters.map(({ type }) => type.name).join(',')}->${declaration.result.name}`;
}

function moduleLinkPrefix(moduleId: string): string {
  return `__${moduleId.replace(/[^A-Za-z0-9_]/g, '_')}__`;
}

function namespacePrivateFunctions(
  module: ForgeWebScriptModule,
  moduleId: string,
  linkedCalls: ReadonlyMap<string, string> = new Map(),
  options: { readonly namespaceExports?: boolean } = {},
): ForgeWebScriptModule['functions'] {
  const namespaceExports = options.namespaceExports === true;
  const privateNames = new Set(module.functions.filter(({ exported }) => !exported).map(({ name }) => name));
  const exportNames = new Set(module.functions.filter(({ exported }) => exported).map(({ name }) => name));
  const prefix = moduleLinkPrefix(moduleId);
  const rename = (name: string): string => {
    const linked = linkedCalls.get(name) ?? name;
    if (privateNames.has(linked)) return `${prefix}${linked}`;
    if (namespaceExports && exportNames.has(linked) && !linkedCalls.has(name)) return `${prefix}${linked}`;
    return linked;
  };

  const expression = (value: ForgeWebScriptExpression): ForgeWebScriptExpression => {
    switch (value.kind) {
      case 'call':
        return { ...value, callee: rename(value.callee), arguments: value.arguments.map(expression) };
      case 'function-value':
        return { ...value, name: rename(value.name) };
      case 'binary':
        return { ...value, left: expression(value.left), right: expression(value.right) };
      case 'unary':
        return { ...value, operand: expression(value.operand) };
      case 'struct-value':
        return { ...value, fields: Object.fromEntries(Object.entries(value.fields).map(([name, field]) => [name, expression(field)])) };
      case 'enum-value':
        return { ...value, arguments: value.arguments.map(expression) };
      case 'array-literal':
        return { ...value, elements: value.elements.map(expression) };
      case 'vector-literal':
        return { ...value, elements: value.elements.map(expression) };
      case 'index':
        return { ...value, receiver: expression(value.receiver), index: expression(value.index) };
      case 'match':
        return {
          ...value,
          value: expression(value.value),
          arms: value.arms.map((arm) => ({ ...arm, value: expression(arm.value) })),
        };
      case 'literal':
      case 'identifier':
        return value;
    }
  };

  const statements = (values: readonly ForgeWebScriptStatement[]): ForgeWebScriptStatement[] => values.map((value) => {
    switch (value.kind) {
      case 'let':
        return { ...value, value: expression(value.value) };
      case 'assignment':
        return { ...value, value: expression(value.value), ...(value.index === undefined ? {} : { index: expression(value.index) }) };
      case 'return':
        return { ...value, ...(value.value === undefined ? {} : { value: expression(value.value) }) };
      case 'expression-statement':
        return { ...value, expression: expression(value.expression) };
      case 'if':
        return {
          ...value,
          condition: expression(value.condition),
          consequent: statements(value.consequent),
          ...(value.alternate === undefined ? {} : { alternate: statements(value.alternate) }),
        };
      case 'while':
      case 'do-while':
        return { ...value, condition: expression(value.condition), body: statements(value.body) };
      case 'for':
        return {
          ...value,
          ...(value.initializer === undefined ? {} : { initializer: statements([value.initializer])[0] }),
          condition: expression(value.condition),
          ...(value.update === undefined ? {} : { update: statements([value.update])[0] }),
          body: statements(value.body),
        };
      case 'iterator-loop':
        return { ...value, iterator: expression(value.iterator), body: statements(value.body) };
      case 'yield':
        return { ...value, value: expression(value.value) };
      case 'match-statement':
        return {
          ...value,
          value: expression(value.value),
          arms: value.arms.map((arm) => ({ ...arm, value: expression(arm.value) })),
        };
      case 'switch':
        return {
          ...value,
          value: expression(value.value),
          cases: value.cases.map((arm) => ({ ...arm, body: statements(arm.body) })),
          ...(value.defaultCase === undefined ? {} : { defaultCase: statements(value.defaultCase) }),
        };
    }
  });

  return module.functions.map((functionDeclaration) => {
    const nextName = rename(functionDeclaration.name);
    return {
      ...functionDeclaration,
      name: nextName,
      // Non-entry modules keep callable bodies but drop ABI export surface after namespacing.
      exported: namespaceExports ? false : functionDeclaration.exported,
      body: statements(functionDeclaration.body),
    };
  });
}

function staticComponents(
  graph: ForgeWebScriptModuleGraph,
  diagnostics: ForgeWebScriptDiagnostic[],
): ForgeWebScriptModule[] {
  const byFile = new Map(graph.modules.map((module) => [module.fileName, module]));
  const roots = graph.modules.filter(
    (module) => !graph.edges.some((edge) => edge.linkMode === 'static' && edge.resolved === module.fileName),
  );
  const result: ForgeWebScriptModule[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    const files: string[] = [];
    // The traversal closes over this component's `files` and `seen` state.
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const visit = (fileName: string): void => {
      if (seen.has(fileName)) return;
      seen.add(fileName);
      const module = byFile.get(fileName);
      if (module === undefined) return;
      files.push(fileName);
      for (const edge of graph.edges.filter(
        (candidate) => candidate.importer === fileName && candidate.linkMode === 'static',
      ))
        visit(edge.resolved);
    };
    visit(root.fileName);
    if (files.length === 0) continue;
    const modules = files
      .map((fileName) => byFile.get(fileName))
      .filter((module): module is NonNullable<typeof module> => module !== undefined);
    const exports = new Map<string, { moduleId: string; signature: string }>();
    for (const linkedModule of modules) {
      // Cross-project exports are namespaced during flattening, so they cannot collide.
      // Only same-project bare ABI exports can genuinely clash.
      if (linkedModule.projectRoot !== root.projectRoot) continue;
      for (const declaration of (Array.isArray(linkedModule.module.functions) ? linkedModule.module.functions : []).filter(
        ({ exported }) => exported,
      )) {
        const signature = callableSignature(declaration);
        const previous = exports.get(declaration.name);
        if (previous === undefined) exports.set(declaration.name, { moduleId: linkedModule.moduleId, signature });
        else {
          diagnostics.push(
            createDiagnostic(
              linkedModule.fileName,
              'link',
              previous.signature === signature ? 'FWS-LINK-003' : 'FWS-LINK-004',
              previous.signature === signature
                ? `Static link exports '${declaration.name}' more than once.`
                : `Static link export '${declaration.name}' has incompatible signatures.`,
              declaration.span,
              'error',
              'Rename one exported function in the static component.',
            ),
          );
        }
      }
    }
    const merged: ForgeWebScriptModule = {
      ...root.module,
      imports: modules.flatMap(({ module }) => (Array.isArray(module.imports) ? module.imports : [])),
      sourceImports: [],
      structs: modules.flatMap(({ module }) => (Array.isArray(module.structs) ? module.structs : [])),
      enums: modules.flatMap(({ module }) => (Array.isArray(module.enums) ? module.enums : [])),
      interfaces: modules.flatMap(({ module }) => (Array.isArray(module.interfaces) ? module.interfaces : [])),
      functions: modules.flatMap(({ fileName, projectRoot, module, moduleId }) => {
        if (!Array.isArray(module.functions)) return [];
        // Exports from other projects are namespaced so shared helper names
        // (itoa, gf_mul, ...) can coexist once flattened. Same-project exports
        // keep their bare ABI names so the entry surface stays stable.
        const sameProject = projectRoot === root.projectRoot;
        const linkedCalls = new Map<string, string>();
        for (const sourceImport of module.sourceImports) {
          const edge = graph.edges.find(
            (candidate) =>
              candidate.importer === fileName && candidate.source === sourceImport.source && candidate.linkMode === 'static',
          );
          const target = edge === undefined ? undefined : byFile.get(edge.resolved);
          if (target === undefined) continue;
          // Rewrite the caller so it targets the namespaced symbol when the target
          // export lives in another project.
          const targetSameProject = target.projectRoot === root.projectRoot;
          const targetPrefix = moduleLinkPrefix(target.moduleId);
          for (const declaration of target.module.functions ?? []) {
            if (!declaration.exported) continue;
            const flattenedName = targetSameProject ? declaration.name : `${targetPrefix}${declaration.name}`;
            linkedCalls.set(`${sourceImport.alias}.${declaration.name}`, flattenedName);
          }
        }
        return namespacePrivateFunctions(module, moduleId, linkedCalls, {
          namespaceExports: !sameProject,
        });
      }),
    };
    result.push(merged);
  }
  return result;
}

export function validateForgeWebScriptLinks(
  graph: ForgeWebScriptModuleGraph,
  configuration: ForgeWebScriptLinkConfiguration = {},
): ForgeWebScriptLinkResult {
  const diagnostics: ForgeWebScriptDiagnostic[] = [];
  const modulesByFile = new Map(graph.modules.map((module) => [module.fileName, module]));
  const dynamicEdges = graph.edges.filter((edge) => edge.linkMode === 'dynamic');
  for (const edge of graph.edges) {
    const target = modulesByFile.get(edge.resolved);
    const importer = modulesByFile.get(edge.importer);
    if (target === undefined || importer === undefined) continue;
    if (edge.linkMode === 'dynamic' && importer.projectRoot === target.projectRoot)
      diagnostics.push(
        createDiagnostic(
          edge.importer,
          'link',
          'FWS-LINK-002',
          'Dynamic linking within one project is not supported.',
          edge.span,
          'error',
          'Use static linking for same-project source modules.',
        ),
      );
    const configuredMode =
      configuration.linkModes?.[`${importer.projectRoot}->${target.projectRoot}`] ??
      configuration.linkModes?.[target.projectRoot];
    if (
      importer.projectRoot !== target.projectRoot &&
      edge.linkMode === 'static' &&
      configuredMode === undefined &&
      configuration.crossProjectLinkMode === undefined &&
      configuration.defaultLinkMode === undefined &&
      configuration.linkProfile === undefined
    )
      diagnostics.push(
        createDiagnostic(
          edge.importer,
          'link',
          'FWS-LINK-005',
          'Cross-project static linking requires explicit configuration.',
          edge.span,
          'error',
          "Set crossProjectLinkMode to 'static' or 'dynamic'.",
        ),
      );
  }
  const adjacency = new Map<string, readonly ForgeWebScriptModuleEdge[]>();
  for (const module of graph.modules)
    adjacency.set(
      module.fileName,
      graph.edges.filter((edge) => edge.importer === module.fileName && edge.linkMode === 'static'),
    );
  const active = new Set<string>();
  const complete = new Set<string>();
  const visit = (fileName: string): void => {
    if (active.has(fileName)) {
      const module = modulesByFile.get(fileName);
      diagnostics.push(
        createDiagnostic(
          fileName,
          'link',
          'FWS-LINK-001',
          'Static source module cycle detected.',
          module?.module.span ?? emptySpan,
          'error',
          'Use dynamic linking at the project boundary or remove the cycle.',
        ),
      );
      return;
    }
    if (complete.has(fileName)) return;
    active.add(fileName);
    for (const edge of adjacency.get(fileName) ?? []) visit(edge.resolved);
    active.delete(fileName);
    complete.add(fileName);
  };
  for (const module of graph.modules) visit(module.fileName);
  return { graph, diagnostics, staticModules: staticComponents(graph, diagnostics), dynamicEdges };
}

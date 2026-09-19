import { createDiagnostic, type FlintDiagnostic } from './diagnostics.js';

import type { FlintExpression, FlintFunction, FlintModule, FlintStatement } from './ast.js';
import type { FlintLinkConfiguration, FlintModuleEdge, FlintModuleGraph, FlintResolvedModule } from './graph.js';

/**
 * Result of validating and linking a Flint module dependency graph.
 */
export interface FlintLinkResult {
  readonly graph: FlintModuleGraph;
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly staticModules: readonly FlintModule[];
  readonly dynamicEdges: readonly FlintModuleEdge[];
}

const emptySpan = { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 } as const;

/**
 * Computes a normalized parameter-and-return signature key for a function declaration.
 *
 * @param declaration - Function declaration AST node.
 * @returns A string in the form `paramType1,paramType2->resultType`.
 */
function callableSignature(declaration: FlintFunction): string {
  return `${declaration.parameters.map(({ type }) => type.name).join(',')}->${declaration.result.name}`;
}

/**
 * Derives a sanitized identifier prefix for module-private symbols.
 *
 * @param moduleId - Logical module identifier.
 * @returns A sanitized symbol prefix string.
 */
function moduleLinkPrefix(moduleId: string): string {
  return `__${moduleId.replaceAll(/[^A-Za-z0-9_]/g, '_')}__`;
}

/**
 * Context state for namespacing and renaming function calls within a module.
 */
interface NamespaceContext {
  readonly prefix: string;
  readonly privateNames: ReadonlySet<string>;
  readonly exportNames: ReadonlySet<string>;
  readonly linkedCalls: ReadonlyMap<string, string>;
  readonly namespaceExports: boolean;
}

/**
 * Renames an identifier if it targets a module-private symbol or an export requiring namespacing.
 *
 * @param name - Original symbol name.
 * @param context - Active namespacing context.
 * @returns The renamed symbol or original name.
 */
function renameIdentifier(name: string, context: NamespaceContext): string {
  const linked = context.linkedCalls.get(name) ?? name;
  if (context.privateNames.has(linked)) return `${context.prefix}${linked}`;
  if (context.namespaceExports && context.exportNames.has(linked) && !context.linkedCalls.has(name)) {
    return `${context.prefix}${linked}`;
  }
  return linked;
}

/**
 * Renames call and function-value expressions.
 *
 * @param value - Call or function-value expression node.
 * @param context - Active namespacing context.
 * @param transform - Recursive expression transformer callback.
 * @returns Updated expression AST node.
 */
function namespaceCallOrFunctionExpression(
  value: FlintExpression & { kind: 'call' | 'function-value' },
  context: NamespaceContext,
  transform: (expr: FlintExpression) => FlintExpression,
): FlintExpression {
  if (value.kind === 'call') {
    return {
      ...value,
      callee: renameIdentifier(value.callee, context),
      arguments: value.arguments.map((argument) => transform(argument)),
    };
  }
  return { ...value, name: renameIdentifier(value.name, context) };
}

/**
 * Recursively rewrites binary, unary, and index operator expressions.
 *
 * @param value - Operator expression node.
 * @param transform - Recursive expression transformer callback.
 * @returns Updated expression AST node.
 */
function namespaceOperatorExpression(
  value: FlintExpression & { kind: 'binary' | 'unary' | 'index' },
  transform: (expr: FlintExpression) => FlintExpression,
): FlintExpression {
  switch (value.kind) {
    case 'binary': {
      return { ...value, left: transform(value.left), right: transform(value.right) };
    }
    case 'unary': {
      return { ...value, operand: transform(value.operand) };
    }
    case 'index': {
      return { ...value, receiver: transform(value.receiver), index: transform(value.index) };
    }
  }
}

/**
 * Recursively rewrites aggregate and structural expressions.
 *
 * @param value - Aggregate expression node.
 * @param transform - Recursive expression transformer callback.
 * @returns Updated expression AST node.
 */
function namespaceAggregateExpression(
  value: FlintExpression & { kind: 'struct-value' | 'enum-value' | 'array-literal' | 'vector-literal' | 'match' },
  transform: (expr: FlintExpression) => FlintExpression,
): FlintExpression {
  switch (value.kind) {
    case 'struct-value': {
      return {
        ...value,
        fields: Object.fromEntries(Object.entries(value.fields).map(([name, field]) => [name, transform(field)])),
      };
    }
    case 'enum-value': {
      return { ...value, arguments: value.arguments.map((argument) => transform(argument)) };
    }
    case 'array-literal':
    case 'vector-literal': {
      return { ...value, elements: value.elements.map((element) => transform(element)) };
    }
    case 'match': {
      return {
        ...value,
        value: transform(value.value),
        arms: value.arms.map((arm) => ({ ...arm, value: transform(arm.value) })),
      };
    }
  }
}

/**
 * Rewrites function-call identifiers in expressions according to linking rules.
 *
 * @param value - Expression AST node to transform.
 * @param context - Active namespacing context.
 * @returns The rewritten expression node.
 */
function namespaceExpression(value: FlintExpression, context: NamespaceContext): FlintExpression {
  if (value.kind === 'literal' || value.kind === 'identifier') {
    return value;
  }
  if (value.kind === 'call' || value.kind === 'function-value') {
    return namespaceCallOrFunctionExpression(value, context, (expr) => namespaceExpression(expr, context));
  }
  if (value.kind === 'binary' || value.kind === 'unary' || value.kind === 'index') {
    return namespaceOperatorExpression(value, (expr) => namespaceExpression(expr, context));
  }
  return namespaceAggregateExpression(value, (expr) => namespaceExpression(expr, context));
}

/**
 * Rewrites linear statements (let, assignment, return, expression-statement, yield).
 *
 * @param value - Linear statement AST node.
 * @param context - Active namespacing context.
 * @returns Rewritten statement AST node.
 */
function namespaceLinearStatement(
  value: FlintStatement & { kind: 'let' | 'assignment' | 'return' | 'expression-statement' | 'yield' },
  context: NamespaceContext,
): FlintStatement {
  switch (value.kind) {
    case 'let': {
      return { ...value, value: namespaceExpression(value.value, context) };
    }
    case 'assignment': {
      return {
        ...value,
        value: namespaceExpression(value.value, context),
        ...(value.index === undefined ? {} : { index: namespaceExpression(value.index, context) }),
      };
    }
    case 'return': {
      return {
        ...value,
        ...(value.value === undefined ? {} : { value: namespaceExpression(value.value, context) }),
      };
    }
    case 'expression-statement': {
      return { ...value, expression: namespaceExpression(value.expression, context) };
    }
    case 'yield': {
      return { ...value, value: namespaceExpression(value.value, context) };
    }
  }
}

/**
 * Rewrites branch and matching statements (if, switch, match-statement).
 *
 * @param value - Branch statement AST node.
 * @param context - Active namespacing context.
 * @returns Rewritten statement AST node.
 */
function namespaceBranchStatement(
  value: FlintStatement & { kind: 'if' | 'switch' | 'match-statement' },
  context: NamespaceContext,
): FlintStatement {
  switch (value.kind) {
    case 'if': {
      return {
        ...value,
        condition: namespaceExpression(value.condition, context),
        consequent: namespaceStatements(value.consequent, context),
        ...(value.alternate === undefined ? {} : { alternate: namespaceStatements(value.alternate, context) }),
      };
    }
    case 'switch': {
      return {
        ...value,
        value: namespaceExpression(value.value, context),
        cases: value.cases.map((arm) => ({ ...arm, body: namespaceStatements(arm.body, context) })),
        ...(value.defaultCase === undefined ? {} : { defaultCase: namespaceStatements(value.defaultCase, context) }),
      };
    }
    case 'match-statement': {
      return {
        ...value,
        value: namespaceExpression(value.value, context),
        arms: value.arms.map((arm) => ({ ...arm, value: namespaceExpression(arm.value, context) })),
      };
    }
  }
}

/**
 * Rewrites loop statements (while, do-while, for, iterator-loop).
 *
 * @param value - Loop statement AST node.
 * @param context - Active namespacing context.
 * @returns Rewritten statement AST node.
 */
function namespaceLoopStatement(
  value: Extract<FlintStatement, { kind: LoopStatementKind }>,
  context: NamespaceContext,
): FlintStatement {
  switch (value.kind) {
    case 'while':
    case 'do-while': {
      return {
        ...value,
        condition: namespaceExpression(value.condition, context),
        body: namespaceStatements(value.body, context),
      };
    }
    case 'for': {
      return {
        ...value,
        ...(value.initializer === undefined
          ? {}
          : { initializer: namespaceStatements([value.initializer], context)[0] }),
        condition: namespaceExpression(value.condition, context),
        ...(value.update === undefined ? {} : { update: namespaceStatements([value.update], context)[0] }),
        body: namespaceStatements(value.body, context),
      };
    }
    case 'iterator-loop': {
      return {
        ...value,
        iterator: namespaceExpression(value.iterator, context),
        body: namespaceStatements(value.body, context),
      };
    }
  }
}

/**
 * AST statement kinds representing linear, non-branching control flow statements.
 */
type LinearStatementKind = 'let' | 'assignment' | 'return' | 'expression-statement' | 'yield';

/**
 * AST statement kinds representing branching, multi-path, or pattern-matching statements.
 */
type BranchStatementKind = 'if' | 'switch' | 'match-statement';

/**
 * AST statement kinds representing iterative loop statements.
 */
type LoopStatementKind = 'while' | 'do-while' | 'for' | 'iterator-loop';

const LINEAR_STATEMENT_KINDS: ReadonlySet<string> = new Set<LinearStatementKind>([
  'let',
  'assignment',
  'return',
  'expression-statement',
  'yield',
]);

const BRANCH_STATEMENT_KINDS: ReadonlySet<string> = new Set<BranchStatementKind>(['if', 'switch', 'match-statement']);

/**
 * Type predicate determining whether a statement is a linear control flow statement.
 *
 * @param statement - Statement AST node to test.
 * @returns `true` if statement kind is linear, `false` otherwise.
 */
function isLinearStatement(
  statement: FlintStatement,
): statement is Extract<FlintStatement, { kind: LinearStatementKind }> {
  return LINEAR_STATEMENT_KINDS.has(statement.kind);
}

/**
 * Type predicate determining whether a statement is a branching or matching statement.
 *
 * @param statement - Statement AST node to test.
 * @returns `true` if statement kind is branching, `false` otherwise.
 */
function isBranchStatement(
  statement: FlintStatement,
): statement is Extract<FlintStatement, { kind: BranchStatementKind }> {
  return BRANCH_STATEMENT_KINDS.has(statement.kind);
}

/**
 * Rewrites a single statement node, dispatching by statement category.
 *
 * @param value - Statement AST node.
 * @param context - Active namespacing context.
 * @returns Rewritten statement AST node.
 */
function namespaceStatement(value: FlintStatement, context: NamespaceContext): FlintStatement {
  if (isLinearStatement(value)) {
    return namespaceLinearStatement(value, context);
  }
  if (isBranchStatement(value)) {
    return namespaceBranchStatement(value, context);
  }
  return namespaceLoopStatement(value, context);
}

/**
 * Rewrites a list of statement nodes using the active namespacing context.
 *
 * @param values - List of statement AST nodes.
 * @param context - Active namespacing context.
 * @returns Array of transformed statement AST nodes.
 */
function namespaceStatements(values: readonly FlintStatement[], context: NamespaceContext): FlintStatement[] {
  return values.map((value) => namespaceStatement(value, context));
}

/**
 * Prefixes private and non-entry exported functions to avoid collisions when merging static components.
 *
 * @param module - Module AST being transformed.
 * @param moduleId - Module identifier for prefix generation.
 * @param linkedCalls - Mapping from original call names to resolved symbol names.
 * @param options - Namespacing configuration options.
 * @returns Transformed function declarations.
 */
function namespacePrivateFunctions(
  module: FlintModule,
  moduleId: string,
  linkedCalls: ReadonlyMap<string, string> = new Map(),
  options: { readonly namespaceExports?: boolean } = {},
): FlintModule['functions'] {
  const namespaceExports = options.namespaceExports === true;
  const privateNames = new Set(module.functions.filter(({ exported }) => !exported).map(({ name }) => name));
  const exportNames = new Set(module.functions.filter(({ exported }) => exported).map(({ name }) => name));
  const prefix = moduleLinkPrefix(moduleId);
  const context: NamespaceContext = {
    prefix,
    privateNames,
    exportNames,
    linkedCalls,
    namespaceExports,
  };

  return module.functions.map((functionDeclaration) => {
    const nextName = renameIdentifier(functionDeclaration.name, context);
    return {
      ...functionDeclaration,
      name: nextName,
      // Non-entry modules keep callable bodies but drop ABI export surface after namespacing.
      exported: namespaceExports ? false : functionDeclaration.exported,
      body: namespaceStatements(functionDeclaration.body, context),
    };
  });
}

/**
 * Traverses reachable source files for a static component starting from a root module.
 *
 * @param rootFileName - File path of the component root module.
 * @param byFile - Map of resolved modules indexed by file name.
 * @param staticEdgesByImporter - Map of static edges grouped by importer file name.
 * @param seen - Set tracking previously visited file names across all components.
 * @returns Ordered list of file names belonging to this static component.
 */
function collectComponentFiles(
  rootFileName: string,
  byFile: ReadonlyMap<string, FlintResolvedModule>,
  staticEdgesByImporter: ReadonlyMap<string, readonly FlintModuleEdge[]>,
  seen: Set<string>,
): string[] {
  const files: string[] = [];
  const visit = (fileName: string): void => {
    if (seen.has(fileName)) return;
    seen.add(fileName);
    const module = byFile.get(fileName);
    if (module === undefined) return;
    files.push(fileName);
    for (const edge of staticEdgesByImporter.get(fileName) ?? []) {
      visit(edge.resolved);
    }
  };
  visit(rootFileName);
  return files;
}

/**
 * Validates that same-project modules within a static component do not export colliding function names.
 *
 * @param root - Root module of the static component.
 * @param modules - All modules included in the static component.
 * @param diagnostics - Diagnostic list to append errors to.
 */
function validateStaticComponentExports(
  root: FlintResolvedModule,
  modules: readonly FlintResolvedModule[],
  diagnostics: FlintDiagnostic[],
): void {
  const exports = new Map<string, { moduleId: string; signature: string }>();
  for (const linkedModule of modules) {
    if (linkedModule.projectRoot !== root.projectRoot) continue;
    const functions: readonly FlintFunction[] = Array.isArray(linkedModule.module.functions)
      ? linkedModule.module.functions
      : [];
    for (const declaration of functions.filter(({ exported }) => exported)) {
      const signature = callableSignature(declaration);
      const previous = exports.get(declaration.name);
      if (previous === undefined) {
        exports.set(declaration.name, { moduleId: linkedModule.moduleId, signature });
      } else {
        diagnostics.push(
          createDiagnostic(
            linkedModule.fileName,
            'link',
            previous.signature === signature ? 'FLINT-LINK-003' : 'FLINT-LINK-004',
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
}

/**
 * Builds the map of rewritten function call specifiers for static cross-project imports.
 *
 * @param module - Importer module.
 * @param rootProjectRoot - Project root of the static component root module.
 * @param graph - Full module dependency graph.
 * @param byFile - Map of resolved modules indexed by file name.
 * @returns Mapping from imported symbol aliases to namespaced function names.
 */
function buildLinkedCallsMap(
  module: FlintResolvedModule,
  rootProjectRoot: string,
  graph: FlintModuleGraph,
  byFile: ReadonlyMap<string, FlintResolvedModule>,
): Map<string, string> {
  const linkedCalls = new Map<string, string>();
  for (const sourceImport of module.module.sourceImports) {
    const edge = graph.edges.find(
      (candidate) =>
        candidate.importer === module.fileName &&
        candidate.source === sourceImport.source &&
        candidate.linkMode === 'static',
    );
    const target = edge === undefined ? undefined : byFile.get(edge.resolved);
    if (target === undefined) continue;
    const targetSameProject = target.projectRoot === rootProjectRoot;
    const targetPrefix = moduleLinkPrefix(target.moduleId);
    for (const declaration of target.module.functions ?? []) {
      if (!declaration.exported) continue;
      const flattenedName = targetSameProject ? declaration.name : `${targetPrefix}${declaration.name}`;
      linkedCalls.set(`${sourceImport.alias}.${declaration.name}`, flattenedName);
    }
  }
  return linkedCalls;
}

/**
 * Merges multiple module ASTs belonging to a single static component into one unified module AST.
 *
 * @param root - Component root module.
 * @param modules - Modules to merge into the component.
 * @param graph - Full module dependency graph.
 * @param byFile - Map of resolved modules indexed by file name.
 * @returns Unified static module AST.
 */
function mergeStaticComponent(
  root: FlintResolvedModule,
  modules: readonly FlintResolvedModule[],
  graph: FlintModuleGraph,
  byFile: ReadonlyMap<string, FlintResolvedModule>,
): FlintModule {
  return {
    ...root.module,
    imports: modules.flatMap(({ module }) => (Array.isArray(module.imports) ? module.imports : [])),
    sourceImports: [],
    structs: modules.flatMap(({ module }) => (Array.isArray(module.structs) ? module.structs : [])),
    enums: modules.flatMap(({ module }) => (Array.isArray(module.enums) ? module.enums : [])),
    interfaces: modules.flatMap(({ module }) => (Array.isArray(module.interfaces) ? module.interfaces : [])),
    functions: modules.flatMap((resolvedModule) => {
      if (!Array.isArray(resolvedModule.module.functions)) return [];
      const sameProject = resolvedModule.projectRoot === root.projectRoot;
      const linkedCalls = buildLinkedCallsMap(resolvedModule, root.projectRoot, graph, byFile);
      return namespacePrivateFunctions(resolvedModule.module, resolvedModule.moduleId, linkedCalls, {
        namespaceExports: !sameProject,
      });
    }),
  };
}

/**
 * Groups statically linked modules into unified component modules with renamed private functions.
 *
 * @param graph - Resolved module dependency graph.
 * @param diagnostics - Diagnostic list to append linking errors to.
 * @returns Array of merged static module ASTs.
 */
function staticComponents(graph: FlintModuleGraph, diagnostics: FlintDiagnostic[]): FlintModule[] {
  const byFile = new Map(graph.modules.map((module) => [module.fileName, module]));
  const staticTargets = new Set(graph.edges.filter((edge) => edge.linkMode === 'static').map((edge) => edge.resolved));
  const roots = graph.modules.filter((module) => !staticTargets.has(module.fileName));
  const result: FlintModule[] = [];
  const seen = new Set<string>();

  const staticEdgesByImporter = new Map<string, FlintModuleEdge[]>();
  for (const edge of graph.edges) {
    if (edge.linkMode === 'static') {
      const list = staticEdgesByImporter.get(edge.importer) ?? [];
      list.push(edge);
      staticEdgesByImporter.set(edge.importer, list);
    }
  }

  for (const root of roots) {
    const files = collectComponentFiles(root.fileName, byFile, staticEdgesByImporter, seen);
    if (files.length === 0) continue;
    const modules = files
      .map((fileName) => byFile.get(fileName))
      .filter((module): module is NonNullable<typeof module> => module !== undefined);
    validateStaticComponentExports(root, modules, diagnostics);
    result.push(mergeStaticComponent(root, modules, graph, byFile));
  }
  return result;
}

/**
 * Determines whether cross-project static linking is explicitly enabled by configuration.
 *
 * @param importerProject - Importer project root identifier.
 * @param targetProject - Target project root identifier.
 * @param configuration - Active link configuration.
 * @returns `true` if an explicit policy or configuration allows cross-project linking.
 */
function isConfiguredCrossProjectLink(
  importerProject: string,
  targetProject: string,
  configuration: FlintLinkConfiguration,
): boolean {
  const configuredMode =
    configuration.linkModes?.[`${importerProject}->${targetProject}`] ?? configuration.linkModes?.[targetProject];
  return (
    configuredMode !== undefined ||
    configuration.crossProjectLinkMode !== undefined ||
    configuration.defaultLinkMode !== undefined ||
    configuration.linkProfile !== undefined
  );
}

/**
 * Validates a single dependency edge against project-boundary and link-mode invariants.
 *
 * @param edge - Dependency edge being inspected.
 * @param importer - Importer module record.
 * @param target - Target dependency module record.
 * @param configuration - Active link configuration.
 * @param diagnostics - Diagnostic list to append errors to.
 */
function validateSingleEdge(
  edge: FlintModuleEdge,
  importer: FlintResolvedModule,
  target: FlintResolvedModule,
  configuration: FlintLinkConfiguration,
  diagnostics: FlintDiagnostic[],
): void {
  if (edge.linkMode === 'dynamic' && importer.projectRoot === target.projectRoot) {
    diagnostics.push(
      createDiagnostic(
        edge.importer,
        'link',
        'FLINT-LINK-002',
        'Dynamic linking within one project is not supported.',
        edge.span,
        'error',
        'Use static linking for same-project source modules.',
      ),
    );
  }
  if (
    importer.projectRoot !== target.projectRoot &&
    edge.linkMode === 'static' &&
    !isConfiguredCrossProjectLink(importer.projectRoot, target.projectRoot, configuration)
  ) {
    diagnostics.push(
      createDiagnostic(
        edge.importer,
        'link',
        'FLINT-LINK-005',
        'Cross-project static linking requires explicit configuration.',
        edge.span,
        'error',
        "Set crossProjectLinkMode to 'static' or 'dynamic'.",
      ),
    );
  }
}

/**
 * Validates all dependency edges in the module graph against linking rules.
 *
 * @param edges - All edges in the module graph.
 * @param modulesByFile - Map of resolved modules indexed by file name.
 * @param configuration - Active link configuration.
 * @param diagnostics - Diagnostic list to append errors to.
 */
function validateLinkEdges(
  edges: readonly FlintModuleEdge[],
  modulesByFile: ReadonlyMap<string, FlintResolvedModule>,
  configuration: FlintLinkConfiguration,
  diagnostics: FlintDiagnostic[],
): void {
  for (const edge of edges) {
    const target = modulesByFile.get(edge.resolved);
    const importer = modulesByFile.get(edge.importer);
    if (target !== undefined && importer !== undefined) {
      validateSingleEdge(edge, importer, target, configuration, diagnostics);
    }
  }
}

/**
 * Reports a static linking cycle diagnostic for a cyclic source file.
 *
 * @param fileName - File name of the module where cycle closed.
 * @param modulesByFile - Map of resolved modules indexed by file name.
 * @param diagnostics - Diagnostic list to append errors to.
 */
function reportStaticCycle(
  fileName: string,
  modulesByFile: ReadonlyMap<string, FlintResolvedModule>,
  diagnostics: FlintDiagnostic[],
): void {
  const module = modulesByFile.get(fileName);
  diagnostics.push(
    createDiagnostic(
      fileName,
      'link',
      'FLINT-LINK-001',
      'Static source module cycle detected.',
      module?.module.span ?? emptySpan,
      'error',
      'Use dynamic linking at the project boundary or remove the cycle.',
    ),
  );
}

/**
 * Detects cyclic dependencies among statically linked modules and emits diagnostics.
 *
 * @param modules - All modules in the dependency graph.
 * @param adjacency - Adjacency map of static outgoing edges per module file name.
 * @param modulesByFile - Map of resolved modules indexed by file name.
 * @param diagnostics - Diagnostic list to append errors to.
 */
function detectStaticLinkingCycles(
  modules: readonly FlintResolvedModule[],
  adjacency: ReadonlyMap<string, readonly FlintModuleEdge[]>,
  modulesByFile: ReadonlyMap<string, FlintResolvedModule>,
  diagnostics: FlintDiagnostic[],
): void {
  const active = new Set<string>();
  const complete = new Set<string>();

  const visit = (fileName: string): void => {
    if (active.has(fileName)) {
      reportStaticCycle(fileName, modulesByFile, diagnostics);
      return;
    }
    if (complete.has(fileName)) return;
    active.add(fileName);
    const edges = adjacency.get(fileName) ?? [];
    for (const edge of edges) {
      visit(edge.resolved);
    }
    active.delete(fileName);
    complete.add(fileName);
  };

  for (const module of modules) {
    visit(module.fileName);
  }
}

/**
 * Validates module graph linking constraints, detects static cycles, and merges static components.
 *
 * @param graph - Resolved module dependency graph.
 * @param configuration - Active link configuration rules.
 * @returns Result object containing diagnostics, merged static modules, and dynamic edges.
 */
export function validateFlintLinks(
  graph: FlintModuleGraph,
  configuration: FlintLinkConfiguration = {},
): FlintLinkResult {
  const diagnostics: FlintDiagnostic[] = [];
  const modulesByFile = new Map(graph.modules.map((module) => [module.fileName, module]));
  const dynamicEdges = graph.edges.filter((edge) => edge.linkMode === 'dynamic');
  validateLinkEdges(graph.edges, modulesByFile, configuration, diagnostics);

  const adjacency = new Map<string, readonly FlintModuleEdge[]>();
  for (const module of graph.modules) {
    adjacency.set(
      module.fileName,
      graph.edges.filter((edge) => edge.importer === module.fileName && edge.linkMode === 'static'),
    );
  }
  detectStaticLinkingCycles(graph.modules, adjacency, modulesByFile, diagnostics);

  return { graph, diagnostics, staticModules: staticComponents(graph, diagnostics), dynamicEdges };
}

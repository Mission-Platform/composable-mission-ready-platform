import { throwOnCompilerErrors, type CompilerDiagnostic } from '@mission-platform/forge-plugin-api';
import {
  MP_ROUTER_MODULE,
  selectForgeRouterPlugin,
  unsupportedRouterCapabilities,
  type RouterCapability,
  type RouterCapabilityImport,
  type RouterCapabilityModule,
  type RouterCapabilityUse,
  type GeneratedRouterModule,
  type RouterOutputPlugin,
  type RouterPluginSelection,
} from '@mission-platform/forge-router-plugin-api';

import {
  parseOxcModule,
  visitOxc,
  oxcArray,
  oxcIdentifierName,
  oxcLiteralValue,
  oxcObject,
  oxcProgramBody,
  oxcSourceSpan,
  buildOxcParentMap,
  type OxcNode,
  type OxcParsedModule,
} from './oxc.js';

import type { OptimizeOptions } from './optimize.js';

const CAPABILITY_BY_IMPORT: Readonly<Record<string, RouterCapability>> = {
  MpLink: 'link',
  MpRouterView: 'view',
  resolveMpLink: 'resolve',
  useMpNavigation: 'navigate',
  useMpRoute: 'route',
  useMpRouter: 'navigate',
};

/** Input for the independent router pass. UI framework selection is deliberate and separate. */
export interface RouterCompilerInput {
  readonly source: string;
  readonly fileName: string;
  readonly moduleKind: 'component' | 'composable';
  readonly uiFramework: string;
  readonly sourceRoot?: string;
  readonly conditions?: readonly string[];
  readonly router?: RouterPluginSelection;
  readonly routerPlugins?: readonly RouterOutputPlugin[];
  readonly optimize?: OptimizeOptions | false;
}

/** Result of the router pass, including the IR used by target plugins. */
export interface RouterCompilationResult extends GeneratedRouterModule {
  readonly ir: RouterCapabilityModule;
  readonly routerTarget?: string;
}

/** Resolves the router capability corresponding to an imported symbol name. */
function capabilityImportName(name: string): RouterCapability | undefined {
  return CAPABILITY_BY_IMPORT[name];
}

/** Parses a single import specifier into a RouterCapabilityImport if it matches a capability. */
function parseSpecifierImport(
  specifier: OxcNode,
  statement: OxcNode,
  source: string,
): RouterCapabilityImport | undefined {
  if (specifier.type !== 'ImportSpecifier') return undefined;
  const importedName =
    oxcIdentifierName(oxcObject(specifier, 'imported')) ?? oxcIdentifierName(oxcObject(specifier, 'local'));
  if (!importedName || capabilityImportName(importedName) === undefined) return undefined;
  return {
    importedName,
    localName: oxcIdentifierName(oxcObject(specifier, 'local')) ?? '',
    typeOnly: specifier.importKind === 'type' || statement.importKind === 'type',
    span: oxcSourceSpan(source, specifier),
  };
}

/** Collects router capability imports from an import declaration statement. */
function collectStatementImports(statement: OxcNode, source: string, imports: RouterCapabilityImport[]): void {
  if (statement.type !== 'ImportDeclaration') return;
  if (oxcLiteralValue(oxcObject(statement, 'source')) !== MP_ROUTER_MODULE) return;
  for (const specifier of oxcArray(statement, 'specifiers')) {
    const parsed = parseSpecifierImport(specifier, statement, source);
    if (parsed !== undefined) {
      imports.push(parsed);
    }
  }
}

/** Scans parsed module statements and extracts all router capability imports. */
function routerImports(module: OxcParsedModule): RouterCapabilityImport[] {
  const imports: RouterCapabilityImport[] = [];
  for (const statement of oxcProgramBody(module.program)) {
    collectStatementImports(statement, module.source, imports);
  }
  return imports;
}

interface RouterUseRecorder {
  record(node: OxcNode, localName: string, kind: RouterCapabilityUse['kind']): void;
}

/** Records a router capability usage if the local symbol corresponds to an active import. */
function recordRouterUse(
  node: OxcNode,
  localName: string,
  kind: RouterCapabilityUse['kind'],
  byLocalName: ReadonlyMap<string, RouterCapabilityImport>,
  seen: Set<string>,
  uses: RouterCapabilityUse[],
  source: string,
): void {
  const imported = byLocalName.get(localName);
  if (imported === undefined) return;
  const key = `${node.start}:${kind}`;
  if (seen.has(key)) return;
  seen.add(key);
  uses.push({
    capability: capabilityImportName(imported.importedName) as RouterCapability,
    importedName: imported.importedName,
    localName,
    kind,
    span: oxcSourceSpan(source, node),
  });
}

/** Inspects JSX opening or self-closing elements for router component usages. */
function inspectJsxRouterUse(node: OxcNode, recorder: RouterUseRecorder): void {
  if (node.type !== 'JSXOpeningElement' && node.type !== 'JSXSelfClosingElement') return;
  const nameNode = oxcObject(node, 'name');
  if (nameNode?.type === 'JSXIdentifier') {
    const localName = oxcIdentifierName(nameNode);
    if (localName) recorder.record(nameNode, localName, 'jsx');
  }
}

/** Inspects call expressions for router hook or utility invocations. */
function inspectCallRouterUse(node: OxcNode, recorder: RouterUseRecorder): void {
  if (node.type !== 'CallExpression') return;
  const callee = oxcObject(node, 'callee');
  if (callee?.type === 'Identifier') {
    const localName = oxcIdentifierName(callee);
    if (localName) recorder.record(callee, localName, 'call');
  }
}

/** Checks whether an identifier node is a direct property, callee, or JSX tag reference. */
function isSubsumedIdentifier(node: OxcNode, parent: OxcNode | undefined): boolean {
  if (!parent) return false;
  if (parent.type === 'CallExpression' && oxcObject(parent, 'callee') === node) return true;
  if (parent.type === 'MemberExpression' && oxcObject(parent, 'property') === node) return true;
  return (
    (parent.type === 'JSXOpeningElement' ||
      parent.type === 'JSXSelfClosingElement' ||
      parent.type === 'JSXClosingElement') &&
    oxcObject(parent, 'name') === node
  );
}

/** Inspects standalone identifier references to router bindings. */
function inspectIdentifierRouterUse(node: OxcNode, parent: OxcNode | undefined, recorder: RouterUseRecorder): void {
  if (node.type !== 'Identifier' && node.type !== 'JSXIdentifier') return;
  const localName = oxcIdentifierName(node);
  if (localName && !isSubsumedIdentifier(node, parent)) {
    recorder.record(node, localName, 'reference');
  }
}

/** Traverses AST nodes to discover all router component and hook usages. */
function routerUses(module: OxcParsedModule, imports: readonly RouterCapabilityImport[]): RouterCapabilityUse[] {
  const byLocalName = new Map(imports.filter((entry) => !entry.typeOnly).map((entry) => [entry.localName, entry]));
  const uses: RouterCapabilityUse[] = [];
  const seen = new Set<string>();
  const parentMap = buildOxcParentMap(module.program);
  const recorder: RouterUseRecorder = {
    record(node, localName, kind) {
      recordRouterUse(node, localName, kind, byLocalName, seen, uses, module.source);
    },
  };

  visitOxc(module.program, (node) => {
    if (node.type === 'ImportDeclaration') return false;
    const parent = parentMap.get(node);
    inspectJsxRouterUse(node, recorder);
    inspectCallRouterUse(node, recorder);
    inspectIdentifierRouterUse(node, parent, recorder);
    return true;
  });
  return uses;
}

/** Parse neutral router imports and uses without importing any native router. */
export function analyzeRouterCapabilities(
  input: Pick<RouterCompilerInput, 'source' | 'fileName' | 'moduleKind'>,
): RouterCapabilityModule {
  if (!input.source.includes(MP_ROUTER_MODULE)) {
    return {
      kind: 'router-capability-module',
      source: input.source,
      fileName: input.fileName,
      moduleKind: input.moduleKind,
      imports: [],
      uses: [],
    };
  }
  const module = parseOxcModule(input.fileName, input.source);
  const imports = routerImports(module);
  return {
    kind: 'router-capability-module',
    source: input.source,
    fileName: input.fileName,
    moduleKind: input.moduleKind,
    imports,
    uses: routerUses(module, imports),
  };
}

/** Resolves the code block language identifier from the file extension. */
function languageFor(fileName: string): GeneratedRouterModule['lang'] {
  const extension = fileName.split('.').pop();
  return extension === undefined ? 'ts' : extension;
}

/** Creates a compiler diagnostic when a requested router plugin is not registered. */
function targetNotFoundDiagnostic(fileName: string, target: string): CompilerDiagnostic {
  return {
    phase: 'generation',
    severity: 'error',
    code: 'MP_ROUTER_TARGET_NOT_FOUND',
    message: `No Forge router plugin is registered for target "${target}".`,
    fileName,
  };
}

/** Deduplicates compiler diagnostics by their phase, code, message, and location. */
function uniqueDiagnostics(diagnostics: readonly CompilerDiagnostic[]): CompilerDiagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const span = diagnostic.span;
    const key = JSON.stringify([
      diagnostic.phase,
      diagnostic.severity,
      diagnostic.code,
      diagnostic.message,
      diagnostic.fileName,
      span?.start,
      span?.end,
      span?.line,
      span?.column,
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Builds a no-op RouterCapabilityModule when router features are unused. */
function buildEmptyRouterIr(input: RouterCompilerInput): RouterCapabilityModule {
  return {
    kind: 'router-capability-module',
    source: input.source,
    fileName: input.fileName,
    moduleKind: input.moduleKind,
    imports: [],
    uses: [],
  };
}

/** Resolves router optimization options from the compiler input. */
function resolveRouterOptimizeOptions(optimize: RouterCompilerInput['optimize']) {
  return {
    preserveSourceMap: optimize !== false,
    custom: typeof optimize === 'object' ? { ...optimize } : undefined,
  };
}

/** Aggregates diagnostics from router compilation phases into a unique list. */
function mergeRouterDiagnostics(
  capabilityDiagnostics: readonly CompilerDiagnostic[],
  ...phases: (readonly CompilerDiagnostic[] | undefined)[]
): CompilerDiagnostic[] | undefined {
  const merged: CompilerDiagnostic[] = [...capabilityDiagnostics];
  for (const phase of phases) {
    if (phase) merged.push(...phase);
  }
  const unique = uniqueDiagnostics(merged);
  return unique.length > 0 ? unique : undefined;
}

/** Executes lowering, optimization, and code generation through the selected router plugin. */
function executeRouterPlugin(
  input: RouterCompilerInput,
  ir: RouterCapabilityModule,
  selected: ForgeRouterPlugin,
  capabilityDiagnostics: CompilerDiagnostic[],
): RouterCompilationResult {
  const context = {
    routerTarget: selected.id,
    uiFramework: input.uiFramework,
    moduleKind: input.moduleKind,
    fileName: input.fileName,
    sourceRoot: input.sourceRoot,
    conditions: input.conditions,
  } as const;
  throwOnCompilerErrors(capabilityDiagnostics);
  const lowered = selected.lower(ir, context);
  throwOnCompilerErrors(lowered.diagnostics);
  const optimized = selected.optimize(lowered, resolveRouterOptimizeOptions(input.optimize));
  throwOnCompilerErrors(optimized.diagnostics);
  const generated = selected.generate(optimized);
  throwOnCompilerErrors(generated.diagnostics);
  const diagnostics = mergeRouterDiagnostics(
    capabilityDiagnostics,
    lowered.diagnostics,
    optimized.diagnostics,
    generated.diagnostics,
  );
  return {
    ...generated,
    ir,
    routerTarget: selected.id,
    diagnostics,
  };
}

/** Builds the compilation result when no router plugin is selected or available. */
function buildUnselectedRouterResult(
  input: RouterCompilerInput,
  ir: RouterCapabilityModule,
  capabilityDiagnostics: CompilerDiagnostic[],
): RouterCompilationResult {
  const selectionDiagnostic =
    typeof input.router === 'string' ? targetNotFoundDiagnostic(input.fileName, input.router) : undefined;
  const diagnostics = [...(selectionDiagnostic ? [selectionDiagnostic] : []), ...capabilityDiagnostics];
  return {
    code: input.source,
    lang: languageFor(input.fileName),
    ir,
    diagnostics: ir.uses.length > 0 && diagnostics.length > 0 ? diagnostics : undefined,
  };
}

/** Compile neutral router usage through a selected native target adapter. */
export function compileRouterModule(input: RouterCompilerInput): RouterCompilationResult {
  if (!input.source.includes(MP_ROUTER_MODULE)) {
    return { code: input.source, lang: languageFor(input.fileName), ir: buildEmptyRouterIr(input) };
  }
  const ir = analyzeRouterCapabilities(input);
  if (ir.imports.length === 0) {
    return { code: input.source, lang: languageFor(input.fileName), ir };
  }
  const selected = selectForgeRouterPlugin(input.router, input.routerPlugins);
  const capabilityDiagnostics = unsupportedRouterCapabilities(ir, selected);

  if (selected === undefined) {
    return buildUnselectedRouterResult(input, ir, capabilityDiagnostics);
  }

  return executeRouterPlugin(input, ir, selected, capabilityDiagnostics);
}

/** Dispatcher form used by the Forge compiler and by standalone target fixtures. */
export function createRouterCompilerPipeline() {
  return {
    compile: compileRouterModule,
  };
}

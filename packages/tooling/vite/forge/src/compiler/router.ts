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

function capabilityImportName(name: string): RouterCapability | undefined {
  return CAPABILITY_BY_IMPORT[name];
}

function routerImports(module: OxcParsedModule): RouterCapabilityImport[] {
  const imports: RouterCapabilityImport[] = [];
  for (const statement of oxcProgramBody(module.program)) {
    if (statement.type !== 'ImportDeclaration' || typeof oxcLiteralValue(oxcObject(statement, 'source')) !== 'string')
      continue;
    if (oxcLiteralValue(oxcObject(statement, 'source')) !== MP_ROUTER_MODULE) continue;

    const specifiers = oxcArray(statement, 'specifiers');
    for (const specifier of specifiers) {
      if (specifier.type !== 'ImportSpecifier') continue;
      const importedName =
        oxcIdentifierName(oxcObject(specifier, 'imported')) ?? oxcIdentifierName(oxcObject(specifier, 'local'));
      if (!importedName || capabilityImportName(importedName) === undefined) continue;
      imports.push({
        importedName,
        localName: oxcIdentifierName(oxcObject(specifier, 'local')) ?? '',
        typeOnly: specifier.importKind === 'type' || statement.importKind === 'type',
        span: oxcSourceSpan(module.source, specifier),
      });
    }
  }
  return imports;
}

function routerUses(module: OxcParsedModule, imports: readonly RouterCapabilityImport[]): RouterCapabilityUse[] {
  const byLocalName = new Map(imports.filter((entry) => !entry.typeOnly).map((entry) => [entry.localName, entry]));
  const uses: RouterCapabilityUse[] = [];
  const seen = new Set<string>();
  const parentMap = buildOxcParentMap(module.program);
  const add = (node: OxcNode, localName: string, kind: RouterCapabilityUse['kind']): void => {
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
      span: oxcSourceSpan(module.source, node),
    });
  };

  visitOxc(module.program, (node) => {
    const parent = parentMap.get(node);

    // Skip import declarations and their children
    if (node.type === 'ImportDeclaration') return false;

    // JSX usage
    if (node.type === 'JSXOpeningElement' || node.type === 'JSXSelfClosingElement') {
      const nameNode = oxcObject(node, 'name');
      if (nameNode?.type === 'JSXIdentifier') {
        const localName = oxcIdentifierName(nameNode);
        if (localName) add(nameNode, localName, 'jsx');
      }
    }
    // Call usage
    if (node.type === 'CallExpression') {
      const callee = oxcObject(node, 'callee');
      if (callee?.type === 'Identifier') {
        const localName = oxcIdentifierName(callee);
        if (localName) add(callee, localName, 'call');
      }
    }
    // Identifier reference
    if (node.type === 'Identifier' || node.type === 'JSXIdentifier') {
      const localName = oxcIdentifierName(node);
      const isCall = parent?.type === 'CallExpression' && oxcObject(parent, 'callee') === node;
      const isProperty = parent?.type === 'MemberExpression' && oxcObject(parent, 'property') === node;
      const isJsx =
        (parent?.type === 'JSXOpeningElement' ||
          parent?.type === 'JSXSelfClosingElement' ||
          parent?.type === 'JSXClosingElement') &&
        oxcObject(parent, 'name') === node;

      if (localName && !isCall && !isProperty && !isJsx) {
        add(node, localName, 'reference');
      }
    }
    return true;
  });
  return uses;
}

/** Parse neutral router imports and uses without importing any native router. */
export function analyzeRouterCapabilities(
  input: Pick<RouterCompilerInput, 'source' | 'fileName' | 'moduleKind'>,
): RouterCapabilityModule {
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

function languageFor(fileName: string): GeneratedRouterModule['lang'] {
  const extension = fileName.split('.').pop();
  return extension === undefined ? 'ts' : extension;
}

function targetNotFoundDiagnostic(fileName: string, target: string) {
  return {
    phase: 'generation' as const,
    severity: 'error' as const,
    code: 'MP_ROUTER_TARGET_NOT_FOUND',
    message: `No Forge router plugin is registered for target "${target}".`,
    fileName,
  };
}

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

/** Compile neutral router usage through a selected native target adapter. */
export function compileRouterModule(input: RouterCompilerInput): RouterCompilationResult {
  const ir = analyzeRouterCapabilities(input);
  if (ir.imports.length === 0) {
    return { code: input.source, lang: languageFor(input.fileName), ir };
  }
  const selected = selectForgeRouterPlugin(input.router, input.routerPlugins);
  const selectionDiagnostic =
    typeof input.router === 'string' && selected === undefined
      ? targetNotFoundDiagnostic(input.fileName, input.router)
      : undefined;
  const capabilityDiagnostics = unsupportedRouterCapabilities(ir, selected);

  if (selected === undefined) {
    return {
      code: input.source,
      lang: languageFor(input.fileName),
      ir,
      diagnostics:
        ir.uses.length > 0
          ? [...(selectionDiagnostic ? [selectionDiagnostic] : []), ...capabilityDiagnostics]
          : undefined,
    };
  }

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
  const optimized = selected.optimize(lowered, {
    preserveSourceMap: input.optimize !== false,
    custom: typeof input.optimize === 'object' ? { ...input.optimize } : undefined,
  });
  throwOnCompilerErrors(optimized.diagnostics);
  const generated = selected.generate(optimized);
  throwOnCompilerErrors(generated.diagnostics);
  const diagnostics = uniqueDiagnostics([
    ...capabilityDiagnostics,
    ...(lowered.diagnostics ?? []),
    ...(optimized.diagnostics ?? []),
    ...(generated.diagnostics ?? []),
  ]);
  return {
    ...generated,
    ir,
    routerTarget: selected.id,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
  };
}

/** Dispatcher form used by the Forge compiler and by standalone target fixtures. */
export function createRouterCompilerPipeline() {
  return {
    compile: compileRouterModule,
  };
}

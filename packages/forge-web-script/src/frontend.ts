import { createDiagnostic, diagnosticKey, type ForgeWebScriptDiagnostic } from './diagnostics.js';
import {
  hashForgeWebScriptModuleGraph,
  type ForgeWebScriptLinkConfiguration,
  type ForgeWebScriptModuleGraph,
} from './graph.js';
import { normalizeForgeWebScriptFileId } from './identity.js';
import { lowerForgeWebScriptToIr } from './ir.js';
import { validateForgeWebScriptLinks } from './linker.js';
import {
  createForgeWebScriptAbiManifest,
  type ForgeWebScriptLinkedExport,
  type ForgeWebScriptSourceImport,
} from './manifest.js';
import { optimizeForgeWebScriptModule } from './optimizer.js';
import { parseForgeWebScript } from './parser.js';
import { forgeWebScriptStandardLibraryIdentity } from './stdlib/regex.js';
import { checkForgeWebScript } from './type-checker.js';

import type { ForgeWebScriptModule, ForgeWebScriptPrimitiveType } from './ast.js';
import type {
  ForgeWebScriptCompileInput,
  ForgeWebScriptFrontendLinkMetadata,
  ForgeWebScriptFrontendResult,
  ForgeWebScriptGraphCompileInput,
  ForgeWebScriptLinkOptimizationProfile,
} from './contracts.js';
import type { ForgeWebScriptAbiFunction } from './manifest.js';

function abiCarrierType(type: {
  readonly name: ForgeWebScriptPrimitiveType;
  readonly reference?: string;
}): ForgeWebScriptPrimitiveType {
  return type.reference === undefined ? type.name : 'i32';
}

function abiFunction(declaration: ForgeWebScriptModule['functions'][number]): ForgeWebScriptAbiFunction {
  return {
    name: declaration.name,
    parameters: declaration.parameters.map(({ name, type }) => ({
      name,
      type: abiCarrierType(type),
      ...(type.reference === undefined ? {} : { reference: type.reference }),
      ...(type.arguments === undefined ? {} : { arguments: type.arguments }),
      ...(type.length === undefined ? {} : { length: type.length }),
      ...(type.reference === 'Array'
        ? { ownership: type.ownership ?? ('owned' as const) }
        : type.ownership === undefined
          ? {}
          : { ownership: type.ownership }),
    })),
    result: abiCarrierType(declaration.result),
    ...(declaration.result.reference === undefined ? {} : { resultReference: declaration.result.reference }),
    ...(declaration.result.arguments === undefined ? {} : { resultArguments: declaration.result.arguments }),
    ...(declaration.result.length === undefined ? {} : { resultLength: declaration.result.length }),
    ...(declaration.result.ownership === undefined ? {} : { resultOwnership: declaration.result.ownership }),
  };
}

const emptyLinks = (): ForgeWebScriptFrontendLinkMetadata => ({
  linkedModules: [],
});

function linkOptimizationProfile(
  profile: ForgeWebScriptLinkOptimizationProfile | 'static' | 'dynamic' | undefined,
  linkMode: 'static' | 'dynamic' | undefined,
): ForgeWebScriptLinkOptimizationProfile {
  if (profile === 'static') return 'static-aggressive';
  if (profile === 'dynamic') return 'dynamic-conservative';
  if (profile !== undefined) return profile;
  if (linkMode === 'static') return 'static-aggressive';
  if (linkMode === 'dynamic') return 'dynamic-conservative';
  return 'standard';
}

function uniqueDiagnostics(diagnostics: readonly ForgeWebScriptDiagnostic[]): readonly ForgeWebScriptDiagnostic[] {
  return diagnostics.filter(
    (diagnostic, index, all) =>
      all.findIndex((candidate) => diagnosticKey(candidate) === diagnosticKey(diagnostic)) === index,
  );
}

function checkedModule(
  input: Pick<
    ForgeWebScriptCompileInput,
    'source' | 'fileName' | 'root' | 'requestedCapabilities' | 'requireExports' | 'externalFunctions'
  >,
): { readonly module?: ForgeWebScriptModule; readonly diagnostics: readonly ForgeWebScriptDiagnostic[] } {
  const parsed = parseForgeWebScript(input.source, input.fileName, { root: input.root });
  const checkedDiagnostics =
    parsed.module === undefined
      ? []
      : checkForgeWebScript(parsed.module, input.fileName, {
          requestedCapabilities: input.requestedCapabilities,
          requireExports: input.requireExports,
          externalFunctions: input.externalFunctions,
        }).diagnostics;
  return {
    module: parsed.module,
    diagnostics: uniqueDiagnostics([...parsed.diagnostics, ...checkedDiagnostics]),
  };
}

function resultFor(
  input: Pick<
    ForgeWebScriptCompileInput,
    | 'source'
    | 'fileName'
    | 'optimization'
    | 'standardLibrary'
    | 'async'
    | 'targetFeatures'
    | 'compilerHints'
    | 'linkProfile'
  >,
  module: ForgeWebScriptModule | undefined,
  diagnostics: readonly ForgeWebScriptDiagnostic[],
  links: ForgeWebScriptFrontendLinkMetadata,
  sourceFiles: readonly string[],
): ForgeWebScriptFrontendResult {
  if (module === undefined || diagnostics.length > 0) {
    return { source: input.source, fileName: input.fileName, links, sourceFiles, diagnostics };
  }
  const profile = input.linkProfile;
  const ir = lowerForgeWebScriptToIr(module);
  const optimized = optimizeForgeWebScriptModule(
    module,
    input.optimization ?? (profile === undefined ? 'debug' : 'release'),
  );
  return {
    source: input.source,
    fileName: input.fileName,
    module,
    ir,
    optimizedModule: optimized.module,
    optimizedIr: optimized.ir,
    optimizationReport: optimized.report,
    abi: createForgeWebScriptAbiManifest(optimized.module, {
      ...(links.graphHash === undefined ? {} : { graphHash: links.graphHash }),
      ...(links.projectRoot === undefined ? {} : { projectRoot: links.projectRoot }),
      ...(links.linkMode === undefined ? {} : { linkMode: links.linkMode }),
      ...(links.linkProfile === undefined ? {} : { linkProfile: links.linkProfile }),
      optimizationProfile: links.optimizationProfile ?? linkOptimizationProfile(input.linkProfile, links.linkMode),
      ...(links.sourceImports === undefined ? {} : { sourceImports: links.sourceImports }),
      ...(links.linkedExports === undefined ? {} : { linkedExports: links.linkedExports }),
      standardLibrary: forgeWebScriptStandardLibraryIdentity(input.standardLibrary),
      ...(input.async === undefined ? {} : { async: input.async }),
      ...(input.targetFeatures === undefined ? {} : { targetFeatures: input.targetFeatures }),
    }),
    links,
    sourceFiles,
    diagnostics,
  };
}

export function prepareForgeWebScriptFrontend(input: ForgeWebScriptCompileInput): ForgeWebScriptFrontendResult {
  const validation = checkedModule(input);
  const profile = input.linkProfile ?? input.linkConfiguration?.linkProfile;
  const links: ForgeWebScriptFrontendLinkMetadata = {
    ...emptyLinks(),
    ...(profile === undefined
      ? {}
      : { linkProfile: profile, optimizationProfile: linkOptimizationProfile(undefined, profile) }),
  };
  return resultFor(input, validation.module, validation.diagnostics, links, [input.fileName]);
}

function graphLinks(
  input: ForgeWebScriptGraphCompileInput,
  entry: ForgeWebScriptModuleGraph['modules'][number] | undefined,
  linkedRecords: ForgeWebScriptModuleGraph['modules'],
  graphHash: string,
): ForgeWebScriptFrontendLinkMetadata {
  const linkedExports: ForgeWebScriptLinkedExport[] = (
    linkedRecords.length === 0 ? (entry === undefined ? [] : [entry]) : linkedRecords
  ).flatMap(({ module: sourceModule, moduleId }) =>
    sourceModule.functions
      .filter(({ exported }) => exported)
      .map((declaration) => ({ moduleId, ...abiFunction(declaration) })),
  );
  const sourceImports: ForgeWebScriptSourceImport[] = (entry?.module.sourceImports ?? []).map((sourceImport) => {
    const edge = input.graph.edges.find(
      ({ importer, source }) =>
        normalizeForgeWebScriptFileId(importer) === normalizeForgeWebScriptFileId(input.entryFileName) &&
        source === sourceImport.source,
    );
    const target =
      edge === undefined ? undefined : input.graph.modules.find(({ fileName }) => fileName === edge.resolved);
    return {
      source: sourceImport.source,
      alias: sourceImport.alias,
      ...(target === undefined ? {} : { resolvedModuleId: target.moduleId }),
      ...(edge === undefined ? {} : { linkMode: edge.linkMode }),
      ...(target === undefined || edge?.linkMode !== 'dynamic'
        ? {}
        : {
            exports: target.module.functions
              .filter(({ exported }) => exported)
              .map((declaration) => abiFunction(declaration))
              .toSorted((left, right) => left.name.localeCompare(right.name)),
          }),
    };
  });
  const linkProfile =
    input.linkProfile ??
    input.linkConfiguration?.linkProfile ??
    (input.graph.edges.some(({ linkMode }) => linkMode === 'dynamic') ? 'dynamic' : 'static');
  return {
    graphHash,
    projectRoot: entry?.projectRoot,
    linkMode: input.graph.edges.some(({ linkMode }) => linkMode === 'dynamic') ? 'dynamic' : 'static',
    linkProfile,
    optimizationProfile: linkOptimizationProfile(
      linkProfile,
      input.graph.edges.some(({ linkMode }) => linkMode === 'dynamic') ? 'dynamic' : 'static',
    ),
    sourceImports,
    linkedExports,
    linkedModules: linkedRecords.map(({ moduleId }) => moduleId),
  };
}

export function prepareForgeWebScriptGraphFrontend(
  input: ForgeWebScriptGraphCompileInput,
): ForgeWebScriptFrontendResult {
  const configuration: ForgeWebScriptLinkConfiguration = {
    ...(input.linkConfiguration ?? {}),
    ...(input.linkProfile === undefined ? {} : { linkProfile: input.linkProfile }),
  };
  const graphHash = hashForgeWebScriptModuleGraph(input.graph, configuration);
  const links = validateForgeWebScriptLinks(input.graph, configuration);
  const entry = input.graph.modules.find(({ fileName }) => fileName === input.entryFileName);
  const linked = links.staticModules.find(({ name }) => name === entry?.moduleId);
  const linkedFiles = new Set<string>();
  const visitStatic = (fileName: string): void => {
    if (linkedFiles.has(fileName)) return;
    linkedFiles.add(fileName);
    for (const edge of input.graph.edges) {
      if (edge.importer === fileName && edge.linkMode === 'static') visitStatic(edge.resolved);
    }
  };
  if (entry !== undefined) visitStatic(entry.fileName);
  const linkedRecords = input.graph.modules.filter(({ fileName }) => linkedFiles.has(fileName));
  // Type-check the linked component as one module. In particular, the root
  // dispatcher is allowed to call functions exported by its static imports;
  // checking each source module in isolation would report those calls as
  // undeclared before the linker has merged their declarations.
  const diagnostics: ForgeWebScriptDiagnostic[] = [
    ...(linked === undefined
      ? []
      : checkForgeWebScript(linked, input.entryFileName, {
          requestedCapabilities: input.requestedCapabilities,
          // Static components retain private helpers; only the source module's
          // explicit exports become the public linked ABI.
          requireExports: false,
        }).diagnostics),
    ...links.diagnostics,
  ];
  for (const resolvedModule of input.graph.modules) {
    for (const sourceImport of resolvedModule.module.sourceImports) {
      if (
        !input.graph.edges.some(
          ({ importer, source }) => importer === resolvedModule.fileName && source === sourceImport.source,
        )
      )
        diagnostics.push(
          createDiagnostic(
            resolvedModule.fileName,
            'graph',
            'FWS-GRAPH-002',
            `Unable to resolve source module '${sourceImport.source}'.`,
            sourceImport.span,
            'error',
            'Add the resolved module to the graph before compiling.',
          ),
        );
    }
  }
  if (entry === undefined)
    diagnostics.push({
      code: 'FWS-GRAPH-003',
      severity: 'error',
      phase: 'graph',
      message: `Graph entry '${input.entryFileName}' was not resolved.`,
      fileName: input.entryFileName,
      span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
    });
  const module = linked ?? entry?.module;
  const source = input.graph.modules.map(({ source: moduleSource }) => moduleSource).join('\n');
  return resultFor(
    {
      source,
      fileName: input.entryFileName,
      optimization: input.optimization,
      linkProfile: input.linkProfile ?? input.linkConfiguration?.linkProfile,
      standardLibrary: input.standardLibrary,
      async: input.async,
      targetFeatures: input.targetFeatures,
      compilerHints: input.compilerHints,
    },
    module,
    uniqueDiagnostics(diagnostics),
    graphLinks(input, entry, linkedRecords, graphHash),
    input.graph.modules.map(({ fileName }) => fileName),
  );
}

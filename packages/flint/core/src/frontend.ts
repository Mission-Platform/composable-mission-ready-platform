import { createDiagnostic, diagnosticKey, type FlintDiagnostic } from './diagnostics.js';
import { hashFlintModuleGraph, type FlintLinkConfiguration, type FlintModuleGraph } from './graph.js';
import { normalizeFlintFileId } from './identity.js';
import { lowerFlintIrToModule, lowerFlintToIr } from './ir.js';
import { lexFlint } from './lexer.js';
import { validateFlintLinks } from './linker.js';
import {
  createFlintAbiManifest,
  type FlintAbiFunction,
  type FlintLinkedExport,
  type FlintSourceImport,
} from './manifest.js';
import { optimizeFlintModule } from './optimizer.js';
import { parseFlint } from './parser.js';
import { buildFlintSoN, optimizeFlintSoN } from './son-ir.js';
import { flintStandardLibraryIdentity } from './stdlib/regex.js';
import { checkFlint } from './type-checker.js';

import type { FlintModule, FlintPrimitiveType } from './ast.js';
import type {
  FlintCompileInput,
  FlintFrontendLinkMetadata,
  FlintFrontendResult,
  FlintGraphCompileInput,
  FlintLinkOptimizationProfile,
} from './contracts.js';
function frontendSourceHash(source: string, fileName: string): string {
  let result = 2_166_136_261;
  const tokens = lexFlint(source, fileName)
    .tokens.filter(({ kind }) => kind !== 'comment' && kind !== 'eof')
    .map(({ kind, text }) => `${kind}\0${text}`)
    .join('\0');
  for (const character of tokens) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 16_777_619) >>> 0;
  }
  return result.toString(16).padStart(8, '0');
}

function abiCarrierType(type: {
  readonly name: FlintPrimitiveType;
  readonly reference?: string;
  readonly referenceMode?: 'ref' | 'mut-ref';
}): FlintPrimitiveType {
  return type.reference === undefined ? type.name : 'i32';
}

function abiFunction(declaration: FlintModule['functions'][number], module: FlintModule): FlintAbiFunction {
  const referenceOf = (type: { readonly name: FlintPrimitiveType; readonly reference?: string }): string | undefined =>
    type.reference ?? (module.structs.some(({ name }) => name === type.name) ? type.name : undefined);
  return {
    name: declaration.name,
    parameters: declaration.parameters.map(({ name, type }) => ({
      name,
      type: abiCarrierType({ ...type, reference: referenceOf(type) }),
      ...(referenceOf(type) === undefined ? {} : { reference: referenceOf(type) }),
      passing:
        type.referenceMode === 'mut-ref'
          ? 'mutable-reference'
          : type.referenceMode === 'ref' ||
              type.reference !== undefined ||
              type.name === 'bytes' ||
              type.name === 'string'
            ? 'immutable-reference'
            : 'value',
      ...(type.referenceMode === undefined ? {} : { referenceMode: type.referenceMode }),
      ...(type.arguments === undefined ? {} : { arguments: type.arguments }),
      ...(type.length === undefined ? {} : { length: type.length }),
      ...(type.reference === 'Array'
        ? { ownership: type.ownership ?? ('owned' as const) }
        : type.ownership === undefined
          ? {}
          : { ownership: type.ownership }),
    })),
    result: abiCarrierType({ ...declaration.result, reference: referenceOf(declaration.result) }),
    ...(referenceOf(declaration.result) === undefined ? {} : { resultReference: referenceOf(declaration.result) }),
    ...(declaration.result.arguments === undefined ? {} : { resultArguments: declaration.result.arguments }),
    ...(declaration.result.length === undefined ? {} : { resultLength: declaration.result.length }),
    ...(declaration.result.ownership === undefined ? {} : { resultOwnership: declaration.result.ownership }),
  };
}

const emptyLinks = (): FlintFrontendLinkMetadata => ({
  linkedModules: [],
});

function linkOptimizationProfile(
  profile: FlintLinkOptimizationProfile | 'static' | 'dynamic' | undefined,
  linkMode: 'static' | 'dynamic' | undefined,
): FlintLinkOptimizationProfile {
  if (profile === 'static') return 'static-aggressive';
  if (profile === 'dynamic') return 'dynamic-conservative';
  if (profile !== undefined) return profile;
  if (linkMode === 'static') return 'static-aggressive';
  if (linkMode === 'dynamic') return 'dynamic-conservative';
  return 'standard';
}

function uniqueDiagnostics(diagnostics: readonly FlintDiagnostic[]): readonly FlintDiagnostic[] {
  return diagnostics.filter(
    (diagnostic, index, all) =>
      all.findIndex((candidate) => diagnosticKey(candidate) === diagnosticKey(diagnostic)) === index,
  );
}

function checkedModule(
  input: Pick<
    FlintCompileInput,
    'source' | 'fileName' | 'root' | 'requestedCapabilities' | 'requireExports' | 'externalFunctions'
  >,
): { readonly module?: FlintModule; readonly diagnostics: readonly FlintDiagnostic[] } {
  const parsed = parseFlint(input.source, input.fileName, { root: input.root });
  const checkedDiagnostics =
    parsed.module === undefined
      ? []
      : checkFlint(parsed.module, input.fileName, {
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
    FlintCompileInput,
    | 'source'
    | 'fileName'
    | 'compilerVersion'
    | 'optimization'
    | 'standardLibrary'
    | 'async'
    | 'targetFeatures'
    | 'compilerHints'
    | 'linkProfile'
    | 'boundsChecks'
  >,
  module: FlintModule | undefined,
  diagnostics: readonly FlintDiagnostic[],
  links: FlintFrontendLinkMetadata,
  sourceFiles: readonly string[],
): FlintFrontendResult {
  if (module === undefined || diagnostics.length > 0) {
    return { source: input.source, fileName: input.fileName, links, sourceFiles, diagnostics };
  }
  const profile = input.linkProfile;
  const optimization = input.optimization ?? (profile === undefined ? 'debug' : 'release');
  // SoN is the canonical optimization boundary: it is built from the
  // unoptimized semantic IR, performs its own real optimization, and its
  // compatibility-lowered tree is what the backend below actually consumes.
  // The legacy tree-IR optimizer is retained only to populate the
  // backward-compatible `optimizationReport` shape; it no longer decides the
  // compiled output.
  const ir = lowerFlintToIr(module);
  const sonOptions = {
    compilerVersion: input.compilerVersion,
    sourceHash: frontendSourceHash(input.source, input.fileName),
    optimization,
    ...(input.boundsChecks === undefined ? {} : { boundsChecks: input.boundsChecks }),
  } as const;
  const unoptimizedSonIr = buildFlintSoN(ir, sonOptions);
  const sonOptimized = optimizeFlintSoN(unoptimizedSonIr, ir, optimization);
  const optimizedIr = sonOptimized.ir;
  const optimizedModule = lowerFlintIrToModule(optimizedIr);
  const legacyOptimized = optimizeFlintModule(module, optimization);
  return {
    source: input.source,
    fileName: input.fileName,
    module,
    ir,
    optimizedModule,
    optimizedIr,
    unoptimizedSonIr,
    sonIr: sonOptimized.module,
    sonOptimizationReport: sonOptimized.report,
    optimizationReport: { ...legacyOptimized.report, sonPasses: sonOptimized.report.passes.map(({ name }) => name) },
    abi: createFlintAbiManifest(optimizedModule, {
      ...(links.graphHash === undefined ? {} : { graphHash: links.graphHash }),
      ...(links.projectRoot === undefined ? {} : { projectRoot: links.projectRoot }),
      ...(links.linkMode === undefined ? {} : { linkMode: links.linkMode }),
      ...(links.linkProfile === undefined ? {} : { linkProfile: links.linkProfile }),
      optimizationProfile: links.optimizationProfile ?? linkOptimizationProfile(input.linkProfile, links.linkMode),
      ...(links.sourceImports === undefined ? {} : { sourceImports: links.sourceImports }),
      ...(links.linkedExports === undefined ? {} : { linkedExports: links.linkedExports }),
      standardLibrary: flintStandardLibraryIdentity(input.standardLibrary),
      boundsChecks: input.boundsChecks ?? 'runtime',
      ...(input.async === undefined ? {} : { async: input.async }),
      ...(input.targetFeatures === undefined ? {} : { targetFeatures: input.targetFeatures }),
    }),
    links,
    sourceFiles,
    diagnostics,
  };
}

export function prepareFlintFrontend(input: FlintCompileInput): FlintFrontendResult {
  const validation = checkedModule(input);
  const profile = input.linkProfile ?? input.linkConfiguration?.linkProfile;
  const links: FlintFrontendLinkMetadata = {
    ...emptyLinks(),
    ...(profile === undefined
      ? {}
      : { linkProfile: profile, optimizationProfile: linkOptimizationProfile(undefined, profile) }),
  };
  return resultFor(input, validation.module, validation.diagnostics, links, [input.fileName]);
}

function graphLinks(
  input: FlintGraphCompileInput,
  entry: FlintModuleGraph['modules'][number] | undefined,
  linkedRecords: FlintModuleGraph['modules'],
  graphHash: string,
): FlintFrontendLinkMetadata {
  const linkedExports: FlintLinkedExport[] = (
    linkedRecords.length === 0 ? (entry === undefined ? [] : [entry]) : linkedRecords
  ).flatMap(({ module: sourceModule, moduleId }) =>
    sourceModule.functions
      .filter(({ exported }) => exported)
      .map((declaration) => ({ moduleId, ...abiFunction(declaration, sourceModule) })),
  );
  const sourceImports: FlintSourceImport[] = (entry?.module.sourceImports ?? []).map((sourceImport) => {
    const edge = input.graph.edges.find(
      ({ importer, source }) =>
        normalizeFlintFileId(importer) === normalizeFlintFileId(input.entryFileName) && source === sourceImport.source,
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
              .map((declaration) => abiFunction(declaration, target.module))
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

export function prepareFlintGraphFrontend(input: FlintGraphCompileInput): FlintFrontendResult {
  const configuration: FlintLinkConfiguration = {
    ...input.linkConfiguration,
    ...(input.linkProfile === undefined ? {} : { linkProfile: input.linkProfile }),
  };
  const graphHash = hashFlintModuleGraph(input.graph, configuration);
  const links = validateFlintLinks(input.graph, configuration);
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
  const diagnostics: FlintDiagnostic[] = [
    ...(linked === undefined
      ? []
      : checkFlint(linked, input.entryFileName, {
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
            'FLINT-GRAPH-002',
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
      code: 'FLINT-GRAPH-003',
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
      compilerVersion: input.compilerVersion,
      optimization: input.optimization,
      linkProfile: input.linkProfile ?? input.linkConfiguration?.linkProfile,
      standardLibrary: input.standardLibrary,
      async: input.async,
      targetFeatures: input.targetFeatures,
      compilerHints: input.compilerHints,
      boundsChecks: input.boundsChecks,
    },
    module,
    uniqueDiagnostics(diagnostics),
    graphLinks(input, entry, linkedRecords, graphHash),
    input.graph.modules.map(({ fileName }) => fileName),
  );
}

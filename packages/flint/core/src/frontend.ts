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

/**
 * Computes an FNV-1a hash over normalized non-comment tokens of a source file.
 * Used for cache keys and change detection in the frontend compiler pipeline.
 *
 * @param source - Flint source code text.
 * @param fileName - File identifier used during lexical tokenization.
 * @returns 8-character zero-padded hexadecimal hash string.
 */
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

/**
 * Determines the WebAssembly carrier primitive type for an ABI parameter or return type.
 * References and pointer types are carried by 32-bit integer handles.
 *
 * @param type - Primitive type descriptor with optional reference annotations.
 * @returns 'i32' for reference types, or the underlying primitive type name for values.
 */
function abiCarrierType(type: {
  readonly name: FlintPrimitiveType;
  readonly reference?: string;
  readonly referenceMode?: 'ref' | 'mut-ref';
}): FlintPrimitiveType {
  return type.reference === undefined ? type.name : 'i32';
}

/**
 * Resolves the ABI reference identity for a type, falling back to struct names.
 *
 * @param type - Type descriptor that may already declare an explicit reference.
 * @param module - Containing module used to detect struct-backed references.
 * @returns Reference type name, or undefined for plain value types.
 */
function referenceOf(
  type: {
    readonly name: FlintPrimitiveType;
    readonly reference?: string;
  },
  module: FlintModule,
): string | undefined {
  return type.reference ?? (module.structs.some(({ name }) => name === type.name) ? type.name : undefined);
}

/**
 * Selects the ABI passing convention for a parameter type.
 *
 * @param type - Parameter type descriptor including optional reference mode.
 * @returns ABI passing mode label.
 */
function abiPassingMode(type: {
  readonly name: FlintPrimitiveType;
  readonly reference?: string;
  readonly referenceMode?: 'ref' | 'mut-ref';
}): 'mutable-reference' | 'immutable-reference' | 'value' {
  if (type.referenceMode === 'mut-ref') return 'mutable-reference';
  if (type.referenceMode === 'ref' || type.reference !== undefined || type.name === 'bytes' || type.name === 'string') {
    return 'immutable-reference';
  }
  return 'value';
}

/**
 * Builds optional ownership metadata for an ABI parameter.
 *
 * @param type - Parameter type descriptor that may include ownership.
 * @returns Ownership field bag, empty when ownership is unspecified for non-arrays.
 */
function abiOwnershipFields(type: {
  readonly reference?: string;
  readonly ownership?: 'owned' | 'borrowed' | 'shared';
}): { readonly ownership?: 'owned' | 'borrowed' | 'shared' } {
  if (type.reference === 'Array') return { ownership: type.ownership ?? ('owned' as const) };
  if (type.ownership === undefined) return {};
  return { ownership: type.ownership };
}

/**
 * Constructs one ABI parameter descriptor from an AST function parameter.
 *
 * @param parameter - Function parameter declaration from the module AST.
 * @param module - Containing module AST used to resolve struct references.
 * @returns Structured ABI parameter descriptor.
 */
function abiParameter(
  parameter: FlintModule['functions'][number]['parameters'][number],
  module: FlintModule,
): FlintAbiFunction['parameters'][number] {
  const { name, type } = parameter;
  const resolvedReference = referenceOf(type, module);
  return {
    name,
    type: abiCarrierType({ ...type, reference: resolvedReference }),
    ...(resolvedReference === undefined ? {} : { reference: resolvedReference }),
    passing: abiPassingMode(type),
    ...(type.referenceMode === undefined ? {} : { referenceMode: type.referenceMode }),
    ...(type.arguments === undefined ? {} : { arguments: type.arguments }),
    ...(type.length === undefined ? {} : { length: type.length }),
    ...abiOwnershipFields(type),
  };
}

/**
 * Constructs an ABI function metadata record from an AST function declaration.
 * Normalizes parameter carrier types, passing conventions, and ownership semantics.
 *
 * @param declaration - Function declaration node from the module AST.
 * @param module - Containing module AST used to resolve struct references.
 * @returns Structured ABI function descriptor conforming to Flint ABI.
 */
function abiFunction(declaration: FlintModule['functions'][number], module: FlintModule): FlintAbiFunction {
  const resultReference = referenceOf(declaration.result, module);
  return {
    name: declaration.name,
    parameters: declaration.parameters.map((parameter) => abiParameter(parameter, module)),
    result: abiCarrierType({ ...declaration.result, reference: resultReference }),
    ...(resultReference === undefined ? {} : { resultReference }),
    ...(declaration.result.arguments === undefined ? {} : { resultArguments: declaration.result.arguments }),
    ...(declaration.result.length === undefined ? {} : { resultLength: declaration.result.length }),
    ...(declaration.result.ownership === undefined ? {} : { resultOwnership: declaration.result.ownership }),
  };
}

/**
 * Creates default empty link metadata for single-module frontend compilations.
 *
 * @returns Minimal FlintFrontendLinkMetadata structure with empty module lists.
 */
const emptyLinks = (): FlintFrontendLinkMetadata => ({
  linkedModules: [],
});

/**
 * Normalizes link optimization profile flags based on link mode and user settings.
 *
 * @param profile - Explicit link optimization profile or legacy mode string.
 * @param linkMode - Static or dynamic link mode setting.
 * @returns Resolved FlintLinkOptimizationProfile identifier.
 */
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

/**
 * Deduplicates diagnostics by composite diagnostic key while preserving order.
 *
 * @param diagnostics - Input array of diagnostics that may contain duplicates.
 * @returns Deduplicated array of diagnostics.
 */
function uniqueDiagnostics(diagnostics: readonly FlintDiagnostic[]): readonly FlintDiagnostic[] {
  return diagnostics.filter(
    (diagnostic, index, all) =>
      all.findIndex((candidate) => diagnosticKey(candidate) === diagnosticKey(diagnostic)) === index,
  );
}

/**
 * Parses and type-checks a source file, gathering combined diagnostics.
 *
 * @param input - Subset of compile input containing source text and typecheck options.
 * @returns Parsed module AST (if syntax was valid) and combined unique diagnostics.
 */
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

/**
 * Collects optional link identity fields for ABI packaging.
 *
 * @param links - Module link metadata.
 * @returns Partial options bag with graph/project/link fields when present.
 */
function abiLinkIdentityOptions(links: FlintFrontendLinkMetadata) {
  return {
    ...(links.graphHash === undefined ? {} : { graphHash: links.graphHash }),
    ...(links.projectRoot === undefined ? {} : { projectRoot: links.projectRoot }),
    ...(links.linkMode === undefined ? {} : { linkMode: links.linkMode }),
    ...(links.linkProfile === undefined ? {} : { linkProfile: links.linkProfile }),
  };
}

/**
 * Collects optional link payload fields for ABI packaging.
 *
 * @param links - Module link metadata.
 * @returns Partial options bag with source imports and linked exports when present.
 */
function abiLinkPayloadOptions(links: FlintFrontendLinkMetadata) {
  return {
    ...(links.sourceImports === undefined ? {} : { sourceImports: links.sourceImports }),
    ...(links.linkedExports === undefined ? {} : { linkedExports: links.linkedExports }),
  };
}

/**
 * Builds the ABI packaging options shared by frontend result assembly.
 *
 * @param input - Compiler configuration options.
 * @param links - Module link metadata.
 * @returns Options bag accepted by createFlintAbiManifest.
 */
function abiManifestOptions(
  input: Pick<FlintCompileInput, 'standardLibrary' | 'async' | 'targetFeatures' | 'linkProfile' | 'boundsChecks'>,
  links: FlintFrontendLinkMetadata,
) {
  return {
    ...abiLinkIdentityOptions(links),
    optimizationProfile: links.optimizationProfile ?? linkOptimizationProfile(input.linkProfile, links.linkMode),
    ...abiLinkPayloadOptions(links),
    standardLibrary: flintStandardLibraryIdentity(input.standardLibrary),
    boundsChecks: input.boundsChecks ?? 'runtime',
    ...(input.async === undefined ? {} : { async: input.async }),
    ...(input.targetFeatures === undefined ? {} : { targetFeatures: input.targetFeatures }),
  };
}

/**
 * Assembles a successful frontend result after IR lowering and SoN optimization.
 *
 * @param input - Compiler configuration options.
 * @param module - Parsed module AST known to be free of blocking diagnostics.
 * @param diagnostics - Collected syntactic and semantic diagnostics.
 * @param links - Module link metadata.
 * @param sourceFiles - List of input source file paths.
 * @returns Fully populated FlintFrontendResult.
 */
function successfulResultFor(
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
  module: FlintModule,
  diagnostics: readonly FlintDiagnostic[],
  links: FlintFrontendLinkMetadata,
  sourceFiles: readonly string[],
): FlintFrontendResult {
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
    abi: createFlintAbiManifest(optimizedModule, abiManifestOptions(input, links)),
    links,
    sourceFiles,
    diagnostics,
  };
}

/**
 * Assembles the frontend compilation result by optimizing the module through SoN and tree IR,
 * and generating ABI manifests, diagnostic collections, and link metadata.
 *
 * @param input - Compiler configuration options.
 * @param module - Parsed module AST (or undefined if parsing failed).
 * @param diagnostics - Collected syntactic and semantic diagnostics.
 * @param links - Module link metadata.
 * @param sourceFiles - List of input source file paths.
 * @returns Fully populated FlintFrontendResult.
 */
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
  return successfulResultFor(input, module, diagnostics, links, sourceFiles);
}

/**
 * Executes the frontend pipeline for a single Flint source file.
 * Performs lexing, parsing, type-checking, IR lowering, and Sea-of-Nodes optimization.
 *
 * @param input - Single-file compiler input options and source code.
 * @returns Frontend compilation result containing AST, IR, and ABI manifest.
 */
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

/**
 * Collects exported ABI functions for linked graph modules.
 *
 * @param entry - Root entry module record in the graph.
 * @param linkedRecords - Set of statically reachable modules bundled with the entry point.
 * @returns Flattened linked export descriptors.
 */
function collectLinkedExports(
  entry: FlintModuleGraph['modules'][number] | undefined,
  linkedRecords: FlintModuleGraph['modules'],
): FlintLinkedExport[] {
  const records = linkedRecords.length === 0 ? (entry === undefined ? [] : [entry]) : linkedRecords;
  return records.flatMap(({ module: sourceModule, moduleId }) =>
    sourceModule.functions
      .filter(({ exported }) => exported)
      .map((declaration) => ({ moduleId, ...abiFunction(declaration, sourceModule) })),
  );
}

/**
 * Resolves one source-import edge into frontend link metadata.
 *
 * @param input - Multi-module graph compilation input.
 * @param sourceImport - Source import declaration from the entry module.
 * @returns Structured source import metadata including optional dynamic exports.
 */
function resolveSourceImport(
  input: FlintGraphCompileInput,
  sourceImport: FlintModule['sourceImports'][number],
): FlintSourceImport {
  const edge = input.graph.edges.find(
    ({ importer, source }) =>
      normalizeFlintFileId(importer) === normalizeFlintFileId(input.entryFileName) && source === sourceImport.source,
  );
  const target =
    edge === undefined ? undefined : input.graph.modules.find(({ fileName }) => fileName === edge.resolved);
  const dynamicExports =
    target === undefined || edge?.linkMode !== 'dynamic'
      ? undefined
      : target.module.functions
          .filter(({ exported }) => exported)
          .map((declaration) => abiFunction(declaration, target.module))
          .toSorted((left, right) => left.name.localeCompare(right.name));
  return {
    source: sourceImport.source,
    alias: sourceImport.alias,
    ...(target === undefined ? {} : { resolvedModuleId: target.moduleId }),
    ...(edge === undefined ? {} : { linkMode: edge.linkMode }),
    ...(dynamicExports === undefined ? {} : { exports: dynamicExports }),
  };
}

/**
 * Determines whether the module graph contains any dynamic edges.
 *
 * @param graph - Module graph under inspection.
 * @returns True when at least one edge is dynamic.
 */
function graphHasDynamicEdges(graph: FlintModuleGraph): boolean {
  return graph.edges.some(({ linkMode }) => linkMode === 'dynamic');
}

/**
 * Resolves the effective link profile for a graph compile request.
 *
 * @param input - Multi-module graph compilation input.
 * @param hasDynamic - Whether the graph contains dynamic edges.
 * @returns Effective static/dynamic link profile.
 */
function resolveGraphLinkProfile(
  input: FlintGraphCompileInput,
  hasDynamic: boolean,
): NonNullable<FlintGraphCompileInput['linkProfile']> {
  return input.linkProfile ?? input.linkConfiguration?.linkProfile ?? (hasDynamic ? 'dynamic' : 'static');
}

/**
 * Computes link metadata for a multi-module graph, resolving static exports and dynamic import stubs.
 *
 * @param input - Multi-module graph compilation input.
 * @param entry - Root entry module record in the graph.
 * @param linkedRecords - Set of statically reachable modules bundled with the entry point.
 * @param graphHash - Stable graph topological hash string.
 * @returns Fully populated FlintFrontendLinkMetadata.
 */
function graphLinks(
  input: FlintGraphCompileInput,
  entry: FlintModuleGraph['modules'][number] | undefined,
  linkedRecords: FlintModuleGraph['modules'],
  graphHash: string,
): FlintFrontendLinkMetadata {
  const linkedExports = collectLinkedExports(entry, linkedRecords);
  const sourceImports = (entry?.module.sourceImports ?? []).map((sourceImport) =>
    resolveSourceImport(input, sourceImport),
  );
  const hasDynamic = graphHasDynamicEdges(input.graph);
  const linkMode = hasDynamic ? 'dynamic' : 'static';
  const linkProfile = resolveGraphLinkProfile(input, hasDynamic);
  return {
    graphHash,
    projectRoot: entry?.projectRoot,
    linkMode,
    linkProfile,
    optimizationProfile: linkOptimizationProfile(linkProfile, linkMode),
    sourceImports,
    linkedExports,
    linkedModules: linkedRecords.map(({ moduleId }) => moduleId),
  };
}

/**
 * Walks static import edges to collect the transitive static closure of a file.
 *
 * @param graph - Module graph containing import edges.
 * @param entryFileName - Starting file for the static closure walk.
 * @returns Set of file names reachable through static edges.
 */
function collectStaticLinkedFiles(graph: FlintModuleGraph, entryFileName: string): Set<string> {
  const linkedFiles = new Set<string>();
  const visitStatic = (fileName: string): void => {
    if (linkedFiles.has(fileName)) return;
    linkedFiles.add(fileName);
    for (const edge of graph.edges) {
      if (edge.importer === fileName && edge.linkMode === 'static') visitStatic(edge.resolved);
    }
  };
  visitStatic(entryFileName);
  return linkedFiles;
}

/**
 * Appends diagnostics for source imports that lack matching graph edges.
 *
 * @param graph - Module graph under validation.
 * @param diagnostics - Mutable diagnostics collection receiving unresolved import errors.
 */
function collectUnresolvedImportDiagnostics(graph: FlintModuleGraph, diagnostics: FlintDiagnostic[]): void {
  for (const resolvedModule of graph.modules) {
    for (const sourceImport of resolvedModule.module.sourceImports) {
      const resolved = graph.edges.some(
        ({ importer, source }) => importer === resolvedModule.fileName && source === sourceImport.source,
      );
      if (resolved) continue;
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
}

/**
 * Appends a diagnostic when the requested graph entry file is missing.
 *
 * @param entryFileName - Requested entry file path.
 * @param entry - Resolved entry module, if present.
 * @param diagnostics - Mutable diagnostics collection receiving the entry error.
 */
function collectMissingEntryDiagnostic(
  entryFileName: string,
  entry: FlintModuleGraph['modules'][number] | undefined,
  diagnostics: FlintDiagnostic[],
): void {
  if (entry !== undefined) return;
  diagnostics.push({
    code: 'FLINT-GRAPH-003',
    severity: 'error',
    phase: 'graph',
    message: `Graph entry '${entryFileName}' was not resolved.`,
    fileName: entryFileName,
    span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
  });
}

/**
 * Prepares the compiler frontend for a linked multi-module graph.
 * Resolves static dependency closures, type-checks the combined component,
 * and lowers the linked module to optimized IR and ABI manifests.
 *
 * @param input - Multi-module graph compilation input including graph edges and entry point.
 * @returns Combined frontend compilation result for the linked module graph.
 */
export function prepareFlintGraphFrontend(input: FlintGraphCompileInput): FlintFrontendResult {
  const configuration: FlintLinkConfiguration = {
    ...input.linkConfiguration,
    ...(input.linkProfile === undefined ? {} : { linkProfile: input.linkProfile }),
  };
  const graphHash = hashFlintModuleGraph(input.graph, configuration);
  const links = validateFlintLinks(input.graph, configuration);
  const entry = input.graph.modules.find(({ fileName }) => fileName === input.entryFileName);
  const linked = links.staticModules.find(({ name }) => name === entry?.moduleId);
  const linkedFiles = entry === undefined ? new Set<string>() : collectStaticLinkedFiles(input.graph, entry.fileName);
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
  collectUnresolvedImportDiagnostics(input.graph, diagnostics);
  collectMissingEntryDiagnostic(input.entryFileName, entry, diagnostics);
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

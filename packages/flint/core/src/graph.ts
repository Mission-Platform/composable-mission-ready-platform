import { createDiagnostic, type FlintDiagnostic } from './diagnostics.js';
import { deriveFlintModuleId, normalizeFlintFileId } from './identity.js';
import { resolveFlintImportTypeEnvironment } from './module-types.js';
import { parseFlint } from './parser.js';
import { checkFlint } from './type-checker.js';

import type { FlintModule } from './ast.js';

/**
 * Linking mode specifying whether dependencies are resolved statically (bundled
 * into a single component) or dynamically (via host-level runtime imports).
 */
export type FlintLinkMode = 'static' | 'dynamic';

/**
 * Represents a project boundary containing a file root and derived identifier.
 */
export interface FlintProject {
  readonly root: string;
  readonly id: string;
}

/**
 * Resolved Flint source module containing parsed AST, source text,
 * project root association, and content hash.
 */
export interface FlintResolvedModule {
  readonly fileName: string;
  readonly moduleId: string;
  readonly projectRoot: string;
  readonly source: string;
  readonly contentHash: string;
  readonly module: FlintModule;
}

/**
 * Directed dependency edge in the module graph linking an importer to an importee
 * with an associated linking strategy and source code location span.
 */
export interface FlintModuleEdge {
  readonly importer: string;
  readonly source: string;
  readonly resolved: string;
  readonly resolvedModuleId?: string;
  readonly linkMode: FlintLinkMode;
  readonly span: FlintModule['sourceImports'][number]['span'];
}

/**
 * Directed module dependency graph capturing resolved modules, dependency edges,
 * and participating project boundaries.
 */
export interface FlintModuleGraph {
  readonly modules: readonly FlintResolvedModule[];
  readonly edges: readonly FlintModuleEdge[];
  readonly projects: readonly FlintProject[];
}

/**
 * Configuration options governing cross-project and same-project module linking policies.
 */
export interface FlintLinkConfiguration {
  readonly projectRoots?: readonly string[];
  /** Selects the cross-project packaging policy when no explicit mode exists. */
  readonly linkProfile?: FlintLinkMode;
  readonly defaultLinkMode?: FlintLinkMode;
  readonly crossProjectLinkMode?: FlintLinkMode;
  readonly linkModes?: Readonly<Record<string, FlintLinkMode>>;
}

/**
 * Interface for resolving import specifiers and asynchronously loading module source text.
 */
export interface FlintModuleResolver {
  resolve(source: string, importer: string): string | undefined | Promise<string | undefined>;
  load(fileName: string): string | Promise<string>;
}

/**
 * Aggregate result of resolving a module graph, returning the module graph structure and diagnostics.
 */
export interface FlintGraphResult {
  readonly graph: FlintModuleGraph;
  readonly diagnostics: readonly FlintDiagnostic[];
}

/**
 * Computes a deterministic 32-bit FNV-1a hex hash of a module graph and its link configuration.
 *
 * @param graph - Module dependency graph to hash.
 * @param configuration - Link configuration influencing graph resolution.
 * @returns An 8-character lowercase hexadecimal hash string.
 */
export function hashFlintModuleGraph(graph: FlintModuleGraph, configuration: FlintLinkConfiguration = {}): string {
  const value = JSON.stringify({
    modules: graph.modules
      .map(({ fileName, moduleId, projectRoot, contentHash }) => ({ fileName, moduleId, projectRoot, contentHash }))
      .toSorted((left, right) => left.fileName.localeCompare(right.fileName)),
    edges: graph.edges
      .map(({ importer, source, resolved, linkMode }) => ({ importer, source, resolved, linkMode }))
      .toSorted((left, right) =>
        `${left.importer}:${left.resolved}`.localeCompare(`${right.importer}:${right.resolved}`),
      ),
    projects: graph.projects,
    configuration,
  });
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.codePointAt(index) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Computes a deterministic 32-bit FNV-1a hex hash of a source code string.
 *
 * @param source - Source code text to hash.
 * @returns An 8-character lowercase hexadecimal hash string.
 */
function hashSource(source: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.codePointAt(index) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Determines the most specific project root directory for a given source file name.
 *
 * @param fileName - Normalized path of the source file.
 * @param roots - Known project root paths.
 * @returns The matching project root path, or `'<workspace>'` if none matched.
 */
function projectFor(fileName: string, roots: readonly string[]): string {
  const normalized = normalizeFlintFileId(fileName);
  return (
    roots
      .map((root) => normalizeFlintFileId(root))
      .filter((root) => normalized === root || normalized.startsWith(`${root}/`))
      .toSorted((left, right) => right.length - left.length)[0] ?? '<workspace>'
  );
}

/**
 * Determines the effective link mode between an importing module and a target module.
 *
 * @param importer - Module containing the import statement.
 * @param target - Target module being imported.
 * @param configuration - Active link configuration rules.
 * @returns The resolved link mode (`'static'` or `'dynamic'`).
 */
function linkModeFor(
  importer: FlintResolvedModule,
  target: FlintResolvedModule,
  configuration: FlintLinkConfiguration,
): FlintLinkMode {
  const key = `${importer.projectRoot}->${target.projectRoot}`;
  const configured = configuration.linkModes?.[key] ?? configuration.linkModes?.[target.projectRoot];
  if (configured !== undefined) return configured;
  if (importer.projectRoot === target.projectRoot) return 'static';
  return configuration.crossProjectLinkMode ?? configuration.defaultLinkMode ?? configuration.linkProfile ?? 'dynamic';
}

/**
 * Checks for a cyclic dependency during module graph traversal and emits a diagnostic if detected.
 *
 * @param normalizedFileName - Normalized path of the candidate module.
 * @param visiting - Set of file paths currently in the active traversal stack.
 * @param modules - Map of already resolved modules by file path.
 * @param configuration - Active link configuration options.
 * @param diagnostics - Diagnostic list to append to when a cycle is encountered.
 * @returns `true` if a cycle was detected and traversal of this module should be skipped, `false` otherwise.
 */
function checkModuleCycle(
  normalizedFileName: string,
  visiting: ReadonlySet<string>,
  modules: ReadonlyMap<string, FlintResolvedModule>,
  configuration: FlintLinkConfiguration,
  diagnostics: FlintDiagnostic[],
): boolean {
  if (!visiting.has(normalizedFileName)) {
    return false;
  }
  if (configuration.defaultLinkMode !== 'dynamic' && configuration.crossProjectLinkMode !== 'dynamic') {
    const module = modules.get(normalizedFileName);
    diagnostics.push(
      createDiagnostic(
        normalizedFileName,
        'link',
        'FLINT-LINK-001',
        'Source module cycle detected.',
        module?.module.span ?? {
          start: 0,
          end: 0,
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 1,
        },
      ),
    );
  }
  return true;
}

/**
 * Checks for duplicate module identifiers across different source files and emits collisions.
 *
 * @param module - Resolved module to check.
 * @param modules - Map of resolved modules indexed by file name.
 * @param moduleIds - Map of registered module identifiers to file names.
 * @param diagnostics - Diagnostic list to append collisions to.
 */
function checkModuleIdentityCollisions(
  module: FlintResolvedModule,
  modules: ReadonlyMap<string, FlintResolvedModule>,
  moduleIds: ReadonlyMap<string, string>,
  diagnostics: FlintDiagnostic[],
): void {
  const previous = modules.get(module.fileName);
  const previousFileName = moduleIds.get(module.moduleId);
  if (previousFileName !== undefined && previousFileName !== module.fileName) {
    diagnostics.push(
      createDiagnostic(
        module.fileName,
        'graph',
        'FLINT-GRAPH-001',
        `Module identity collision for '${module.moduleId}'.`,
        module.module.span,
      ),
    );
  }
  if (previous !== undefined && previous.moduleId !== module.moduleId) {
    diagnostics.push(
      createDiagnostic(
        module.fileName,
        'graph',
        'FLINT-GRAPH-001',
        `Module identity collision for '${module.moduleId}'.`,
        module.module.span,
      ),
    );
  }
}

/**
 * Context state bundle used during recursive module graph resolution.
 */
interface ModuleGraphContext {
  readonly roots: readonly string[];
  readonly resolver: FlintModuleResolver;
  readonly configuration: FlintLinkConfiguration;
  readonly diagnostics: FlintDiagnostic[];
  readonly modules: Map<string, FlintResolvedModule>;
  readonly moduleIds: Map<string, string>;
  readonly edges: FlintModuleEdge[];
  readonly visiting: Set<string>;
  readonly visited: Set<string>;
}

/**
 * Resolves imported dependencies for a single module, traversing target modules recursively.
 *
 * @param module - Resolved module whose source imports are being processed.
 * @param sourceImports - List of source imports declared in the module AST.
 * @param context - Graph resolution context holding shared maps and diagnostics.
 * @param visit - Visitor callback to recursively resolve imported module dependencies.
 */
async function resolveModuleImports(
  module: FlintResolvedModule,
  sourceImports: FlintModule['sourceImports'],
  context: ModuleGraphContext,
  visit: (fileName: string) => Promise<void>,
): Promise<void> {
  for (const imported of sourceImports) {
    const resolved = await context.resolver.resolve(imported.source, module.fileName);
    if (resolved === undefined) {
      context.diagnostics.push(
        createDiagnostic(
          module.fileName,
          'graph',
          'FLINT-GRAPH-002',
          `Unable to resolve source module '${imported.source}'.`,
          imported.span,
          'error',
          'Check the import path and project roots.',
        ),
      );
      continue;
    }
    const targetFileName = normalizeFlintFileId(resolved);
    await visit(targetFileName);
    const target = context.modules.get(targetFileName);
    if (target !== undefined) {
      context.edges.push({
        importer: module.fileName,
        source: imported.source,
        resolved: targetFileName,
        resolvedModuleId: target.moduleId,
        linkMode: linkModeFor(module, target, context.configuration),
        span: imported.span,
      });
    }
  }
}

/**
 * Asynchronously resolves the full module dependency graph starting from one or more entry points.
 *
 * @param entries - File paths of root entry modules to resolve.
 * @param resolver - Module resolver responsible for path mapping and content loading.
 * @param configuration - Linking and packaging configuration options.
 * @returns Graph result containing resolved modules, dependency edges, projects, and diagnostics.
 */
export async function resolveFlintModuleGraph(
  entries: readonly string[],
  resolver: FlintModuleResolver,
  configuration: FlintLinkConfiguration = {},
): Promise<FlintGraphResult> {
  const context: ModuleGraphContext = {
    roots: configuration.projectRoots ?? [],
    resolver,
    configuration,
    diagnostics: [],
    modules: new Map(),
    moduleIds: new Map(),
    edges: [],
    visiting: new Set(),
    visited: new Set(),
  };

  const visit = async (fileName: string): Promise<void> => {
    const normalizedFileName = normalizeFlintFileId(fileName);
    if (context.visited.has(normalizedFileName)) return;
    if (checkModuleCycle(normalizedFileName, context.visiting, context.modules, configuration, context.diagnostics)) {
      return;
    }
    context.visiting.add(normalizedFileName);
    const projectRoot = projectFor(normalizedFileName, context.roots);
    const source = await resolver.load(normalizedFileName);
    const parsed = parseFlint(source, normalizedFileName, { root: projectRoot });
    context.diagnostics.push(...parsed.diagnostics);
    if (parsed.module === undefined) {
      context.visiting.delete(normalizedFileName);
      context.visited.add(normalizedFileName);
      return;
    }
    const module: FlintResolvedModule = {
      fileName: normalizedFileName,
      moduleId: deriveFlintModuleId(normalizedFileName, projectRoot),
      projectRoot,
      source,
      contentHash: hashSource(source),
      module: parsed.module,
    };
    checkModuleIdentityCollisions(module, context.modules, context.moduleIds, context.diagnostics);
    context.moduleIds.set(module.moduleId, normalizedFileName);
    context.modules.set(normalizedFileName, module);
    await resolveModuleImports(module, parsed.module.sourceImports, context, visit);
    const importTypeEnvironment = resolveFlintImportTypeEnvironment(module, {
      modules: [...context.modules.values()],
      edges: context.edges,
      projects: [],
    });
    const checked = checkFlint(parsed.module, normalizedFileName, {
      requireExports: false,
      externalFunctions: importTypeEnvironment.externalFunctions,
    });
    context.diagnostics.push(...checked.diagnostics);
    context.visiting.delete(normalizedFileName);
    context.visited.add(normalizedFileName);
  };

  for (const entry of entries) await visit(entry);
  const projects = [...new Set([...context.modules.values()].map(({ projectRoot }) => projectRoot))]
    .toSorted()
    .map((root) => ({ root, id: deriveFlintModuleId(root) }));
  return {
    graph: { modules: [...context.modules.values()], edges: context.edges, projects },
    diagnostics: context.diagnostics,
  };
}

export { deriveFlintModuleId, normalizeFlintFileId } from './identity.js';

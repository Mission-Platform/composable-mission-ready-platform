import { createDiagnostic, type FlintDiagnostic } from './diagnostics.js';
import { deriveFlintModuleId, normalizeFlintFileId } from './identity.js';
import { resolveFlintImportTypeEnvironment } from './module-types.js';
import { parseFlint } from './parser.js';
import { checkFlint } from './type-checker.js';

import type { FlintModule } from './ast.js';

export type FlintLinkMode = 'static' | 'dynamic';

export interface FlintProject {
  readonly root: string;
  readonly id: string;
}

export interface FlintResolvedModule {
  readonly fileName: string;
  readonly moduleId: string;
  readonly projectRoot: string;
  readonly source: string;
  readonly contentHash: string;
  readonly module: FlintModule;
}

export interface FlintModuleEdge {
  readonly importer: string;
  readonly source: string;
  readonly resolved: string;
  readonly resolvedModuleId?: string;
  readonly linkMode: FlintLinkMode;
  readonly span: FlintModule['sourceImports'][number]['span'];
}

export interface FlintModuleGraph {
  readonly modules: readonly FlintResolvedModule[];
  readonly edges: readonly FlintModuleEdge[];
  readonly projects: readonly FlintProject[];
}

export interface FlintLinkConfiguration {
  readonly projectRoots?: readonly string[];
  /** Selects the cross-project packaging policy when no explicit mode exists. */
  readonly linkProfile?: FlintLinkMode;
  readonly defaultLinkMode?: FlintLinkMode;
  readonly crossProjectLinkMode?: FlintLinkMode;
  readonly linkModes?: Readonly<Record<string, FlintLinkMode>>;
}

export interface FlintModuleResolver {
  resolve(source: string, importer: string): string | undefined | Promise<string | undefined>;
  load(fileName: string): string | Promise<string>;
}

export interface FlintGraphResult {
  readonly graph: FlintModuleGraph;
  readonly diagnostics: readonly FlintDiagnostic[];
}

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

function hashSource(source: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.codePointAt(index) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function projectFor(fileName: string, roots: readonly string[]): string {
  const normalized = normalizeFlintFileId(fileName);
  return (
    roots
      .map((root) => normalizeFlintFileId(root))
      .filter((root) => normalized === root || normalized.startsWith(`${root}/`))
      .toSorted((left, right) => right.length - left.length)[0] ?? '<workspace>'
  );
}

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

export async function resolveFlintModuleGraph(
  entries: readonly string[],
  resolver: FlintModuleResolver,
  configuration: FlintLinkConfiguration = {},
): Promise<FlintGraphResult> {
  const roots = configuration.projectRoots ?? [];
  const diagnostics: FlintDiagnostic[] = [];
  const modules = new Map<string, FlintResolvedModule>();
  const moduleIds = new Map<string, string>();
  const edges: FlintModuleEdge[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = async (fileName: string): Promise<void> => {
    const normalizedFileName = normalizeFlintFileId(fileName);
    if (visited.has(normalizedFileName)) return;
    if (visiting.has(normalizedFileName)) {
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
      return;
    }
    visiting.add(normalizedFileName);
    const projectRoot = projectFor(normalizedFileName, roots);
    const source = await resolver.load(normalizedFileName);
    const parsed = parseFlint(source, normalizedFileName, { root: projectRoot });
    diagnostics.push(...parsed.diagnostics);
    if (parsed.module === undefined) {
      visiting.delete(normalizedFileName);
      visited.add(normalizedFileName);
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
    const previous = modules.get(normalizedFileName);
    const previousFileName = moduleIds.get(module.moduleId);
    if (previousFileName !== undefined && previousFileName !== normalizedFileName)
      diagnostics.push(
        createDiagnostic(
          normalizedFileName,
          'graph',
          'FLINT-GRAPH-001',
          `Module identity collision for '${module.moduleId}'.`,
          module.module.span,
        ),
      );
    if (previous !== undefined && previous.moduleId !== module.moduleId)
      diagnostics.push(
        createDiagnostic(
          normalizedFileName,
          'graph',
          'FLINT-GRAPH-001',
          `Module identity collision for '${module.moduleId}'.`,
          module.module.span,
        ),
      );
    moduleIds.set(module.moduleId, normalizedFileName);
    modules.set(normalizedFileName, module);
    for (const imported of parsed.module.sourceImports) {
      const resolved = await resolver.resolve(imported.source, normalizedFileName);
      if (resolved === undefined) {
        diagnostics.push(
          createDiagnostic(
            normalizedFileName,
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
      const target = modules.get(targetFileName);
      if (target !== undefined)
        edges.push({
          importer: normalizedFileName,
          source: imported.source,
          resolved: targetFileName,
          resolvedModuleId: target.moduleId,
          linkMode: linkModeFor(module, target, configuration),
          span: imported.span,
        });
    }
    const importTypeEnvironment = resolveFlintImportTypeEnvironment(module, {
      modules: [...modules.values()],
      edges,
      projects: [],
    });
    const checked = checkFlint(parsed.module, normalizedFileName, {
      requireExports: false,
      externalFunctions: importTypeEnvironment.externalFunctions,
    });
    diagnostics.push(...checked.diagnostics);
    visiting.delete(normalizedFileName);
    visited.add(normalizedFileName);
  };
  for (const entry of entries) await visit(entry);
  const projects = [...new Set([...modules.values()].map(({ projectRoot }) => projectRoot))]
    .toSorted()
    .map((root) => ({ root, id: deriveFlintModuleId(root) }));
  return { graph: { modules: [...modules.values()], edges, projects }, diagnostics };
}

export { deriveFlintModuleId, normalizeFlintFileId } from './identity.js';

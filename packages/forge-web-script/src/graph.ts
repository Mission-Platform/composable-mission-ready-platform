import { createDiagnostic, type ForgeWebScriptDiagnostic } from './diagnostics.js';
import { deriveForgeWebScriptModuleId, normalizeForgeWebScriptFileId } from './identity.js';
import { parseForgeWebScript } from './parser.js';
import { checkForgeWebScript } from './type-checker.js';

import type { ForgeWebScriptModule } from './ast.js';

export type ForgeWebScriptLinkMode = 'static' | 'dynamic';

export interface ForgeWebScriptProject {
  readonly root: string;
  readonly id: string;
}

export interface ForgeWebScriptResolvedModule {
  readonly fileName: string;
  readonly moduleId: string;
  readonly projectRoot: string;
  readonly source: string;
  readonly contentHash: string;
  readonly module: ForgeWebScriptModule;
}

export interface ForgeWebScriptModuleEdge {
  readonly importer: string;
  readonly source: string;
  readonly resolved: string;
  readonly resolvedModuleId?: string;
  readonly linkMode: ForgeWebScriptLinkMode;
  readonly span: ForgeWebScriptModule['sourceImports'][number]['span'];
}

export interface ForgeWebScriptModuleGraph {
  readonly modules: readonly ForgeWebScriptResolvedModule[];
  readonly edges: readonly ForgeWebScriptModuleEdge[];
  readonly projects: readonly ForgeWebScriptProject[];
}

export interface ForgeWebScriptLinkConfiguration {
  readonly projectRoots?: readonly string[];
  readonly defaultLinkMode?: ForgeWebScriptLinkMode;
  readonly crossProjectLinkMode?: ForgeWebScriptLinkMode;
  readonly linkModes?: Readonly<Record<string, ForgeWebScriptLinkMode>>;
}

export interface ForgeWebScriptModuleResolver {
  resolve(source: string, importer: string): string | undefined | Promise<string | undefined>;
  load(fileName: string): string | Promise<string>;
}

export interface ForgeWebScriptGraphResult {
  readonly graph: ForgeWebScriptModuleGraph;
  readonly diagnostics: readonly ForgeWebScriptDiagnostic[];
}

export function hashForgeWebScriptModuleGraph(
  graph: ForgeWebScriptModuleGraph,
  configuration: ForgeWebScriptLinkConfiguration = {},
): string {
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
  const normalized = normalizeForgeWebScriptFileId(fileName);
  return (
    roots
      .map((root) => normalizeForgeWebScriptFileId(root))
      .filter((root) => normalized === root || normalized.startsWith(`${root}/`))
      .toSorted((left, right) => right.length - left.length)[0] ?? '<workspace>'
  );
}

function linkModeFor(
  importer: ForgeWebScriptResolvedModule,
  target: ForgeWebScriptResolvedModule,
  configuration: ForgeWebScriptLinkConfiguration,
): ForgeWebScriptLinkMode {
  const key = `${importer.projectRoot}->${target.projectRoot}`;
  const configured = configuration.linkModes?.[key] ?? configuration.linkModes?.[target.projectRoot];
  if (configured !== undefined) return configured;
  if (importer.projectRoot === target.projectRoot) return 'static';
  return configuration.crossProjectLinkMode ?? configuration.defaultLinkMode ?? 'dynamic';
}

export async function resolveForgeWebScriptModuleGraph(
  entries: readonly string[],
  resolver: ForgeWebScriptModuleResolver,
  configuration: ForgeWebScriptLinkConfiguration = {},
): Promise<ForgeWebScriptGraphResult> {
  const roots = configuration.projectRoots ?? [];
  const diagnostics: ForgeWebScriptDiagnostic[] = [];
  const modules = new Map<string, ForgeWebScriptResolvedModule>();
  const moduleIds = new Map<string, string>();
  const edges: ForgeWebScriptModuleEdge[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = async (fileName: string): Promise<void> => {
    const normalizedFileName = normalizeForgeWebScriptFileId(fileName);
    if (visited.has(normalizedFileName)) return;
    if (visiting.has(normalizedFileName)) {
      if (configuration.defaultLinkMode !== 'dynamic' && configuration.crossProjectLinkMode !== 'dynamic') {
        const module = modules.get(normalizedFileName);
        diagnostics.push(
          createDiagnostic(
            normalizedFileName,
            'link',
            'FWS-LINK-001',
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
    const parsed = parseForgeWebScript(source, normalizedFileName, { root: projectRoot });
    diagnostics.push(...parsed.diagnostics);
    if (parsed.module === undefined) {
      visiting.delete(normalizedFileName);
      visited.add(normalizedFileName);
      return;
    }
    const module: ForgeWebScriptResolvedModule = {
      fileName: normalizedFileName,
      moduleId: deriveForgeWebScriptModuleId(normalizedFileName, projectRoot),
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
          'FWS-GRAPH-001',
          `Module identity collision for '${module.moduleId}'.`,
          module.module.span,
        ),
      );
    if (previous !== undefined && previous.moduleId !== module.moduleId)
      diagnostics.push(
        createDiagnostic(
          normalizedFileName,
          'graph',
          'FWS-GRAPH-001',
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
            'FWS-GRAPH-002',
            `Unable to resolve source module '${imported.source}'.`,
            imported.span,
            'error',
            'Check the import path and project roots.',
          ),
        );
        continue;
      }
      const targetFileName = normalizeForgeWebScriptFileId(resolved);
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
    const linkedFunctions = edges
      .filter(({ importer }) => importer === normalizedFileName)
      .flatMap((edge) => {
        const alias = module.module.sourceImports.find(({ source }) => source === edge.source)?.alias;
        return (modules.get(edge.resolved)?.module.functions ?? [])
          .filter(({ exported }) => exported)
          .flatMap((declaration) =>
            alias === undefined ? [declaration] : [declaration, { ...declaration, name: `${alias}.${declaration.name}` }],
          );
      });
    const checked = checkForgeWebScript(parsed.module, normalizedFileName, {
      requireExports: false,
      externalFunctions: linkedFunctions,
    });
    diagnostics.push(...checked.diagnostics);
    visiting.delete(normalizedFileName);
    visited.add(normalizedFileName);
  };
  for (const entry of entries) await visit(entry);
  const projects = [...new Set([...modules.values()].map(({ projectRoot }) => projectRoot))]
    .toSorted()
    .map((root) => ({ root, id: deriveForgeWebScriptModuleId(root) }));
  return { graph: { modules: [...modules.values()], edges, projects }, diagnostics };
}

export { deriveForgeWebScriptModuleId, normalizeForgeWebScriptFileId } from './identity.js';

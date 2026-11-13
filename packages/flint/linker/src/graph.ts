import {
  createDiagnostic,
  type FlintDiagnostic,
  type FlintFunction,
  type FlintModule,
} from "@mission-platform/flint-ast";
import { parseFlint } from "@mission-platform/flint-parser";
import { checkFlint } from "@mission-platform/flint-types";

export type FlintLinkMode = "static" | "dynamic";

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
  readonly span: FlintModule["sourceImports"][number]["span"];
}

export interface FlintModuleGraph {
  readonly modules: readonly FlintResolvedModule[];
  readonly edges: readonly FlintModuleEdge[];
  readonly projects: readonly FlintProject[];
  readonly topologicalOrder?: readonly string[];
}

export type ForeignObjectFormat = "wasm-relocatable" | "elf-object" | "mach-o";

export interface FlintForeignObjectReference {
  readonly name: string;
  readonly path: string;
  readonly library?: string;
  readonly format: ForeignObjectFormat;
  readonly exportedSymbols: readonly string[];
  readonly undefinedSymbols?: readonly string[];
  readonly binary?: Uint8Array;
}

export interface FlintLinkConfiguration {
  readonly projectRoots?: readonly string[];
  readonly linkProfile?: FlintLinkMode;
  readonly defaultLinkMode?: FlintLinkMode;
  readonly crossProjectLinkMode?: FlintLinkMode;
  readonly linkModes?: Readonly<Record<string, FlintLinkMode>>;
  readonly foreignObjects?: readonly FlintForeignObjectReference[];
}

export interface FlintModuleResolver {
  resolve(
    source: string,
    importer: string,
  ): string | undefined | Promise<string | undefined>;
  load(fileName: string): string | Promise<string>;
}

export interface FlintGraphResult {
  readonly graph: FlintModuleGraph;
  readonly diagnostics: readonly FlintDiagnostic[];
}

export interface FlintImportTypeEnvironment {
  readonly externalFunctions: readonly FlintFunction[];
}

export function normalizeFlintFileId(fileName: string): string {
  return fileName.replace(/\\/gu, "/").replace(/^\.\//u, "");
}

export function deriveFlintModuleId(
  fileName: string,
  projectRoot?: string,
): string {
  const normalizedFile = normalizeFlintFileId(fileName);
  if (projectRoot !== undefined && projectRoot.length > 0) {
    const normalizedRoot = normalizeFlintFileId(projectRoot).replace(
      /\/$/u,
      "",
    );
    if (normalizedFile.startsWith(`${normalizedRoot}/`)) {
      return normalizedFile
        .slice(normalizedRoot.length + 1)
        .replace(/\.flint$/u, "");
    }
  }
  return normalizedFile.replace(/\.flint$/u, "");
}

export function hashFlintModuleGraph(
  graph: FlintModuleGraph,
  configuration: FlintLinkConfiguration = {},
): string {
  const value = JSON.stringify({
    modules: graph.modules
      .map(({ fileName, moduleId, projectRoot, contentHash }) => ({
        fileName,
        moduleId,
        projectRoot,
        contentHash,
      }))
      .toSorted((left, right) => left.fileName.localeCompare(right.fileName)),
    edges: graph.edges
      .map(({ importer, source, resolved, linkMode }) => ({
        importer,
        source,
        resolved,
        linkMode,
      }))
      .toSorted((left, right) =>
        `${left.importer}:${left.resolved}`.localeCompare(
          `${right.importer}:${right.resolved}`,
        ),
      ),
    projects: graph.projects,
    configuration,
  });
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.codePointAt(index) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function hashSource(source: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.codePointAt(index) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function projectFor(fileName: string, roots: readonly string[]): string {
  const normalized = normalizeFlintFileId(fileName);
  return (
    roots
      .map((root) => normalizeFlintFileId(root))
      .filter(
        (root) => normalized === root || normalized.startsWith(`${root}/`),
      )
      .toSorted((left, right) => right.length - left.length)[0] ?? "<workspace>"
  );
}

function linkModeFor(
  importer: FlintResolvedModule,
  target: FlintResolvedModule,
  configuration: FlintLinkConfiguration,
): FlintLinkMode {
  const key = `${importer.projectRoot}->${target.projectRoot}`;
  const configured =
    configuration.linkModes?.[key] ??
    configuration.linkModes?.[target.projectRoot];
  if (configured !== undefined) return configured;
  if (importer.projectRoot === target.projectRoot) return "static";
  return (
    configuration.crossProjectLinkMode ??
    configuration.defaultLinkMode ??
    configuration.linkProfile ??
    "dynamic"
  );
}

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
  if (
    configuration.defaultLinkMode !== "dynamic" &&
    configuration.crossProjectLinkMode !== "dynamic"
  ) {
    const module = modules.get(normalizedFileName);
    diagnostics.push(
      createDiagnostic(
        normalizedFileName,
        "link",
        "FLINT-LINK-001",
        "Source module cycle detected.",
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
        "graph",
        "FLINT-GRAPH-001",
        `Module identity collision for '${module.moduleId}'.`,
        module.module.span,
      ),
    );
  }
  if (previous !== undefined && previous.moduleId !== module.moduleId) {
    diagnostics.push(
      createDiagnostic(
        module.fileName,
        "graph",
        "FLINT-GRAPH-001",
        `Module identity collision for '${module.moduleId}'.`,
        module.module.span,
      ),
    );
  }
}

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

async function resolveModuleImports(
  module: FlintResolvedModule,
  sourceImports: FlintModule["sourceImports"],
  context: ModuleGraphContext,
  visit: (fileName: string) => Promise<void>,
): Promise<void> {
  for (const imported of sourceImports) {
    const resolved = await context.resolver.resolve(
      imported.source,
      module.fileName,
    );
    if (resolved === undefined) {
      context.diagnostics.push(
        createDiagnostic(
          module.fileName,
          "graph",
          "FLINT-GRAPH-002",
          `Unable to resolve source module '${imported.source}'.`,
          imported.span,
          "error",
          "Check the import path and project roots.",
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

export async function resolveFlintModuleGraph(
  entries: readonly string[],
  resolver: FlintModuleResolver,
  configuration: FlintLinkConfiguration = {},
): Promise<FlintGraphResult> {
  const roots = (configuration.projectRoots ?? []).map((root) =>
    normalizeFlintFileId(root),
  );
  const diagnostics: FlintDiagnostic[] = [];
  const modules = new Map<string, FlintResolvedModule>();
  const moduleIds = new Map<string, string>();
  const edges: FlintModuleEdge[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const context: ModuleGraphContext = {
    roots,
    resolver,
    configuration,
    diagnostics,
    modules,
    moduleIds,
    edges,
    visiting,
    visited,
  };

  async function visit(fileName: string): Promise<void> {
    const normalizedFileName = normalizeFlintFileId(fileName);
    if (
      checkModuleCycle(
        normalizedFileName,
        visiting,
        modules,
        configuration,
        diagnostics,
      )
    )
      return;
    if (visited.has(normalizedFileName)) return;

    visiting.add(normalizedFileName);
    let source: string;
    try {
      source = await resolver.load(normalizedFileName);
    } catch (error) {
      diagnostics.push(
        createDiagnostic(
          normalizedFileName,
          "graph",
          "FLINT-GRAPH-002",
          `Failed to load source module '${normalizedFileName}': ${error instanceof Error ? error.message : String(error)}`,
          { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
        ),
      );
      visiting.delete(normalizedFileName);
      return;
    }

    const parsed = parseFlint(source, normalizedFileName);
    diagnostics.push(...parsed.diagnostics);
    if (parsed.module !== undefined) {
      const checked = checkFlint(parsed.module, normalizedFileName);
      diagnostics.push(...checked.diagnostics);

      const projectRoot = projectFor(normalizedFileName, roots);
      const moduleId = deriveFlintModuleId(
        normalizedFileName,
        projectRoot === "<workspace>" ? undefined : projectRoot,
      );
      const resolvedModule: FlintResolvedModule = {
        fileName: normalizedFileName,
        moduleId,
        projectRoot,
        source,
        contentHash: hashSource(source),
        module: parsed.module,
      };

      checkModuleIdentityCollisions(
        resolvedModule,
        modules,
        moduleIds,
        diagnostics,
      );
      modules.set(normalizedFileName, resolvedModule);
      moduleIds.set(moduleId, normalizedFileName);

      await resolveModuleImports(
        resolvedModule,
        parsed.module.sourceImports,
        context,
        visit,
      );
    }

    visiting.delete(normalizedFileName);
    visited.add(normalizedFileName);
  }

  for (const entry of entries) {
    await visit(normalizeFlintFileId(entry));
  }

  const projects = [...new Set(roots)].map((root) => ({
    root,
    id: normalizeFlintFileId(root).split("/").filter(Boolean).pop() ?? "root",
  }));

  return {
    graph: {
      modules: [...modules.values()],
      edges,
      projects,
    },
    diagnostics,
  };
}

export function buildFlintModuleGraph(
  entryModule: FlintModule,
  resolvedModules: ReadonlyMap<string, FlintModule> = new Map(),
): FlintModuleGraph {
  const allModules: FlintResolvedModule[] = [
    {
      fileName: entryModule.name,
      moduleId: deriveFlintModuleId(entryModule.name),
      projectRoot: "<workspace>",
      source: "",
      contentHash: "",
      module: entryModule,
    },
    ...[...resolvedModules.entries()].map(([name, mod]) => ({
      fileName: name,
      moduleId: deriveFlintModuleId(name),
      projectRoot: "<workspace>",
      source: "",
      contentHash: "",
      module: mod,
    })),
  ];

  const edges: FlintModuleEdge[] = [];
  for (const mod of allModules) {
    for (const imp of mod.module.sourceImports) {
      edges.push({
        importer: mod.fileName,
        source: imp.source,
        resolved: imp.source,
        resolvedModuleId: deriveFlintModuleId(imp.source),
        linkMode: "static",
        span: imp.span,
      });
    }
  }

  return {
    modules: allModules,
    edges,
    projects: [{ root: "<workspace>", id: "workspace" }],
    topologicalOrder: [...resolvedModules.keys(), entryModule.name],
  };
}

export function resolveFlintImportTypeEnvironment(
  importer: FlintResolvedModule,
  graph: FlintModuleGraph,
): FlintImportTypeEnvironment {
  const externalFunctions = graph.edges
    .filter(
      ({ importer: importerFileName }) =>
        importerFileName === importer.fileName,
    )
    .flatMap((edge) => {
      const alias = importer.module.sourceImports.find(
        ({ source }) => source === edge.source,
      )?.alias;
      return (
        graph.modules.find(({ fileName }) => fileName === edge.resolved)?.module
          .functions ?? []
      )
        .filter(({ exported }) => exported)
        .flatMap((declaration) =>
          alias === undefined
            ? [declaration]
            : [
                declaration,
                { ...declaration, name: `${alias}.${declaration.name}` },
              ],
        );
    });

  return { externalFunctions };
}

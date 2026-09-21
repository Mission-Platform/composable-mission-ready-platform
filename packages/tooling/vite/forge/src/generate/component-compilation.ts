import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  throwOnCompilerErrors,
  type CompilerDiagnostic,
  type FrameworkOutputPlugin,
  type GeneratedModule,
} from '@mission-platform/forge-plugin-api';

import { sourceBase, type DiscoveredComponent } from '../compiler/discover.js';
import { compileRouterModule } from '../compiler/router.js';

import { componentSourcePath } from './component-discovery.js';
import { copyComponentOwnStyles } from './helper-carry.js';

import type { ForgeGenerationContext } from '../compiler/generation-context.js';
import type { ForgeFileEdge, ForgeFileGraph, ForgeFileNode } from '../compiler/graph.js';
import type { FrameworkSourceTarget } from '../generate.js';
import type { RouterOutputPlugin, RouterPluginSelection } from '@mission-platform/forge-router-plugin-api';

export interface PrepareComponentHostsOptions {
  readonly plugin: FrameworkOutputPlugin;
  readonly allComponents: readonly DiscoveredComponent[];
  readonly targetId: string;
  readonly sourceRoot: string;
  readonly context: ForgeGenerationContext;
  readonly componentFolders: Set<string>;
  readonly router?: RouterPluginSelection;
  readonly routerPlugins?: readonly RouterOutputPlugin[];
  readonly routerConditions?: readonly string[];
  readonly diagnostics?: CompilerDiagnostic[];
}

export function prepareComponentHostsList(options: PrepareComponentHostsOptions) {
  const {
    plugin,
    allComponents,
    targetId,
    sourceRoot,
    context,
    componentFolders,
    router,
    routerPlugins,
    routerConditions,
    diagnostics,
  } = options;

  if (plugin.prepareComponentHosts === undefined) {
    return undefined;
  }

  return plugin.prepareComponentHosts(
    allComponents.map((component) => {
      const sourcePath = componentSourcePath(component);
      const source = readFileSync(sourcePath, 'utf8');
      const compiledRouter = compileRouterModule({
        source,
        fileName: sourcePath,
        moduleKind: 'component',
        uiFramework: targetId,
        sourceRoot,
        conditions: routerConditions,
        router,
        routerPlugins,
      });
      diagnostics?.push(...(compiledRouter.diagnostics ?? []));
      throwOnCompilerErrors(compiledRouter.diagnostics);
      const module = context.service.analyze({
        source: compiledRouter.code,
        fileName: sourcePath,
        moduleKind: 'component',
        componentName: component.neutralName,
        componentFolders,
        sourceRoot,
        configFingerprint: context.project.fingerprint,
      });
      diagnostics?.push(...(module.diagnostics ?? []));
      throwOnCompilerErrors(module.diagnostics);
      return { componentName: component.neutralName, module };
    }),
  );
}

export interface CompileComponentTreeOptions {
  readonly allComponents: readonly DiscoveredComponent[];
  readonly context: ForgeGenerationContext;
  readonly target: FrameworkSourceTarget;
  readonly graph: ForgeFileGraph;
  readonly sourceRoot: string;
  readonly componentFolders: Set<string>;
  readonly componentHosts?: ReturnType<typeof prepareComponentHostsList>;
  readonly componentOwnTypes: Map<string, Set<string>>;
  readonly mirrorDir: (sourcePath: string) => string;
  readonly mirrorHelperDir: (sourcePath: string) => string;
  readonly writeCompiledModule: (dir: string, base: string, compiled: GeneratedModule, sourcePath?: string) => void;
  readonly copyAsset: (dir: string, name: string, sourcePath: string, identityKey?: string) => void;
  readonly carryHelperModule: (sourcePath: string) => void;
  readonly readExportedTypeNames: (sourcePath: string, source: string) => Set<string>;
  readonly router?: RouterPluginSelection;
  readonly routerPlugins?: readonly RouterOutputPlugin[];
  readonly routerConditions?: readonly string[];
}

/** Indexes resolved graph edges by their source module path. */
function indexResolvedGraphEdges(edges: readonly ForgeFileEdge[]): Map<string, ForgeFileEdge[]> {
  const edgesByFrom = new Map<string, ForgeFileEdge[]>();
  for (const edge of edges) {
    if (edge.resolved && edge.to !== undefined) {
      let list = edgesByFrom.get(edge.from);
      if (list === undefined) {
        list = [];
        edgesByFrom.set(edge.from, list);
      }
      list.push(edge);
    }
  }
  return edgesByFrom;
}

/** Copies a Forge Web Script asset and its companion type declarations into the helper output directory. */
function copyForgeWebScriptAsset(
  helperId: string,
  mirrorHelperDir: (sourcePath: string) => string,
  copyAsset: (dir: string, name: string, sourcePath: string, identityKey?: string) => void,
): void {
  const targetDir = mirrorHelperDir(helperId);
  copyAsset(targetDir, path.basename(helperId), helperId, helperId);
  const declarationPath = `${helperId}.d.ts`;
  if (existsSync(declarationPath)) {
    copyAsset(targetDir, path.basename(declarationPath), declarationPath, declarationPath);
  }
}

const NON_HELPER_NODE_KINDS = new Set(['component', 'style', 'asset']);

/** Determines whether a graph node is a carryable helper module. */
function isCarryableHelperNode(node: ForgeFileNode | undefined): node is ForgeFileNode {
  return node !== undefined && !NON_HELPER_NODE_KINDS.has(node.kind);
}

/** Determines if a graph node is a Flint or legacy Forge Web Script asset. */
function isForgeWebScriptAsset(node: ForgeFileNode | undefined): node is ForgeFileNode {
  const ext = path.extname(node?.id ?? '');
  return node?.kind === 'asset' && (ext === '.flint' || ext === '.flt' || ext === '.fws');
}

/** Evaluates an import edge from a component and carries helper modules or assets into the flat build. */
function carryImportedHelperEdge(
  edge: ForgeFileEdge,
  graph: ForgeFileGraph,
  mirrorHelperDir: (sourcePath: string) => string,
  copyAsset: (dir: string, name: string, sourcePath: string, identityKey?: string) => void,
  carryHelperModule: (sourcePath: string) => void,
): void {
  const helperNode = graph.nodes.get(edge.to as string);
  if (isForgeWebScriptAsset(helperNode)) {
    copyForgeWebScriptAsset(helperNode.id, mirrorHelperDir, copyAsset);
    return;
  }
  if (isCarryableHelperNode(helperNode)) {
    carryHelperModule(helperNode.id);
  }
}

/** Compiles a single component, writes its generated output, and propagates imported helpers. */
function compileSingleComponent(
  component: DiscoveredComponent,
  options: CompileComponentTreeOptions,
  edgesByFrom: ReadonlyMap<string, ForgeFileEdge[]>,
): void {
  const sourcePath = componentSourcePath(component);
  const source = readFileSync(sourcePath, 'utf8');
  if (!options.componentOwnTypes.has(component.folder)) {
    options.componentOwnTypes.set(component.folder, options.readExportedTypeNames(sourcePath, source));
  }
  const compiled = options.context.compile({
    source,
    moduleKind: 'component',
    componentName: component.neutralName,
    fileName: sourcePath,
    componentFolders: options.componentFolders,
    componentHosts: options.componentHosts,
    router: options.router,
    routerPlugins: options.routerPlugins,
    routerConditions: options.routerConditions,
  });
  options.writeCompiledModule(options.mirrorDir(sourcePath), sourceBase(sourcePath), compiled, sourcePath);

  for (const edge of edgesByFrom.get(sourcePath) ?? []) {
    carryImportedHelperEdge(edge, options.graph, options.mirrorHelperDir, options.copyAsset, options.carryHelperModule);
  }

  copyComponentOwnStyles({
    graph: options.graph,
    source,
    sourcePath,
    sourceRoot: options.sourceRoot,
    targetId: options.target.id,
    mirrorDir: options.mirrorDir,
    copyAsset: options.copyAsset,
  });
}

/** Traverses discovered components, compiles their templates, and carries dependencies into the target tree. */
export function compileComponentTree(options: CompileComponentTreeOptions): void {
  const edgesByFrom = indexResolvedGraphEdges(options.graph.edges);
  for (const component of options.allComponents) {
    compileSingleComponent(component, options, edgesByFrom);
  }
}

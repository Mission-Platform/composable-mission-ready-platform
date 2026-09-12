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
import type { ForgeFileGraph } from '../compiler/graph.js';
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

  return plugin.prepareComponentHosts?.(
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

export function compileComponentTree(options: CompileComponentTreeOptions): void {
  const {
    allComponents,
    context,
    target,
    graph,
    sourceRoot,
    componentFolders,
    componentHosts,
    componentOwnTypes,
    mirrorDir,
    mirrorHelperDir,
    writeCompiledModule,
    copyAsset,
    carryHelperModule,
    readExportedTypeNames,
    router,
    routerPlugins,
    routerConditions,
  } = options;

  for (const component of allComponents) {
    const sourcePath = componentSourcePath(component);
    const source = readFileSync(sourcePath, 'utf8');
    componentOwnTypes.set(component.folder, readExportedTypeNames(sourcePath, source));
    const compiled = context.compile({
      source,
      moduleKind: 'component',
      componentName: component.neutralName,
      fileName: sourcePath,
      componentFolders,
      componentHosts,
      router,
      routerPlugins,
      routerConditions,
    });
    writeCompiledModule(mirrorDir(sourcePath), sourceBase(sourcePath), compiled, sourcePath);

    // Carry each shared helper module the component imports into the flat tree
    for (const edge of graph.edges.filter(
      (candidate) => candidate.from === sourcePath && candidate.resolved && candidate.to !== undefined,
    )) {
      const helperNode = graph.nodes.get(edge.to as string);
      if (helperNode?.kind === 'asset' && path.extname(helperNode.id) === '.fws') {
        copyAsset(mirrorHelperDir(helperNode.id), path.basename(helperNode.id), helperNode.id, helperNode.id);
        const declarationPath = `${helperNode.id}.d.ts`;
        if (existsSync(declarationPath)) {
          copyAsset(mirrorHelperDir(helperNode.id), path.basename(declarationPath), declarationPath, declarationPath);
        }
        continue;
      }
      if (
        helperNode === undefined ||
        helperNode.kind === 'component' ||
        helperNode.kind === 'style' ||
        helperNode.kind === 'asset'
      ) {
        continue;
      }
      carryHelperModule(helperNode.id);
    }

    copyComponentOwnStyles({
      graph,
      source,
      sourcePath,
      sourceRoot,
      targetId: target.id,
      mirrorDir,
      copyAsset,
    });
  }
}

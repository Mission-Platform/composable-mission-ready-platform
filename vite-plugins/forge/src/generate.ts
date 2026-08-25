/**
 * Stage-1 driver + declaration synthesis for a neutral components package.
 *
 * {@link generateFrameworkSources} reads a package's neutral components barrel
 * (`src/components/index.ts`), compiles every component to the target framework
 * (React `.tsx` / Vue `.vue`) with {@link compileComponentModule}, writes them as
 * a **flat** generated tree plus a public entry module, and returns that entry
 * path so it can be handed straight to Vite's `lib.entry`. Stage 2 (the
 * framework's own Vite plugins) then compiles that tree natively.
 *
 * Because the generated entry is not a source file `tsc` sees, its public
 * `./react` / `./vue` declarations would be missing — {@link jsxComponentsEntryDtsPlugin}
 * synthesises them at build time from the same neutral barrel, importing the
 * props types from the neutral components' own emitted declarations.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import {
  throwOnCompilerErrors,
  type CompilerDiagnostic,
  type FrameworkOutputPlugin,
  type JsxFramework,
} from '@mission-platform/forge-plugin-api';
import { emitDts } from 'svelte2tsx';
import ts from 'typescript';

import { LOCAL_JSX_TYPES_FILE, localJsxTypesModuleSource, moduleTargetsFramework, parseTsx } from './compiler/ast.js';
import {
  discoverExternalExportsFromGraph,
  discoverComponentsFromGraph,
  discoverHelperExportsFromGraph,
  type DiscoveredComponent,
  type DiscoveredExternalExport,
  type DiscoveredHelperExport,
} from './compiler/discover.js';
import { createForgeGenerationContext } from './compiler/generation-context.js';
import { buildForgeFileGraph } from './compiler/graph.js';
import {
  oxcArray,
  oxcIdentifierName,
  oxcLiteralValue,
  oxcObject,
  oxcProgramBody,
  parseOxcModule,
} from './compiler/oxc.js';
import { compileRouterModule } from './compiler/router.js';
import { externalReExportLine, generateEntry, helperBindingReExportName } from './generate/entry-synthesis.js';
import { createFlatTreeEmitter } from './generate/flat-tree-emitter.js';
import { createFlatImportRewriter, rewriteFlatImportsInTargets } from './generate/flat-tree-import-rewrite.js';
import { copyComponentOwnStyles, createHelperModuleCarrier, carrySpriteHelpers } from './generate/helper-carry.js';

import type { ForgeCompilerService } from './compiler/service.js';
import type { TypeOrigin, TypeOriginResolver } from './generate/entry-synthesis.js';
import type { RouterOutputPlugin, RouterPluginSelection } from '@mission-platform/forge-router-plugin-api';
import type { Plugin } from 'vite';

export { generateEntry } from './generate/entry-synthesis.js';

/** Options for {@link generateFrameworkSources}. */
export interface GenerateFrameworkSourcesOptions {
  /** Explicit output plugin that owns the target source transformation. */
  plugin: FrameworkOutputPlugin;
  /** Absolute path of the neutral components barrel (e.g. `src/components/index.ts`). */
  componentsModule: string;
  /**
   * Absolute path of the package public entry (e.g. `src/index.ts`). Component
   * transformation still uses {@link componentsModule}; this entry is only
   * used to preserve neutral helper, type, and external exports. Defaults to
   * {@link componentsModule} for component-only packages and fixtures.
   */
  publicEntryModule?: string;
  /** Absolute path of the directory the generated sources + entry are written to. */
  outDir: string;
  /** Prefix stripped from each neutral export name to form its public name. Defaults to `Forge`. */
  stripPrefix?: string;
  /** Owning neutral source root used for graph alias resolution. Defaults to the parent of `componentsModule`. */
  sourceRoot?: string;
  /** Native router target selected independently from the UI framework target. */
  router?: RouterPluginSelection;
  /** Router targets available for id-based selection. */
  routerPlugins?: readonly RouterOutputPlugin[];
  /** Conditions forwarded to the selected router target. */
  routerConditions?: readonly string[];
  /** Persistent service reused by component and hook generation in one build session. */
  service?: ForgeCompilerService;
  /** Receives target diagnostics in addition to the service report. */
  diagnostics?: CompilerDiagnostic[];
  /** Reject test-fixture output when invoked from a production build driver. */
  rejectFixturePlaceholder?: boolean;
}

/** Target-specific source-tree conventions used by the generic package driver. */
export interface FrameworkSourceTarget {
  /** Framework/plugin identifier used for framework directives and diagnostics. */
  readonly id: string;
  /** Output plugin that owns module lowering and generation. */
  readonly plugin: FrameworkOutputPlugin;
  /** Extension, including the leading dot, for generated component modules. */
  readonly componentExtension: string;
  /** Extension used when importing a generated component module. */
  readonly componentImportExtension: string;
  /** Extension, including the leading dot, for generated composable modules. */
  readonly composableExtension: string;
  /** Extension, including the leading dot, for the generated public entry. */
  readonly entryExtension: string;
  /** Emit a component re-export for the target's module shape. */
  readonly componentReExport: (component: DiscoveredComponent, as: string, specifier: string) => string;
  /** Resolve a companion type's generated module specifier. */
  readonly typeModuleSpecifier: (origin: TypeOrigin) => string;
}

/** Create a source-tree descriptor from an explicit output plugin. */
export function createFrameworkSourceTarget(plugin: FrameworkOutputPlugin): FrameworkSourceTarget {
  const { source } = plugin;
  return {
    id: plugin.id,
    plugin,
    componentExtension: source.componentExtension,
    componentImportExtension: source.componentImportExtension,
    composableExtension: source.composableExtension,
    entryExtension: source.entryExtension,
    componentReExport: (component, as, specifier) => {
      if (source.componentExport === 'default') {
        return `export { default as ${as} } from '${specifier}';`;
      }
      if (source.componentExport === 'element') {
        return `export { ${component.neutralName}Element as ${as} } from '${specifier}';`;
      }
      return `export { ${component.neutralName} as ${as} } from '${specifier}';`;
    },
    typeModuleSpecifier: (origin) =>
      `${origin.isComponent ? `./${origin.base}${source.componentImportExtension}` : `./${origin.base}`}`,
  };
}

/**
 * Collect the **type** names a module exports — declared exported type aliases,
 * interfaces and enums, plus the members of any named `export { type … }` /
 * `export type { … } from '…'` statement. Used to resolve which flat-tree module
 * a companion type is actually declared in (a component's own module, or a
 * sibling helper such as `date-time`), so the entry re-exports it from there.
 */
function readExportedTypeNames(parsed: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  const isExported = (node: ts.HasModifiers): boolean =>
    (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
  for (const statement of parsed.statements) {
    if (
      (ts.isTypeAliasDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      isExported(statement)
    ) {
      names.add(statement.name.text);
    } else if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause !== undefined &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        if (statement.isTypeOnly || element.isTypeOnly) {
          names.add(element.name.text);
        }
      }
    }
  }
  return names;
}

/**
 * Compile a neutral components package to its per-framework source tree (Stage 1),
 * returning the generated entry module path.
 */
export function generateFrameworkSources(options: GenerateFrameworkSourcesOptions): string {
  const target = createFrameworkSourceTarget(options.plugin);
  const stripPrefix = options.stripPrefix ?? 'Forge';
  const componentsDir = path.dirname(options.componentsModule);
  const sourceRoot = options.sourceRoot ?? path.dirname(componentsDir);
  const publicEntryModule = options.publicEntryModule ?? options.componentsModule;
  const context = createForgeGenerationContext({
    service: options.service,
    target: options.plugin,
    entry: options.componentsModule,
    outDir: options.outDir,
    sourceRoot,
    diagnostics: options.diagnostics,
    rejectFixturePlaceholder: options.rejectFixturePlaceholder,
  });
  const graph = context.graph;
  const publicGraph =
    path.resolve(publicEntryModule) === path.resolve(options.componentsModule)
      ? graph
      : buildForgeFileGraph({ entry: publicEntryModule, sourceRoot });
  options.diagnostics?.push(...(context.service.report().diagnostics ?? []));
  const graphErrors = [...graph.diagnostics, ...publicGraph.diagnostics].filter(
    (diagnostic) => diagnostic.code !== 'cycle',
  );
  if (graphErrors.length > 0) {
    throw new Error(
      [
        `Forge graph entry: ${graph.entry}`,
        `Forge graph source root: ${sourceRoot}`,
        ...(publicGraph.entry === graph.entry ? [] : [`Forge public graph entry: ${publicGraph.entry}`]),
        ...graphErrors.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
      ].join('\n'),
    );
  }
  // Framework-gated components (opening with a `"use <framework>";`
  // directive) are emitted only for the framework they target; drop the rest so
  // they neither compile nor get re-exported from this framework's entry.
  const components = discoverComponentsFromGraph(graph, stripPrefix).filter((component) => {
    if (component.sourcePath === undefined || !existsSync(component.sourcePath)) {
      return false;
    }
    return moduleTargetsFramework(component.sourcePath, readFileSync(component.sourcePath, 'utf8'), target.id);
  });
  // The folder bases of every discovered component — used to tell sibling
  // **component** imports (rendered as Vue `./<base>.vue` children) apart from
  // plain **helper module** imports (kept as named `./<base>` imports and copied
  // verbatim into the flat tree below).
  const componentFolders = new Set(components.map((component) => component.folder));
  const componentSourcePath = (component: DiscoveredComponent): string => {
    if (component.sourcePath === undefined) {
      throw new Error(`Missing graph source node for component ${component.neutralName}`);
    }
    return component.sourcePath;
  };

  mkdirSync(options.outDir, { recursive: true });

  // Locale declarations augment i18next's selector types ambiently, so they
  // cannot be discovered by following the components' explicit imports. Carry
  // them into the Stage-2 source tree where tsc / vue-tsc includes them.
  const localesDir = path.join(path.dirname(componentsDir), 'locales');
  if (existsSync(localesDir)) {
    const copyLocaleTree = (sourceDir: string, relativeDir: string): void => {
      for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
        const sourcePath = path.join(sourceDir, entry.name);
        const relativePath = path.posix.join(relativeDir, entry.name);
        if (entry.isDirectory()) {
          copyLocaleTree(sourcePath, relativePath);
        } else {
          context.writer.copyFile(relativePath, sourcePath, entry.name.endsWith('.d.ts') ? 'declaration' : 'asset');
        }
      }
    };
    copyLocaleTree(localesDir, 'locales');
  }

  // Type-origin resolution inputs (see `generateEntry`'s `TypeOriginResolver`):
  // the type names each component's own module declares, and those each copied
  // helper module exports — so a companion type re-exported in the barrel is
  // re-exported from the flat-tree module that actually declares it.
  const componentOwnTypes = new Map<string, Set<string>>();
  const helperExportedTypes = new Map<string, Set<string>>();

  // Structure-preserving cache: every generated module is written under its
  // source-relative directory (`<outDir>/<src-relative-dir>/…`) instead of a flat tree.
  // A registry maps each module's base name to its mirrored directory (POSIX,
  // `''` = tree root) so the generators' flat `./<base>` import specifiers — and
  // the entry barrel's — can be rewritten to the correct nested relative path in
  // a final pass, leaving each generator's own emitter untouched.
  const toPosix = (value: string): string => value.split(path.sep).join('/');

  const emitter = createFlatTreeEmitter({
    outDir: options.outDir,
    sourceRoot,
    writer: context.writer,
  });

  const {
    moduleRegistry,
    moduleRegistryCollisions,
    sourceModuleRegistry,
    rewriteTargets,
    moduleBase,
    mirrorDir,
    mirrorHelperDir,
    relSpecifier,
    writeModule,
    copyAsset,
    writeCompiledModule,
  } = emitter;

  const rewriteFlatImports = createFlatImportRewriter({
    graphs: [publicGraph, graph],
    components,
    moduleRegistry,
    moduleRegistryCollisions,
    sourceModuleRegistry,
    moduleBase,
    relSpecifier,
  });

  // Carry a shared **helper module** (a relative value import that is not itself
  // a component) into the flat generated tree so the re-pointed `./<base>` import
  // resolves at Stage 2. A helper that authors against `@mission-platform/forge`
  // (a composable or a `createContext` module) is a *neutral* module, so it is
  // compiled per-framework via {@link compileHookModule} (React `.tsx` / Vue
  // `.ts`) just like a hook-library module; a purely framework-agnostic helper
  // (no neutral/JSX import — e.g. a ported store) is copied verbatim. Either way
  // the helper's own relative (non-component) imports are carried transitively,
  // so a composable that reads another composable or a shared context resolves.
  const carriedHelpers = new Set<string>();
  const pendingIndexSources = new Set<string>();
  const siblingComponents: DiscoveredComponent[] = [];
  const graphForSource = (sourcePath: string): ReturnType<typeof buildForgeFileGraph> | undefined =>
    [publicGraph, graph].find((candidate) => candidate.nodes.has(path.resolve(sourcePath)));
  const componentForSource = (sourcePath: string): DiscoveredComponent | undefined =>
    [...components, ...siblingComponents].find((component) => component.sourcePath === sourcePath);
  const componentForIndexExport = (
    sourceNode: ReturnType<typeof graph.nodes.get>,
    exportedName: string,
    typeOnly: boolean,
  ): DiscoveredComponent | undefined => {
    const sourceGraph = sourceNode === undefined ? undefined : graphForSource(sourceNode.id);
    let node = sourceNode;
    let name = exportedName;
    const visited = new Set<string>();
    while (node !== undefined && !visited.has(node.id)) {
      visited.add(node.id);
      const directComponent = componentForSource(node.id);
      if (directComponent !== undefined && node.id !== sourceNode?.id) {
        return directComponent;
      }
      const exportFact = node.exports.find(
        (entryExport) =>
          entryExport.exportedName === name && entryExport.specifier !== undefined && entryExport.typeOnly === typeOnly,
      );
      if (exportFact?.specifier === undefined) {
        return componentForSource(node.id);
      }
      const targetId = sourceGraph?.edges.find(
        (edge) =>
          edge.from === node?.id && edge.specifier === exportFact.specifier && edge.resolved && edge.to !== undefined,
      )?.to;
      if (targetId === undefined) {
        return undefined;
      }
      node = graph.nodes.get(targetId);
      name = exportFact.localName ?? name;
    }
    return undefined;
  };
  const exportMember = (localName: string, exportedName: string): string =>
    localName === exportedName ? localName : `${localName} as ${exportedName}`;
  const generatedModuleSpecifier = (fromSourcePath: string, targetSourcePath: string): string | undefined => {
    const target = sourceModuleRegistry.get(path.resolve(targetSourcePath));
    if (target === undefined) {
      const targetNode = graphForSource(targetSourcePath)?.nodes.get(path.resolve(targetSourcePath));
      if (targetNode === undefined || path.basename(targetNode.id, path.extname(targetNode.id)) !== 'index') {
        return undefined;
      }
      return relSpecifier(mirrorDir(fromSourcePath), mirrorDir(targetNode.id), 'index.ts');
    }
    const targetFile =
      path.extname(target.file) === '.ts' || path.extname(target.file) === '.tsx'
        ? moduleBase(target.file)
        : target.file;
    return relSpecifier(mirrorDir(fromSourcePath), target.dir, targetFile);
  };
  const generatedIndexSource = (sourcePath: string): string | undefined => {
    const sourceGraph = graphForSource(sourcePath);
    const moduleNode = sourceGraph?.nodes.get(sourcePath);
    if (moduleNode === undefined) {
      return undefined;
    }
    const source = readFileSync(sourcePath, 'utf8');
    const parsed = parseOxcModule(sourcePath, source);
    // A shared companion type is routinely re-exported from both its own helper
    // module and the component that ships it (`DateRange` from `date-time` and
    // from `forge-date-range-input`). The authored barrel tolerates that because
    // at least one side arrives through `export *`, whose ambiguous names are
    // dropped silently; the mirrored barrel names every binding explicitly, so
    // the repeat would become a duplicate identifier. First mention wins.
    const claimedExports = new Set<string>();
    let cursor = 0;
    let generated = '';
    for (const statement of oxcProgramBody(parsed.program)) {
      const original = source.slice(statement.start, statement.end);
      let replacement = original;
      const sourceNode = oxcObject(statement, 'source');
      const authoredSpecifier = oxcLiteralValue(sourceNode);
      if (
        (statement.type !== 'ExportNamedDeclaration' && statement.type !== 'ExportAllDeclaration') ||
        typeof authoredSpecifier !== 'string'
      ) {
        generated += source.slice(cursor, statement.end);
        cursor = statement.end;
        continue;
      }
      const edge = sourceGraph?.edges.find(
        (candidate) =>
          candidate.from === sourcePath &&
          candidate.specifier === authoredSpecifier &&
          candidate.resolved &&
          candidate.to !== undefined,
      );
      if (edge?.to === undefined) {
        generated += source.slice(cursor, statement.end);
        cursor = statement.end;
        continue;
      }
      const targetSpecifier = generatedModuleSpecifier(sourcePath, edge.to);
      if (targetSpecifier === undefined) {
        generated += source.slice(cursor, statement.end);
        cursor = statement.end;
        continue;
      }
      const quote = sourceNode === undefined || source[sourceNode.start] !== '"' ? "'" : '"';
      const quotedTarget = `${quote}${targetSpecifier}${quote}`;
      const exportClause = oxcArray(statement, 'specifiers');
      if (statement.type === 'ExportAllDeclaration' || exportClause.length === 0) {
        const typePrefix = statement.exportKind === 'type' ? 'type ' : '';
        replacement = `export ${typePrefix}* from ${quotedTarget};\n`;
      } else if (exportClause.every((specifier) => specifier.type === 'ExportSpecifier')) {
        const lines = exportClause.flatMap((element) => {
          const exportedName = oxcIdentifierName(oxcObject(element, 'exported'));
          if (exportedName === undefined) {
            return [undefined];
          }
          if (claimedExports.has(exportedName)) {
            return [];
          }
          claimedExports.add(exportedName);
          const typeOnly = statement.exportKind === 'type' || element.exportKind === 'type';
          const component = componentForIndexExport(moduleNode, exportedName, typeOnly);
          if (component?.sourcePath !== undefined) {
            const componentSpecifier = generatedModuleSpecifier(sourcePath, component.sourcePath);
            if (componentSpecifier === undefined) {
              return undefined;
            }
            if (typeOnly) {
              return `export type { ${exportMember(oxcIdentifierName(oxcObject(element, 'local')) ?? exportedName, exportedName)} } from '${componentSpecifier}';`;
            }
            return target.componentReExport(component, exportedName, componentSpecifier);
          }
          const typePrefix = typeOnly ? 'type ' : '';
          const localName = oxcIdentifierName(oxcObject(element, 'local')) ?? exportedName;
          return `export { ${typePrefix}${exportMember(localName, exportedName)} } from '${targetSpecifier}';`;
        });
        if (lines.includes(undefined)) {
          generated += source.slice(cursor, statement.end);
          cursor = statement.end;
          continue;
        }
        replacement = lines.length === 0 ? '' : `${(lines as string[]).join('\n')}\n`;
      } else {
        const sourceStart = sourceNode?.start ?? statement.start;
        const sourceEnd = sourceNode?.end ?? sourceStart;
        replacement = `${original.slice(0, sourceStart - statement.start)}${quotedTarget}${original.slice(
          sourceEnd - statement.start,
        )}`;
      }
      generated += `${source.slice(cursor, statement.start)}${replacement}`;
      cursor = statement.end;
    }
    return `${generated}${source.slice(cursor)}`;
  };
  const carryHelperModule = createHelperModuleCarrier({
    graphs: [publicGraph, graph],
    context,
    router: options.router,
    routerPlugins: options.routerPlugins,
    routerConditions: options.routerConditions,
    mirrorHelperDir,
    writeCompiledModule,
    writeModule,
    copyAsset,
    carriedHelpers,
    pendingIndexSources,
    helperExportedTypes,
    readExportedTypeNames,
  });

  // Discover co-located **sibling components**: a component folder may ship
  // focused child components authored beside the primary (e.g. `forge-tree-view/`
  // holds `forge-tree-view.tsx` + `forge-tree-view-item.tsx`). They are not
  // re-exported from the package barrel, so they are found by following each
  // component's relative **PascalCase** value imports to a co-located neutral
  // component `.tsx`, then compiled as first-class components. Their folder base
  // is added to `componentFolders` so the parent's `<Child/>` tag (and the
  // child's own recursion) resolves to a sibling component, not a helper.
  const discoveredFolders = new Set(components.map((component) => component.folder));
  const discoveryQueue: DiscoveredComponent[] = [...components];
  while (discoveryQueue.length > 0) {
    const current = discoveryQueue.shift() as DiscoveredComponent;
    const currentPath = componentSourcePath(current);
    const currentNode = graph.nodes.get(currentPath);
    if (currentNode === undefined) {
      continue;
    }
    for (const edge of graph.edges.filter((candidate) => candidate.from === currentPath && candidate.resolved)) {
      if (edge.to === undefined) {
        continue;
      }
      const childNode = graph.nodes.get(edge.to);
      const childFileName = path.basename(childNode?.id ?? '');
      const childFolder = childFileName.startsWith('index.')
        ? path.basename(path.dirname(childNode?.id ?? ''))
        : childFileName.replace(/\.[^.]+$/, '');
      const importedNames = currentNode.imports
        .filter((entryImport) => entryImport.specifier === edge.specifier)
        .flatMap((entryImport) => entryImport.valueNames);
      if (
        childNode === undefined ||
        childNode.kind !== 'component' ||
        discoveredFolders.has(childFolder) ||
        !importedNames.some((name) => /^[A-Z]/.test(name)) ||
        (childNode.frameworkDirective !== undefined && childNode.frameworkDirective !== target.id)
      ) {
        continue;
      }
      const childName = childNode.exports.find(
        (entryExport) =>
          !entryExport.typeOnly && entryExport.exportedName !== undefined && /^[A-Z]/.test(entryExport.exportedName),
      )?.exportedName;
      if (childName === undefined) {
        continue;
      }
      const childPublicName = childName.startsWith(stripPrefix) ? childName.slice(stripPrefix.length) : childName;
      const childTypeNames = childNode.exports
        .filter((entryExport) => entryExport.typeOnly && entryExport.exportedName !== undefined)
        .map((entryExport) => entryExport.exportedName as string);
      const child: DiscoveredComponent = {
        neutralName: childName,
        publicName: childPublicName,
        propertiesType: childTypeNames.includes(`${childPublicName}Properties`)
          ? `${childPublicName}Properties`
          : undefined,
        typeExports: childTypeNames,
        folder: childFolder,
        sourceDir: toPosix(path.relative(componentsDir, path.dirname(childNode.id))),
        sourceSpecifier: edge.specifier,
        sourcePath: childNode.id,
      };
      discoveredFolders.add(child.folder);
      componentFolders.add(child.folder);
      siblingComponents.push(child);
      discoveryQueue.push(child);
    }
  }

  const componentHosts = options.plugin.prepareComponentHosts?.(
    [...components, ...siblingComponents].map((component) => {
      const sourcePath = componentSourcePath(component);
      const source = readFileSync(sourcePath, 'utf8');
      const router = compileRouterModule({
        source,
        fileName: sourcePath,
        moduleKind: 'component',
        uiFramework: target.id,
        sourceRoot,
        conditions: options.routerConditions,
        router: options.router,
        routerPlugins: options.routerPlugins,
      });
      options.diagnostics?.push(...(router.diagnostics ?? []));
      throwOnCompilerErrors(router.diagnostics);
      const module = context.service.analyze({
        source: router.code,
        fileName: sourcePath,
        moduleKind: 'component',
        componentName: component.neutralName,
        componentFolders,
        sourceRoot,
        configFingerprint: context.project.fingerprint,
      });
      options.diagnostics?.push(...(module.diagnostics ?? []));
      throwOnCompilerErrors(module.diagnostics);
      return { componentName: component.neutralName, module };
    }),
  );

  // Primaries are compiled + re-exported from the entry; sibling components are
  // compiled too (so their `.vue`/`.tsx`/… module exists), but stay off the
  // public entry barrel — they are internal children of their primary.
  for (const component of [...components, ...siblingComponents]) {
    const sourcePath = componentSourcePath(component);
    const source = readFileSync(sourcePath, 'utf8');
    const parsed = parseTsx(sourcePath, source);
    componentOwnTypes.set(component.folder, readExportedTypeNames(parsed));
    const compiled = context.compile({
      source,
      moduleKind: 'component',
      componentName: component.neutralName,
      fileName: sourcePath,
      componentFolders,
      componentHosts,
      router: options.router,
      routerPlugins: options.routerPlugins,
      routerConditions: options.routerConditions,
    });
    writeCompiledModule(mirrorDir(sourcePath), component.folder, compiled, sourcePath);

    // Auxiliary SFCs the emitter generated alongside the primary module (e.g. a
    // recursive helper component extracted from a self-recursive render helper)
    // are written next to it in the flat tree so Stage 2 compiles them and the
    // primary SFC's `./<name>.vue` import resolves.

    // Carry each shared **helper module** the component imports (a relative value
    // import that is not itself a component) into the flat generated tree via the
    // recursive carrier, which compiles neutral composables/context per-framework
    // and copies framework-agnostic helpers verbatim (transitively).
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

    // Carry each component's own stylesheet (e.g. its CSS Module) into the flat
    // generated tree so the re-pointed `./<base>` import resolves at Stage 2 and
    // the component ships its own CSS. The Vue emitter inlines CSS-Module imports
    // (default import) directly as an SFC `<style>` block, so those are not
    // copied for Vue; bare side-effect CSS imports (and all React imports) still are.
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

  // Sprite definitions and the neutral provider are shared helpers owned by a
  // package rather than public components. Carry the package-level sprite tree
  // explicitly because it intentionally sits outside `src/components` and is
  // therefore not reachable through the component discovery queue.
  carrySpriteHelpers({ sourceRoot, carryHelperModule });

  // Shared helper modules re-exported from the barrel (e.g. the toast store) are
  // forwarded through the entry; their source files are already carried into the
  // flat tree by the per-component helper-import copy above.
  const helpers = discoverHelperExportsFromGraph(publicGraph, componentFolders);
  const externalExports = discoverExternalExportsFromGraph(publicGraph);
  for (const helper of helpers) {
    if (helper.sourcePath === undefined) {
      continue;
    }
    carryHelperModule(helper.sourcePath);
  }

  for (const sourcePath of pendingIndexSources) {
    const indexSource = generatedIndexSource(sourcePath);
    if (indexSource !== undefined) {
      writeModule(mirrorHelperDir(sourcePath), 'index.ts', indexSource, sourcePath);
    }
  }

  // The co-located local JSX types module: framework-specific variants of the
  // neutral render primitives (`MpRenderProperty`, and the element primitives
  // where a target re-declares them) the emitters redirect those type imports to
  // (see `LOCAL_JSX_TYPE_NAMES`), so the generated components carry no neutral
  // `@mission-platform/forge` render type import. Written once per tree; only
  // referenced via `import type`, so it adds no runtime chunk and simply emits
  // its own `.d.ts` alongside the build.
  if (
    target.id === 'react' ||
    target.id === 'vue' ||
    target.id === 'solid' ||
    target.id === 'svelte' ||
    target.id === 'web-components'
  ) {
    writeModule('', LOCAL_JSX_TYPES_FILE, localJsxTypesModuleSource(target.id));
  }

  // Resolve each companion type to the flat-tree module that declares it: the
  // component's own module if it declares the type, else the first copied helper
  // that exports it; unresolved types are skipped (never re-exported broken).
  const resolveTypeOrigin: TypeOriginResolver = (folder, typeName) => {
    if (componentOwnTypes.get(folder)?.has(typeName)) {
      return { base: folder, isComponent: true };
    }
    for (const [base, types] of helperExportedTypes) {
      if (types.has(typeName)) {
        return { base, isComponent: false };
      }
    }
    return undefined;
  };

  const entryFile = path.join(options.outDir, `index${target.entryExtension}`);
  context.writer.writeText(
    path.relative(options.outDir, entryFile),
    generateEntry(target, components, helpers, resolveTypeOrigin, externalExports),
    'entry',
  );
  rewriteTargets.push({ file: entryFile, dir: '' });

  // Final pass: rewrite every generated module's (and the entry's) flat
  // `./<base>` import specifiers to the nested relative path of the mirrored
  // tree, so imports still resolve now that files are no longer co-located.
  rewriteFlatImportsInTargets({
    writer: context.writer,
    outDir: options.outDir,
    entryFile,
    rewriteTargets,
    rewriteFlatImports,
  });
  context.writer.finalize([path.relative(options.outDir, entryFile)]);
  return entryFile;
}

/** Options for {@link jsxComponentsEntryDtsPlugin}. */
export interface JsxComponentsEntryDtsOptions {
  /** Framework the synthesised declaration targets. */
  framework: JsxFramework;
  /** Absolute path of the neutral components barrel (e.g. `src/components/index.ts`). */
  componentsModule: string;
  /**
   * Absolute path of the package public entry (e.g. `src/index.ts`). Component
   * declarations are discovered from {@link componentsModule}; helper, type,
   * and external declarations are discovered from this entry. Defaults to the
   * component module for component-only packages and fixtures.
   */
  publicEntryModule?: string;
  /** Base name (no extension) of the synthesised declaration file, e.g. `vue`. */
  declarationFileName: string;
  /** Import specifier for the props types inside the emitted `.d.ts`. Defaults to `./components`. */
  declarationModule?: string;
  /** Prefix stripped from each neutral export name to form its public name. Defaults to `Forge`. */
  stripPrefix?: string;
  /** Owning neutral source root used for graph alias resolution. */
  sourceRoot?: string;
}

/**
 * Re-link per-component CSS to its JS chunk.
 *
 * A Vite **library** build with `cssCodeSplit` extracts one CSS asset per chunk
 * but — unlike an app build — does not inject the matching `import './x.css'`
 * into the JS chunk, so a consumer importing a single component would get its
 * JS without its styles. This plugin restores that link: for every emitted
 * chunk it prepends a side-effect import of each CSS file Vite associated with
 * it (`chunk.viteMetadata.importedCss`), so importing one component pulls in
 * exactly that component's stylesheet (and tree-shakes the rest of the library,
 * styles included).
 *
 * It runs with `enforce: 'post'` so its `generateBundle` hook executes **after**
 * Vite's own CSS plugin has populated `importedCss` — otherwise the metadata is
 * still empty (which is why the Vue scoped-style assets, emitted under
 * `preserveModules`, were previously left orphaned and the components rendered
 * unstyled).
 *
 * Only CSS files that were actually emitted into the bundle are re-linked. Under
 * `preserveModules` Vite deduplicates byte-identical CSS assets — e.g. the shared
 * `size`/`spacing` utility modules imported by many components collapse to a
 * single emitted stylesheet — and drops the duplicates, yet still leaves their
 * provisional per-chunk names in `importedCss`. Emitting `import './x.css'` for a
 * dropped name produces a dangling reference that breaks every downstream
 * consumer's build (unresolved import), so such names are filtered out; the
 * deduplicated styles still ship via the one chunk that retained them (and the
 * package's `./vue` / `./react` barrels pull in that chunk).
 *
 * Finally, each CSS-Module stylesheet is emitted under its **source** name —
 * `foo.module.css` — with the class-name hashing already applied and the
 * resolved names baked into the sibling `foo.module.js` class map. Shipping it
 * with that `.module.css` suffix is a trap: every *downstream* bundler (e.g. the
 * React Storybook's own Vite) recognises `*.module.css` as a CSS Module and
 * runs the CSS-Modules transform over it **a second time**, re-hashing the
 * selectors so they no longer match the (already-hashed) class names baked into
 * the JS — the component then renders unstyled. The stylesheet must be processed
 * once, here, when the framework code is compiled — not again downstream. So
 * every emitted `*.module.css` asset is renamed to a plain `*.css` (a global
 * stylesheet consumers ship verbatim), and the re-linked import points at the
 * renamed file.
 */
export function jsxComponentsCssImportPlugin(): Plugin {
  return {
    name: '@mission-platform/vite-plugin-forge:css-imports',
    enforce: 'post',
    generateBundle(_options, bundle) {
      // Rename every emitted `*.module.css` asset to a plain `*.css` so a
      // downstream bundler does not re-process (and re-hash) it as a CSS Module.
      // A new bundle file must be added through `this.emitFile` (directly adding
      // a key to `bundle` here is not honoured by the writer); the original,
      // `.module.css`-suffixed asset is then dropped. The mapping records the new
      // name so the re-linked import below points at the renamed, plain `.css`.
      const renamedCss = new Map<string, string>();
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset' || !file.fileName.endsWith('.module.css')) {
          continue;
        }
        const renamed = `${file.fileName.slice(0, -'.module.css'.length)}.css`;
        // Never clobber a stylesheet that already ships under the plain name.
        if (Object.hasOwn(bundle, renamed)) {
          continue;
        }
        this.emitFile({ type: 'asset', fileName: renamed, source: file.source });
        delete bundle[file.fileName];
        renamedCss.set(file.fileName, renamed);
      }
      // The plain names the `.module.css` assets were just re-emitted under; they
      // are guaranteed present in the output even though `this.emitFile` does not
      // add them to `bundle` synchronously, so they are always safe to re-link.
      const renamedCssTargets = new Set(renamedCss.values());

      for (const file of Object.values(bundle)) {
        if (file.type !== 'chunk') {
          continue;
        }
        const importedCss = file.viteMetadata?.importedCss;
        if (importedCss === undefined || importedCss.size === 0) {
          continue;
        }
        const fromDir = path.posix.dirname(file.fileName);
        const statements = [...importedCss]
          // A renamed `.module.css` is guaranteed emitted (under its plain name),
          // so it is always re-linked; any other name is only re-linked when it
          // survived into the bundle (deduplicated duplicates are dropped).
          .map((cssFileName) => renamedCss.get(cssFileName) ?? cssFileName)
          .filter((cssFileName) => renamedCssTargets.has(cssFileName) || Object.hasOwn(bundle, cssFileName))
          .map((cssFileName) => {
            const relative = path.posix.relative(fromDir, cssFileName);
            const specifier = relative.startsWith('.') ? relative : `./${relative}`;
            return `import ${JSON.stringify(specifier)};`;
          })
          .join('\n');
        if (statements.length === 0) {
          continue;
        }
        file.code = `${statements}\n${file.code}`;
      }
    },
  };
}

/** Generate the synthesised TypeScript declaration of the public entry. */
function generateEntryDeclaration(
  framework: JsxFramework,
  declarationModule: string,
  components: readonly DiscoveredComponent[],
  helpers: readonly DiscoveredHelperExport[] = [],
  externalExports: readonly DiscoveredExternalExport[] = [],
): string {
  const componentType =
    framework === 'react'
      ? 'FunctionComponent'
      : framework === 'vue'
        ? 'DefineComponent'
        : framework === 'solid'
          ? 'Component'
          : framework === 'svelte'
            ? 'Component'
            : 'CustomElementConstructor';
  const frameworkImport =
    framework === 'react'
      ? 'react'
      : framework === 'vue'
        ? 'vue'
        : framework === 'solid'
          ? 'solid-js'
          : framework === 'svelte'
            ? 'svelte'
            : '';

  const propertyTypes = [...new Set(components.map((component) => component.propertiesType).filter(Boolean))];
  const lines: string[] = [];
  if (frameworkImport.length > 0) {
    lines.push(`import type { ${componentType} } from ${JSON.stringify(frameworkImport)};`);
  }
  if (propertyTypes.length > 0) {
    lines.push(`import type { ${propertyTypes.join(', ')} } from ${JSON.stringify(declarationModule)};`);
  }
  lines.push('');
  const claimed = new Set<string>();
  for (const component of components) {
    if (claimed.has(component.publicName)) {
      continue;
    }
    claimed.add(component.publicName);
    const properties = component.propertiesType ?? 'Record<string, unknown>';
    lines.push(`export declare const ${component.publicName}: ${componentType}<${properties}>;`);
    // Declare the neutral `Base*` name as an alias of the same typed component,
    // matching the runtime entry's dual export.
    if (component.neutralName !== component.publicName && !claimed.has(component.neutralName)) {
      claimed.add(component.neutralName);
      lines.push(`export declare const ${component.neutralName}: ${componentType}<${properties}>;`);
    }
  }
  // Re-export every public type each component ships alongside it (variants,
  // option shapes, props interfaces, …) from the neutral declarations, so
  // consumers can import them from the framework entry too.
  const componentTypes = [...new Set(components.flatMap((component) => component.typeExports))];
  const unclaimedComponentTypes = componentTypes.filter((type) => {
    if (claimed.has(type)) {
      return false;
    }
    claimed.add(type);
    return true;
  });
  if (unclaimedComponentTypes.length > 0) {
    lines.push(`export type { ${unclaimedComponentTypes.join(', ')} } from ${JSON.stringify(declarationModule)};`);
  }
  // Re-export each shared helper module's API from its `tsc`-emitted declaration
  // (e.g. `./components/toast-store`), matching the entry's runtime re-exports.
  for (const helper of helpers) {
    const names = [
      ...helper.values
        .filter((value) => !claimed.has(value.exportedName))
        .map((value) => {
          claimed.add(value.exportedName);
          return helperBindingReExportName(value);
        }),
      ...helper.types
        .filter((type) => !claimed.has(type.exportedName))
        .map((type) => {
          claimed.add(type.exportedName);
          return helperBindingReExportName(type, true);
        }),
    ];
    if (names.length > 0) {
      lines.push(
        `export { ${names.join(', ')} } from ${JSON.stringify(`${declarationModule}/${helper.relativePath}`)};`,
      );
    }
  }
  for (const external of externalExports) {
    if (external.exportedName !== undefined && external.star && claimed.has(external.exportedName)) {
      continue;
    }
    if (external.exportedName !== undefined && !external.star) {
      if (claimed.has(external.exportedName)) {
        continue;
      }
      claimed.add(external.exportedName);
    }
    const line = externalReExportLine(external);
    if (line.length > 0) {
      lines.push(line);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function discoverGeneratedEntrySources(
  componentsModule: string,
  publicEntryModule = componentsModule,
  stripPrefix = 'Forge',
  sourceRoot = path.dirname(path.dirname(componentsModule)),
): {
  components: DiscoveredComponent[];
  helpers: DiscoveredHelperExport[];
  externalExports: DiscoveredExternalExport[];
} {
  const componentGraph = buildForgeFileGraph({ entry: componentsModule, sourceRoot });
  const publicGraph =
    publicEntryModule === componentsModule
      ? componentGraph
      : buildForgeFileGraph({ entry: publicEntryModule, sourceRoot });
  const graphErrors = [...componentGraph.diagnostics, ...publicGraph.diagnostics]
    .filter((diagnostic) => diagnostic.code !== 'cycle')
    .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`);
  if (graphErrors.length > 0) {
    throw new Error(graphErrors.join('\n'));
  }
  const components = discoverComponentsFromGraph(componentGraph, stripPrefix);
  return {
    components,
    helpers: discoverHelperExportsFromGraph(publicGraph, new Set(components.map((component) => component.folder))),
    externalExports: discoverExternalExportsFromGraph(publicGraph),
  };
}

/**
 * Emit the synthesised declaration (`<declarationFileName>.d.ts`) for the
 * generated entry, so the package's `./react` / `./vue` types resolve even
 * though the entry itself is generated (and therefore not seen by `tsc`).
 */
export function jsxComponentsEntryDtsPlugin(options: JsxComponentsEntryDtsOptions): Plugin {
  const declarationModule = options.declarationModule ?? './components';
  const stripPrefix = options.stripPrefix ?? 'Forge';

  return {
    name: '@mission-platform/vite-plugin-forge:entry-dts',
    generateBundle() {
      const { components, helpers, externalExports } = discoverGeneratedEntrySources(
        options.componentsModule,
        options.publicEntryModule,
        stripPrefix,
        options.sourceRoot,
      );
      this.emitFile({
        type: 'asset',
        fileName: `${options.declarationFileName}.d.ts`,
        source: generateEntryDeclaration(options.framework, declarationModule, components, helpers, externalExports),
      });
    },
  };
}

/** Options for {@link jsxComponentsDtsPlugin}. */
export interface JsxComponentsDtsOptions {
  /** The framework of the generated source tree — selects the source extensions + declaration toolchain. */
  framework: JsxFramework;
  /**
   * Absolute path of the generated per-framework source tree (the `outDir`
   * handed to {@link generateFrameworkSources}): React/Solid `.tsx` modules,
   * Vue/Svelte SFCs (`.vue` / `.svelte`), or Web-Components `.ts` modules,
   * plus their shared helper `.ts` modules and the entry.
   */
  generatedDir: string;
  /**
   * Absolute path of the directory the emitted `.d.ts` files are written to
   * (e.g. `dist/react`, `dist/vue`, `dist/solid`, `dist/svelte`, `dist/web-components`).
   */
  outDir: string;
  /**
   * Absolute path of the `vue-tsc` CLI (`vue-tsc/bin/vue-tsc.js`), used to emit
   * declarations for the Vue `.vue` tree. **Required** when `framework` is
   * `'vue'` (plain `tsc` cannot read single-file components); ignored otherwise.
   */
  vueTscBin?: string;
  /**
   * Path to the neutral components barrel module. Used by the Svelte path to
   * synthesise a fallback `index.d.ts` (via {@link generateEntryDeclaration})
   * when `svelte2tsx`'s `emitDts` does not leave a usable one behind.
   */
  componentsModule?: string;
  /**
   * Absolute path of the package public entry used when a declaration toolchain
   * falls back to synthesising `index.d.ts`. Native declaration emit otherwise
   * follows the generated framework entry, which already contains this surface.
   */
  publicEntryModule?: string;
  /** Owning neutral source root used for graph alias resolution. */
  sourceRoot?: string;
}

/**
 * An ambient module shim so the declaration compiler can resolve the components'
 * co-located CSS-module imports (`import styles from './x.module.scss'`), which
 * only the Vite CSS pipeline understands. It carries no runtime and, being a
 * `.d.ts`, never itself emits a declaration.
 */
const CSS_MODULE_SHIM = [
  "declare module '*.module.scss' { const classes: Record<string, string>; export default classes; }",
  "declare module '*.module.css' { const classes: Record<string, string>; export default classes; }",
  "declare module '*.scss' { const classes: Record<string, string>; export default classes; }",
  "declare module '*.css' { const classes: Record<string, string>; export default classes; }",
  "declare module '*.svelte' { const component: any; export default component; }",
  "declare module '*.fws' {",
  '  interface ForgeFwsExports { readonly [name: string]: (value: string) => string; }',
  '  const manifest: Readonly<Record<string, unknown>>;',
  '  function load(): Promise<ForgeFwsExports>;',
  '  function loadSync(): ForgeFwsExports;',
  '  export { manifest, load, loadSync };',
  '}',
  '',
].join('\n');

/** File name of the CSS-module shim written into a generated tree before declaration emit. */
const CSS_MODULE_SHIM_FILE = '__mp-css-shim.d.ts';

/**
 * The custom export condition each framework's build is published under. The
 * generated per-framework sources import sibling workspace packages by their
 * **bare** specifier (`@mission-platform/icons`, `@mission-platform/components`,
 * …), so the declaration compilers must resolve with the matching condition or
 * they would pick up the packages' neutral (`MpElement`-returning) types instead
 * of the framework build's. Mirrors `frameworkCondition()` in
 * `@mission-platform/vite-config` and the `customConditions` tsconfig presets.
 */
const FRAMEWORK_DTS_CONDITION: Record<JsxFramework, string> = {
  vue: 'mp:vue',
  react: 'mp:react',
  solid: 'mp:solid',
  svelte: 'mp:svelte',
  'web-components': 'mp:web-component',
};

/**
 * `paths` overrides mapping the **owning package's own** bare specifier back to
 * its neutral source.
 *
 * A generated tree frequently re-imports its own package by name — the barcode /
 * qr-code / matrix-code / code-scanner components import their encode/decode
 * helpers from `@mission-platform/<pkg>`, and the Storyblok wrappers import the
 * component library they wrap. Those specifiers must keep resolving to the
 * package's **neutral** entry: under {@link FRAMEWORK_DTS_CONDITION} they would
 * otherwise resolve to the package's own framework build, which re-exports only
 * the components (so the helpers vanish) and whose type aliases circle back on
 * the ones being declared (`TS2303: Circular definition of import alias`).
 *
 * The mapping targets the package's already-built **neutral declaration**
 * (`dist/index.d.ts`, emitted by the neutral `defineTsdownLibrary` config that
 * runs before the framework configs) rather than its `src/`: a `.d.ts` is exempt
 * from the `rootDir` containment rule, whereas pulling real source into the
 * program would fail with `TS6059`.
 *
 * Returns an empty object when there is no owning `package.json`, or when its
 * neutral declaration has not been emitted yet — leaving resolution unchanged.
 */
function selfReferencePaths(generatedDir: string): ts.MapLike<string[]> {
  let directory = generatedDir;
  while (true) {
    const manifestPath = path.join(directory, 'package.json');
    if (existsSync(manifestPath)) {
      const name = (JSON.parse(readFileSync(manifestPath, 'utf8')) as { name?: string }).name;
      const neutralDeclaration = path.join(directory, 'dist', 'index.d.ts');
      if (name === undefined || !existsSync(neutralDeclaration)) {
        return {};
      }
      return { [name]: [neutralDeclaration] };
    }
    const parent = path.dirname(directory);
    if (parent === directory) {
      return {};
    }
    directory = parent;
  }
}

/** Read the owning package's TypeScript alias configuration for a generated tree. */
function packageAliasCompilerOptions(generatedDir: string): Pick<ts.CompilerOptions, 'paths'> {
  let packageDirectory = generatedDir;
  while (true) {
    const manifestPath = path.join(packageDirectory, 'package.json');
    if (existsSync(manifestPath)) {
      break;
    }
    const parent = path.dirname(packageDirectory);
    if (parent === packageDirectory) {
      return {};
    }
    packageDirectory = parent;
  }

  const configFileName =
    [path.join(packageDirectory, 'tsconfig.build.json'), path.join(packageDirectory, 'tsconfig.json')].find((file) =>
      existsSync(file),
    ) ?? ts.findConfigFile(packageDirectory, ts.sys.fileExists);
  if (configFileName === undefined) {
    return {};
  }

  const config = ts.readConfigFile(configFileName, ts.sys.readFile);
  const compilerOptions = config.config?.compilerOptions as
    { baseUrl?: string; paths?: Record<string, string[]> } | undefined;
  if (compilerOptions?.paths === undefined) {
    return {};
  }

  const sourceRoot = path.resolve(packageDirectory, 'src');
  const configBaseUrl = compilerOptions.baseUrl ?? '.';
  const baseUrl = path.resolve(path.dirname(configFileName), configBaseUrl);
  const paths = Object.fromEntries(
    Object.entries(compilerOptions.paths).map(([pattern, targets]) => [
      pattern,
      targets.map((target) => {
        const wildcard = target.indexOf('*');
        const targetPrefix = wildcard === -1 ? target : target.slice(0, wildcard);
        const targetPath = path.resolve(baseUrl, targetPrefix);
        if (targetPath === sourceRoot || targetPath.startsWith(`${sourceRoot}${path.sep}`)) {
          const relativeToSource = path.relative(sourceRoot, targetPath);
          return path.join(generatedDir, relativeToSource, target.slice(targetPrefix.length));
        }
        return path.resolve(baseUrl, target);
      }),
    ]),
  );

  return {
    paths,
  };
}

/** Find all generated TypeScript roots, including modules in mirrored subdirectories. */
function generatedTypeScriptRoots(directory: string): string[] {
  const roots: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      roots.push(...generatedTypeScriptRoots(entryPath));
    } else if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.endsWith('.d.ts')) {
      roots.push(entryPath);
    }
  }
  return roots;
}

/**
 * Base compiler options for emitting a generated component tree's declarations
 * (mirrors the packages' `tsconfig.build.json`). `jsx: preserve` keeps the
 * classic-`h` React tree's JSX agnostic to the runtime factory during emit, and
 * `noEmitOnError: false` guarantees a `.d.ts` is produced even though the
 * generated components' JSX bodies are checked against React's stricter JSX
 * typing. Those body-level mismatches never reach the emitted `.d.ts` (every
 * function body is elided) and are filtered out by {@link isElidedDiagnostic}
 * so only genuine, declaration-affecting diagnostics surface as build warnings.
 */
const COMPONENT_DTS_COMPILER_OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2023,
  lib: ['lib.es2023.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  jsx: ts.JsxEmit.Preserve,
  skipLibCheck: true,
  esModuleInterop: true,
  strict: true,
  declaration: true,
  emitDeclarationOnly: true,
  noEmitOnError: false,
  types: [],
};

/**
 * Whether a diagnostic originates in a position that declaration emit **elides**,
 * so it never affects the emitted `.d.ts` and must not surface as a build warning:
 *
 * - Inside a function/method/arrow **body** (JSX only ever appears in one). These
 *   are the neutral tree's JSX bodies being type-checked against the framework's
 *   stricter JSX vocabulary — native `Event` handlers vs React's `SyntheticEvent`,
 *   lowercase DOM attributes (`tabindex`, `onMouseenter`) vs React's camelCase,
 *   `MpElement` children vs `ReactNode`, `RefObject<HTMLElement>` vs
 *   `Ref<HTMLDivElement>`, …
 * - Inside a **class property initializer** whose property carries an explicit
 *   type annotation. The initializer is dropped from the `.d.ts` (only the
 *   annotation is kept), so a name it references that is out of scope — e.g. the
 *   Web-Components element synthesiser seeding a reactive-state field from a
 *   destructured prop default (`openIds: any = defaultOpen`) — is invisible to
 *   consumers, exactly like a body-level reference.
 *
 * Genuinely declaration-affecting diagnostics (a duplicate export, an unresolved
 * import, a non-portable exported signature, a dangling type in a kept
 * interface) are *not* elided and remain reported.
 */
function isElidedDiagnostic(diagnostic: ts.Diagnostic): boolean {
  const { file, start } = diagnostic;
  if (file === undefined || start === undefined) {
    return false;
  }
  const findInnermost = (node: ts.Node): ts.Node => {
    const child = ts.forEachChild(node, (candidate) =>
      candidate.getStart(file) <= start && start < candidate.getEnd() ? candidate : undefined,
    );
    return child === undefined ? node : findInnermost(child);
  };
  let node: ts.Node | undefined = findInnermost(file);
  while (node !== undefined && node !== file) {
    const parent: ts.Node | undefined = node.parent;
    if (parent !== undefined && ts.isFunctionLike(parent) && (parent as ts.FunctionLikeDeclarationBase).body === node) {
      return true;
    }
    // A class-property initializer is elided from the `.d.ts` when the property
    // has an explicit type annotation (the annotation is emitted, the value is
    // not), so a name it references cannot reach a consumer.
    if (
      parent !== undefined &&
      ts.isPropertyDeclaration(parent) &&
      parent.type !== undefined &&
      parent.initializer === node
    ) {
      return true;
    }
    node = parent;
  }
  return false;
}

/**
 * Emit declarations for a generated `.ts`/`.tsx` tree in-process with the
 * TypeScript compiler API, writing the CSS-module shim first so co-located
 * style imports resolve. Shared by every in-process toolchain (React, Solid,
 * Web-Components): each passes the `compilerOverrides` its own JSX dialect
 * needs — React relies on the base options' `jsx: preserve` as-is, Solid
 * additionally points the JSX namespace at `solid-js`, and Web-Components
 * needs no override at all (its generated tree is plain Lit `.ts`, no JSX).
 * Diagnostics rooted in an elided position (a function body, or a typed class
 * property's initializer) are filtered by {@link isElidedDiagnostic} (they
 * never reach the `.d.ts`); genuine, declaration-affecting diagnostics surface
 * as build warnings.
 */
function emitTscComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
  compilerOverrides: ts.CompilerOptions = {},
): void {
  const shimPath = path.join(options.generatedDir, CSS_MODULE_SHIM_FILE);
  writeFileSync(shimPath, CSS_MODULE_SHIM, 'utf8');

  const rootNames = generatedTypeScriptRoots(options.generatedDir);
  const packageAliases = packageAliasCompilerOptions(options.generatedDir);

  const program = ts.createProgram([...rootNames, shimPath], {
    ...COMPONENT_DTS_COMPILER_OPTIONS,
    customConditions: [FRAMEWORK_DTS_CONDITION[options.framework]],
    ...packageAliases,
    paths: { ...packageAliases.paths, ...selfReferencePaths(options.generatedDir) },
    ...compilerOverrides,
    rootDir: options.generatedDir,
    outDir: options.outDir,
    declarationDir: options.outDir,
  });
  const emitResult = program.emit(undefined, undefined, undefined, true);

  const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
  for (const diagnostic of diagnostics) {
    // Skip diagnostics rooted in a function body: they are the neutral tree's
    // JSX bodies checked against the framework's stricter JSX types and never
    // reach the emitted (body-elided) `.d.ts`. Genuine, declaration-affecting
    // diagnostics (duplicate exports, unresolved imports, non-portable
    // signatures) remain.
    if (isElidedDiagnostic(diagnostic)) {
      continue;
    }
    this.warn(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  }
}

/** Emit React declarations for the generated `.tsx` tree in-process with the TypeScript compiler API. */
function emitReactComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  emitTscComponentDeclarations.call(this, options);
}

/**
 * Emit Solid declarations for the generated `.tsx` tree in-process with the
 * TypeScript compiler API. The Solid emitter renders genuine Solid JSX
 * (`<div onClick={…}>`, no synthetic event system), so the JSX namespace must
 * resolve against `solid-js` (`jsxImportSource: 'solid-js'`) rather than the
 * base options' implicit `JSX` global — otherwise every element is reported
 * untyped. Body-level JSX diagnostics are filtered exactly as for React; the
 * generated `index.tsx` entry yields `index.d.ts`.
 */
function emitSolidComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  emitTscComponentDeclarations.call(this, options, {
    jsx: ts.JsxEmit.Preserve,
    jsxImportSource: 'solid-js',
  });
}

/**
 * Emit Web-Components declarations for the generated `.ts` tree in-process
 * with the TypeScript compiler API. The generated tree carries no JSX at all
 * (each component is a Lit `LitElement` subclass authored in plain `.ts`), so
 * the shared toolchain needs no compiler overrides — it is the same emitter
 * React uses, run over a tree that happens to be JSX-free. The generated
 * `index.ts` entry re-exports each `<Neutral>Element` class, so `tsc` emits
 * `index.d.ts` from it.
 */
function emitWebComponentsComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  emitTscComponentDeclarations.call(this, options);
}

/**
 * Emit Vue declarations for the generated `.vue` tree by running the `vue-tsc`
 * CLI (plain `tsc` cannot read single-file components) over a synthesised
 * tsconfig. `vue-tsc` exits non-zero when the tree has type diagnostics (it
 * does — the neutral `MpElement` return type is not Vue-JSX-valid), so its
 * output is captured and surfaced as build warnings rather than aborting the
 * build, mirroring the React path.
 */
function emitVueComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  if (options.vueTscBin === undefined) {
    throw new Error('jsxComponentsDtsPlugin: `vueTscBin` is required to emit declarations for the Vue tree.');
  }
  writeFileSync(path.join(options.generatedDir, CSS_MODULE_SHIM_FILE), CSS_MODULE_SHIM, 'utf8');
  const packageAliases = packageAliasCompilerOptions(options.generatedDir);

  const tsconfig = {
    compilerOptions: {
      module: 'esnext',
      moduleResolution: 'bundler',
      target: 'es2023',
      lib: ['es2023', 'dom', 'dom.iterable'],
      // The generated SFCs are `<script setup lang="tsx">`; the render-closure /
      // scoped-slot fallbacks emit JSX, and `vue-tsc` compiles each `<template>`
      // into virtual TSX too. Point the JSX namespace at Vue's own runtime
      // (`vue/jsx-runtime`) so `vue-tsc` resolves `JSX.IntrinsicElements` against
      // Vue's element vocabulary — otherwise every element is reported untyped
      // (`TS7026`, Vue 3 registers no global `JSX` namespace). A hand-rolled
      // permissive global namespace is not an option: it would also govern the
      // template virtual code and break component/prop checking wholesale.
      jsx: 'preserve',
      jsxImportSource: 'vue',
      // Bare `@mission-platform/*` imports in the generated SFCs must resolve to
      // each package's Vue build, exactly as a consuming app resolves them.
      customConditions: [FRAMEWORK_DTS_CONDITION.vue],
      ...packageAliases,
      paths: { ...packageAliases.paths, ...selfReferencePaths(options.generatedDir) },
      skipLibCheck: true,
      esModuleInterop: true,
      strict: true,
      declaration: true,
      emitDeclarationOnly: true,
      noEmitOnError: false,
      types: [],
      rootDir: '.',
      outDir: options.outDir,
      declarationDir: options.outDir,
    },
    include: ['**/*.ts', '**/*.vue'],
  };
  const tsconfigPath = path.join(options.generatedDir, 'tsconfig.dts.json');
  writeFileSync(tsconfigPath, JSON.stringify(tsconfig, undefined, 2), 'utf8');

  try {
    execFileSync(process.execPath, [options.vueTscBin, '-p', tsconfigPath], {
      cwd: options.generatedDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    // `vue-tsc` exits non-zero on type diagnostics but has still emitted the
    // declarations; surface its report as a warning instead of failing.
    const report = error as { stdout?: string; stderr?: string };
    const message = [report.stdout, report.stderr].filter(Boolean).join('\n').trim();
    if (message.length > 0) {
      this.warn(message);
    }
  }
}

/**
 * Whether `svelte2tsx`'s `emitDts` output in `outDir` is actually usable.
 *
 * `emitDts` writes a `.svelte.d.ts` sidecar per component that types the
 * default export as `Component<XxxProperties, …>`, where `XxxProperties` is
 * the props interface the component itself declares (via `export interface`)
 * inside its (non-`module`) `<script lang="ts">` block. In practice `emitDts`
 * reliably *references* that type name in the sidecar without ever
 * *declaring or importing* it there — every such sidecar ships a dangling
 * `Component<XxxProperties, …>` that fails with `TS2304: Cannot find name
 * 'XxxProperties'` for any real consumer. This is checked directly (does the
 * identifier fed to `Component<…>` appear anywhere else — as a declaration or
 * an import — in the same file?) rather than assumed, so a future
 * `svelte2tsx` fix is picked up automatically instead of a permanent bypass.
 */
function svelteDtsOutputIsUsable(outDir: string): boolean {
  const indexDtsPath = path.join(outDir, 'index.d.ts');
  if (!existsSync(indexDtsPath) || readFileSync(indexDtsPath, 'utf8').trim().length === 0) {
    return false;
  }
  const sidecarFiles = readdirSync(outDir).filter((file) => file.endsWith('.svelte.d.ts'));
  if (sidecarFiles.length === 0) {
    return false;
  }
  return sidecarFiles.every((file) => {
    const content = readFileSync(path.join(outDir, file), 'utf8');
    const propsTypeMatch = /\bComponent<(\w+)/.exec(content);
    if (propsTypeMatch === null) {
      return true;
    }
    const propsType = propsTypeMatch[1];
    const isDeclared = new RegExp(`\\b(?:interface|type|class)\\s+${propsType}\\b`).test(content);
    const isImported = new RegExp(`\\bimport\\b[^;]*[{,]\\s*(?:type\\s+)?${propsType}\\b`).test(content);
    return isDeclared || isImported;
  });
}

/**
 * Emit Svelte declarations for the generated `.svelte` + `.ts` tree using
 * `svelte2tsx`'s async `emitDts`, the Svelte-language-tools' own SFC-aware
 * declaration emitter (the `.svelte` counterpart of `vue-tsc`'s emit above):
 * it converts each SFC to virtual TSX, type-checks the whole tree, and writes
 * a `.svelte.d.ts` sidecar per component plus `index.d.ts` from the generated
 * `index.ts` entry.
 *
 * Unlike `vue-tsc`, `emitDts` takes no compiler options directly — it searches
 * for a tsconfig at `libRoot` (the generated tree) — so one is written there
 * first, mirroring the Vue tsconfig's shape. The CSS-module shim is written
 * beforehand for the same reason the React/Vue paths write it: so `import
 * styles from './x.module.scss'` resolves.
 *
 * `emitDts` can throw rather than cleanly surface diagnostics the way the
 * other toolchains do here, so any error is caught and surfaced as a warning
 * instead of failing the build. The output is then verified with {@link
 * svelteDtsOutputIsUsable}: as of the `svelte2tsx` version this plugin
 * currently depends on, every emitted `.svelte.d.ts` sidecar ships a dangling
 * `Component<XxxProperties, …>` reference the file never declares or imports
 * (`XxxProperties` is the component's own props interface, declared in its
 * `<script>` block — `emitDts` does not surface it in the sidecar), which
 * breaks for real consumers with `TS2304: Cannot find name`. Until that is
 * fixed upstream, this **falls back to the synthesised entry declaration**
 * ({@link generateEntryDeclaration}) for Svelte, which re-exports each
 * component's props type from the neutral tree's own (already-valid) `tsc`
 * declarations instead of from the broken `.svelte.d.ts` sidecars, so the
 * Svelte build always ships a valid `index.d.ts`.
 */
async function emitSvelteComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): Promise<void> {
  writeFileSync(path.join(options.generatedDir, CSS_MODULE_SHIM_FILE), CSS_MODULE_SHIM, 'utf8');
  const packageAliases = packageAliasCompilerOptions(options.generatedDir);

  const tsconfig = {
    compilerOptions: {
      module: 'esnext',
      moduleResolution: 'bundler',
      target: 'es2023',
      lib: ['es2023', 'dom', 'dom.iterable'],
      // Resolve bare `@mission-platform/*` imports to each package's Svelte build.
      customConditions: [FRAMEWORK_DTS_CONDITION.svelte],
      ...packageAliases,
      paths: { ...packageAliases.paths, ...selfReferencePaths(options.generatedDir) },
      skipLibCheck: true,
      strict: true,
      declaration: true,
      emitDeclarationOnly: true,
      noEmitOnError: false,
      types: [],
      rootDir: '.',
      declarationDir: options.outDir,
    },
    include: ['**/*.ts', '**/*.svelte'],
  };
  const tsconfigFileName = 'tsconfig.dts.json';
  writeFileSync(path.join(options.generatedDir, tsconfigFileName), JSON.stringify(tsconfig, undefined, 2), 'utf8');

  try {
    await emitDts({
      declarationDir: options.outDir,
      svelteShimsPath: createRequire(import.meta.url).resolve('svelte2tsx/svelte-shims-v4.d.ts'),
      libRoot: options.generatedDir,
      tsconfig: tsconfigFileName,
    });
  } catch (error) {
    this.warn(error instanceof Error ? error.message : String(error));
  }

  if (svelteDtsOutputIsUsable(options.outDir)) {
    return;
  }
  this.warn(
    "jsxComponentsDtsPlugin: svelte2tsx's emitDts did not produce usable declarations " +
      '(dangling props-type references in the generated .svelte.d.ts sidecars); ' +
      'falling back to the synthesised entry declaration for the Svelte build.',
  );
  // Discard whatever broken sidecars `emitDts` left behind (they are unused by
  // the synthesised entry declaration below and would otherwise ship dead,
  // dangling `.d.ts` files alongside the real, valid `index.d.ts`).
  if (existsSync(options.outDir)) {
    for (const file of readdirSync(options.outDir).filter((entry) => entry.endsWith('.d.ts'))) {
      rmSync(path.join(options.outDir, file));
    }
  }
  if (options.componentsModule === undefined) {
    return;
  }
  const { components, helpers, externalExports } = discoverGeneratedEntrySources(
    options.componentsModule,
    options.publicEntryModule,
    'Forge',
    options.sourceRoot,
  );
  const dtsContent = generateEntryDeclaration(options.framework, '../components', components, helpers, externalExports);
  mkdirSync(options.outDir, { recursive: true });
  writeFileSync(path.join(options.outDir, 'index.d.ts'), dtsContent, 'utf8');
}

/**
 * A post-build Vite plugin that emits **genuine, per-framework** declarations
 * for a neutral components package's generated source tree.
 *
 * Each framework build ({@link generateFrameworkSources} + the framework's
 * Stage-2 bundler) produces JS but no declarations, since the generated tree is
 * not a `tsc`-visible source file. Rather than synthesise a single entry
 * declaration whose props types are re-imported from the **shared neutral**
 * declarations (so every framework's consumers would see the same `MpChild` /
 * `MpRef`), this plugin runs each framework's own declaration toolchain over
 * the generated tree in `closeBundle` and writes the resulting `.d.ts` files
 * into the build's own `outDir`:
 *
 * - **React** — the TypeScript compiler API over the `.tsx` tree, in-process.
 *   Because the React emitter already rewrites the neutral render/hook types to
 *   their React equivalents (`MpChild` → `ReactNode`, `MpRef` → `RefObject`,
 *   `MpDependencyList` → `DependencyList`), the emitted declarations read
 *   idiomatically for React.
 * - **Vue** — the `vue-tsc` CLI over the `.vue` tree, which emits each SFC's
 *   precise `DefineComponent` (props, slots, emits) plus its `.vue.d.ts`
 *   sidecar.
 * - **Solid** — the same in-process TypeScript compiler API as React, over the
 *   generated `.tsx` tree, but with the JSX namespace pointed at `solid-js` so
 *   the Solid-flavoured JSX the emitter renders resolves against Solid's own
 *   `JSX.Element` vocabulary.
 * - **Web-Components** — the same in-process TypeScript compiler API, over the
 *   generated (JSX-free) `.ts` tree of `LitElement` subclasses.
 * - **Svelte** — attempts `svelte2tsx`'s async `emitDts` over the generated
 *   `.svelte` + `.ts` tree first (the SFC-aware declaration emitter from the
 *   Svelte language tools), but as of the currently depended-on `svelte2tsx`
 *   version its per-component `.svelte.d.ts` sidecars ship a dangling
 *   props-type reference they never declare or import (see {@link
 *   svelteDtsOutputIsUsable}), so this currently always falls back to the
 *   synthesised entry declaration for a valid `index.d.ts`.
 *
 * Type diagnostics are surfaced as build warnings rather than failures so a
 * `.d.ts` is always produced (mirroring {@link hookLibraryDtsPlugin}).
 */
export function jsxComponentsDtsPlugin(options: JsxComponentsDtsOptions): Plugin {
  return {
    name: '@mission-platform/vite-plugin-forge:components-dts',
    async closeBundle() {
      switch (options.framework) {
        case 'react': {
          emitReactComponentDeclarations.call(this, options);

          break;
        }
        case 'vue': {
          emitVueComponentDeclarations.call(this, options);

          break;
        }
        case 'solid': {
          emitSolidComponentDeclarations.call(this, options);

          break;
        }
        case 'web-components': {
          emitWebComponentsComponentDeclarations.call(this, options);

          break;
        }
        case 'svelte': {
          await emitSvelteComponentDeclarations.call(this, options);

          break;
        }
        default: {
          if (options.componentsModule) {
            const { components, helpers, externalExports } = discoverGeneratedEntrySources(
              options.componentsModule,
              options.publicEntryModule,
              'Forge',
              options.sourceRoot,
            );
            const dtsContent = generateEntryDeclaration(
              options.framework,
              '../components',
              components,
              helpers,
              externalExports,
            );
            mkdirSync(options.outDir, { recursive: true });
            writeFileSync(path.join(options.outDir, 'index.d.ts'), dtsContent, 'utf8');
          }
        }
      }
    },
  };
}

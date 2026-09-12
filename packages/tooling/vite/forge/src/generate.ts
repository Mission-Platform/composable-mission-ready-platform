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
 * This coordinator delegates cohesive tasks to `./generate/` submodules.
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { LOCAL_JSX_TYPES_FILE, localJsxTypesModuleSource } from './compiler/constants.js';
import {
  discoverExternalExportsFromGraph,
  discoverHelperExportsFromGraph,
  sourceBase,
  type DiscoveredComponent,
} from './compiler/discover.js';
import { createForgeGenerationContext } from './compiler/generation-context.js';
import { buildForgeFileGraph } from './compiler/graph.js';
import { oxcArray, oxcIdentifierName, oxcObject, oxcProgramBody, parseOxcModule } from './compiler/oxc.js';
import { compileComponentTree, prepareComponentHostsList } from './generate/component-compilation.js';
import { discoverAndFilterComponents, discoverSiblingComponents } from './generate/component-discovery.js';
import { generateEntry } from './generate/entry-synthesis.js';
import { createFlatTreeEmitter } from './generate/flat-tree-emitter.js';
import { createFlatImportRewriter, rewriteFlatImportsInTargets } from './generate/flat-tree-import-rewrite.js';
import { createHelperModuleCarrier, carrySpriteHelpers } from './generate/helper-carry.js';
import { createGeneratedIndexSourceBuilder } from './generate/index-source.js';

import type { ForgeCompilerService } from './compiler/service.js';
import type { TypeOrigin, TypeOriginResolver } from './generate/entry-synthesis.js';
import type { CompilerDiagnostic, FrameworkOutputPlugin } from '@mission-platform/forge-plugin-api';
import type { RouterOutputPlugin, RouterPluginSelection } from '@mission-platform/forge-router-plugin-api';

export { generateEntry } from './generate/entry-synthesis.js';
export {
  jsxComponentsCssImportPlugin,
  jsxComponentsDtsPlugin,
  jsxComponentsEntryDtsPlugin,
  type JsxComponentsDtsOptions,
  type JsxComponentsEntryDtsOptions,
} from './generate/declaration-plugins.js';

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
function readExportedTypeNames(fileName: string, source: string): Set<string> {
  const names = new Set<string>();
  const program = parseOxcModule(fileName, source).program;
  for (const statement of oxcProgramBody(program)) {
    if (statement.type !== 'ExportNamedDeclaration') {
      continue;
    }
    const declaration = oxcObject(statement, 'declaration');
    if (declaration !== undefined) {
      if (
        declaration.type === 'TSTypeAliasDeclaration' ||
        declaration.type === 'TSInterfaceDeclaration' ||
        declaration.type === 'TSEnumDeclaration'
      ) {
        const name = oxcIdentifierName(oxcObject(declaration, 'id'));
        if (name !== undefined) {
          names.add(name);
        }
      }
      continue;
    }
    const statementTypeOnly = statement.exportKind === 'type';
    for (const element of oxcArray(statement, 'specifiers')) {
      if (!(statementTypeOnly || element.exportKind === 'type')) {
        continue;
      }
      const name = oxcIdentifierName(oxcObject(element, 'exported'));
      if (name !== undefined) {
        names.add(name);
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

  // 1. Component discovery & filtering
  const components = discoverAndFilterComponents(graph, stripPrefix, target.id, options.diagnostics);
  const componentFolders = new Set(
    components.flatMap((component) => [component.folder, sourceBase(component.sourcePath ?? '')]),
  );

  mkdirSync(options.outDir, { recursive: true });

  // 2. Locale declarations copying
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

  // Type-origin tracking
  const componentOwnTypes = new Map<string, Set<string>>();
  const helperExportedTypes = new Map<string, Set<string>>();

  // Flat-tree setup
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

  const carriedHelpers = new Set<string>();
  const pendingIndexSources = new Set<string>();

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

  // 3. Sibling component discovery
  const siblingComponents = discoverSiblingComponents({
    graph,
    components,
    stripPrefix,
    targetId: target.id,
    componentsDir,
    componentFolders,
  });

  const allComponents = [...components, ...siblingComponents];

  const rewriteFlatImports = createFlatImportRewriter({
    graphs: [publicGraph, graph],
    components: allComponents,
    moduleRegistry,
    moduleRegistryCollisions,
    sourceModuleRegistry,
    moduleBase,
    relSpecifier,
  });

  // 4. Host preparation
  const componentHosts = prepareComponentHostsList({
    plugin: options.plugin,
    allComponents,
    targetId: target.id,
    sourceRoot,
    context,
    componentFolders,
    router: options.router,
    routerPlugins: options.routerPlugins,
    routerConditions: options.routerConditions,
    diagnostics: options.diagnostics,
  });

  // 5. Component compilation & helper carrying
  compileComponentTree({
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
    router: options.router,
    routerPlugins: options.routerPlugins,
    routerConditions: options.routerConditions,
  });

  // 6. Sprite helpers
  carrySpriteHelpers({ sourceRoot, carryHelperModule });

  // 7. Barrel helper exports
  const helpers = discoverHelperExportsFromGraph(publicGraph, componentFolders);
  const externalExports = discoverExternalExportsFromGraph(publicGraph);
  for (const helper of helpers) {
    if (helper.sourcePath === undefined) {
      continue;
    }
    carryHelperModule(helper.sourcePath);
  }

  // 8. Pending index sources
  const indexSourceBuilder = createGeneratedIndexSourceBuilder({
    graphs: [publicGraph, graph],
    components,
    siblingComponents,
    sourceModuleRegistry,
    moduleBase,
    mirrorDir,
    relSpecifier,
    target,
  });

  for (const sourcePath of pendingIndexSources) {
    const indexSource = indexSourceBuilder.generatedIndexSource(sourcePath);
    if (indexSource !== undefined) {
      writeModule(mirrorHelperDir(sourcePath), 'index.ts', indexSource, sourcePath);
    }
  }

  // 9. Local JSX types module
  if (
    target.id === 'react' ||
    target.id === 'vue' ||
    target.id === 'solid' ||
    target.id === 'svelte' ||
    target.id === 'web-components'
  ) {
    writeModule('', LOCAL_JSX_TYPES_FILE, localJsxTypesModuleSource(target.id));
  }

  // 10. Type origin resolution
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

  // 11. Entry synthesis and flat import rewriting
  const entryFile = path.join(options.outDir, `index${target.entryExtension}`);
  context.writer.writeText(
    path.relative(options.outDir, entryFile),
    generateEntry(target, components, helpers, resolveTypeOrigin, externalExports),
    'entry',
  );
  rewriteTargets.push({ file: entryFile, dir: '' });

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

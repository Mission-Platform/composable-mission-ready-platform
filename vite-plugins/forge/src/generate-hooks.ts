/**
 * Stage-1 driver + declaration synthesis for a neutral **hook library**.
 *
 * Hook barrels are inspected through the canonical Forge graph so nested,
 * aliased, multiline, and type-only exports use the same facts as component
 * discovery.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { readNeutralImports } from './compiler/ast.js';
import { type DiscoveredHelperExport } from './compiler/discover.js';
import { createForgeGenerationContext, type ForgeGenerationContext } from './compiler/generation-context.js';

import type {
  ForgeExportFact,
  ForgeFileGraph,
  ForgeFileNode,
  ForgeGraphDiagnostic,
  ForgePathAliases,
} from './compiler/graph.js';
import type { ForgeCompilerService } from './compiler/service.js';
import type { CompilerDiagnostic, FrameworkOutputPlugin, JsxFramework } from '@mission-platform/forge-plugin-api';
import type { RouterOutputPlugin, RouterPluginSelection } from '@mission-platform/forge-router-plugin-api';
import type { Plugin } from 'vite';

/** Options for {@link generateHookLibrarySources}. */
export interface GenerateHookLibrarySourcesOptions {
  /** Explicit output plugin that owns hook lowering and source generation. */
  plugin: FrameworkOutputPlugin;
  /** Absolute path of the neutral barrel (e.g. `src/index.ts`). */
  entryModule: string;
  /** Absolute path of the directory the generated sources + entry are written to. */
  outDir: string;
  /** Optional source root used for tsconfig paths and workspace aliases. */
  sourceRoot?: string;
  /** Optional tsconfig used to resolve hook barrel aliases. */
  tsconfig?: string;
  /** Explicit aliases used in addition to relative imports. */
  paths?: ForgePathAliases;
  /** Receives graph diagnostics before generation fails on an incomplete graph. */
  diagnostics?: ForgeGraphDiagnostic[];
  /** Persistent service reused by component and hook generation in one build session. */
  service?: ForgeCompilerService;
  /** Receives target compiler diagnostics in addition to graph diagnostics. */
  compilerDiagnostics?: CompilerDiagnostic[];
  /** Native router target selected independently from the framework target. */
  router?: RouterPluginSelection;
  /** Router targets available for id-based selection. */
  routerPlugins?: readonly RouterOutputPlugin[];
  /** Conditions forwarded to the selected router target. */
  routerConditions?: readonly string[];
  /** Reject test-fixture output when invoked from a production build driver. */
  rejectFixturePlaceholder?: boolean;
}

/** The extensions supported by generated hook source modules. */
const SOURCE_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx'] as const;

function graphTarget(graph: ForgeFileGraph, node: ForgeFileNode, fact: ForgeExportFact): ForgeFileNode | undefined {
  if (fact.specifier === undefined) return undefined;
  const target = graph.edges.find(
    (edge) => edge.from === node.id && edge.specifier === fact.specifier && edge.resolved && edge.to !== undefined,
  )?.to;
  return target === undefined ? undefined : graph.nodes.get(target);
}

function exportName(localName: string | undefined, exportedName: string | undefined): string | undefined {
  if (exportedName === undefined) return undefined;
  if (localName === undefined || localName === exportedName) return exportedName;
  return `${localName} as ${exportedName}`;
}

function sourceModulePath(rootDirectory: string, sourcePath: string): string {
  const relative = path.relative(rootDirectory, sourcePath).split(path.sep).join('/');
  const extension = path.extname(relative);
  const withoutExtension = extension.length === 0 ? relative : relative.slice(0, -extension.length);
  if (path.basename(withoutExtension) === 'index') return path.dirname(withoutExtension);
  const sourceDirectory = path.dirname(sourcePath);
  const sourceName = path.basename(withoutExtension);
  const parentName = path.basename(sourceDirectory);
  return sourceName === parentName && existsSync(path.join(sourceDirectory, 'index.ts'))
    ? path.dirname(withoutExtension)
    : withoutExtension;
}

interface HookDiscoveryResult {
  modules: DiscoveredHelperExport[];
  diagnostics: readonly ForgeGraphDiagnostic[];
}

function discoverHookModules(graph: ForgeFileGraph): HookDiscoveryResult {
  const rootDirectory = path.dirname(graph.entry);
  const discovered = new Map<string, DiscoveredHelperExport>();
  const visitedBarrels = new Set<string>();

  const add = (sourceNode: ForgeFileNode, values: readonly string[], types: readonly string[]): void => {
    const relativePath = sourceModulePath(rootDirectory, sourceNode.id);
    const current = discovered.get(sourceNode.id) ?? {
      base: path.basename(relativePath),
      relativePath,
      values: [],
      types: [],
      sourcePath: sourceNode.id,
    };
    for (const value of values) {
      if (!current.values.includes(value)) current.values.push(value);
    }
    for (const type of types) {
      if (!current.types.includes(type)) current.types.push(type);
    }
    discovered.set(sourceNode.id, current);
  };

  const visit = (barrel: ForgeFileNode): void => {
    if (visitedBarrels.has(barrel.id)) {
      return;
    }
    visitedBarrels.add(barrel.id);

    for (const fact of barrel.exports) {
      const target = graphTarget(graph, barrel, fact);
      if (target === undefined) continue;
      if (fact.star || target.kind === 'folder') {
        if (!fact.star && target.kind === 'folder') {
          const name = exportName(fact.localName, fact.exportedName);
          if (name !== undefined) add(target, fact.typeOnly ? [] : [name], fact.typeOnly ? [name] : []);
        }
        visit(target);
        if (fact.star && target.kind !== 'folder') {
          add(
            target,
            target.exports
              .filter((entry) => !entry.typeOnly)
              .map((entry) => exportName(entry.localName, entry.exportedName))
              .filter((name): name is string => name !== undefined),
            target.exports
              .filter((entry) => entry.typeOnly)
              .map((entry) => exportName(entry.localName, entry.exportedName))
              .filter((name): name is string => name !== undefined),
          );
        }
        continue;
      }
      const name = exportName(fact.localName, fact.exportedName);
      if (name === undefined) continue;
      add(target, fact.typeOnly ? [] : [name], fact.typeOnly ? [name] : []);
    }
  };

  const entry = graph.nodes.get(graph.entry);
  if (entry !== undefined) visit(entry);
  return { modules: [...discovered.values()], diagnostics: graph.diagnostics };
}

/** Resolve a re-exported module, preserving whether it is a file or directory barrel. */
function resolveModuleSource(
  directory: string,
  base: string,
): { path: string; extension: string; generatedPath: string; directory: boolean } | undefined {
  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = path.join(directory, `${base}.${extension}`);
    if (existsSync(candidate)) {
      return { path: candidate, extension, generatedPath: base, directory: false };
    }
  }
  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = path.join(directory, base, `index.${extension}`);
    if (existsSync(candidate)) {
      return { path: candidate, extension, generatedPath: `${base}/index`, directory: true };
    }
  }
  return undefined;
}

/** Re-export one module's value + type bindings from the generated tree (nested path preserved). */
function reExportLine(module: DiscoveredHelperExport): string {
  const names = [...module.values, ...module.types.map((type) => `type ${type}`)];
  return `export { ${names.join(', ')} } from './${module.relativePath}';`;
}

/** Write a generated module to `outDir`, mirroring its nested `relativePath` and creating folders as needed. */

/** Recursively collect source files, excluding declarations and colocated tests. */
function collectGeneratedSources(directory: string, extensions: readonly string[]): string[] {
  const collected: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collected.push(...collectGeneratedSources(full, extensions));
    } else if (
      extensions.some((extension) => entry.name.endsWith(extension)) &&
      !entry.name.endsWith('.d.ts') &&
      !/(?:\.spec|\.test)\.(?:js|jsx|ts|tsx)$/.test(entry.name)
    ) {
      collected.push(full);
    }
  }
  return collected;
}

/** Compile or copy one source file into its matching location in the cache tree. */
function emitGeneratedSource(
  context: ForgeGenerationContext,
  sourcePath: string,
  generatedPath: string,
  extension: string,
  router: RouterPluginSelection | undefined,
  routerPlugins: readonly RouterOutputPlugin[] | undefined,
  routerConditions: readonly string[] | undefined,
): void {
  const source = readFileSync(sourcePath, 'utf8');
  const neutral = readNeutralImports(sourcePath, source);
  const usesNeutral = neutral.values.length > 0 || neutral.types.length > 0;
  if (!usesNeutral) {
    context.writer.writeText(`${generatedPath}.${extension}`, source, 'module');
    return;
  }
  const compiled = context.compile({
    source,
    fileName: sourcePath,
    moduleKind: 'composable',
    router,
    routerPlugins,
    routerConditions,
  });
  const code = compiled.code;
  context.writer.writeText(`${generatedPath}.${compiled.lang}`, code, 'module');
  for (const extra of compiled.extraModules ?? []) {
    const directory = path.posix.dirname(generatedPath);
    const prefix = directory === '.' ? '' : `${directory}/`;
    context.writer.writeText(`${prefix}${extra.name}.${extra.lang}`, extra.code, 'module');
  }
  if (compiled.map !== undefined) {
    context.writer.writeText(
      `${generatedPath}.map`,
      typeof compiled.map === 'string' ? compiled.map : JSON.stringify(compiled.map),
      'map',
    );
  }
  for (const declaration of compiled.declarations ?? []) {
    context.writer.writeText(declaration.name, declaration.code, 'declaration');
  }
}

/**
 * Compile a neutral hook library to its per-framework source tree (Stage 1),
 * returning the generated entry module path.
 */
export function generateHookLibrarySources(options: GenerateHookLibrarySourcesOptions): string {
  const context = createForgeGenerationContext({
    service: options.service,
    target: options.plugin,
    entry: options.entryModule,
    outDir: options.outDir,
    sourceRoot: options.sourceRoot ?? path.dirname(options.entryModule),
    tsconfig: options.tsconfig,
    paths: options.paths,
    diagnostics: options.compilerDiagnostics,
    rejectFixturePlaceholder: options.rejectFixturePlaceholder,
  });
  const graph = context.graph;
  const discovery = discoverHookModules(graph);
  options.diagnostics?.push(...discovery.diagnostics);
  const graphErrors = discovery.diagnostics.filter((diagnostic) => diagnostic.code !== 'cycle');
  if (graphErrors.length > 0) {
    throw new Error(graphErrors.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join('\n'));
  }
  const modules = discovery.modules;
  const directory = path.dirname(options.entryModule);

  for (const module of modules) {
    const resolved = resolveModuleSource(directory, module.relativePath);
    if (resolved === undefined) {
      continue;
    }
    if (!resolved.directory) {
      emitGeneratedSource(
        context,
        resolved.path,
        module.relativePath,
        resolved.extension,
        options.router,
        options.routerPlugins,
        options.routerConditions,
      );
      continue;
    }

    // Directory-backed composables have a local barrel plus an implementation
    // file (and may have private support modules). Mirror the complete source
    // tree so the generated entry resolves its `./<composable>` import through
    // `index.ts` without flattening away the authored structure.
    const sourceDirectory = path.dirname(resolved.path);
    for (const sourcePath of collectGeneratedSources(sourceDirectory, ['.js', '.jsx', '.ts', '.tsx'])) {
      const relativeSourcePath = path.relative(sourceDirectory, sourcePath).split(path.sep).join('/');
      const sourceExtension = path.extname(relativeSourcePath).slice(1);
      const relativeSourceBase = relativeSourcePath.slice(0, -(sourceExtension.length + 1));
      emitGeneratedSource(
        context,
        sourcePath,
        `${module.relativePath}/${relativeSourceBase}`,
        sourceExtension,
        options.router,
        options.routerPlugins,
        options.routerConditions,
      );
    }
  }

  const entryFile = path.join(
    options.outDir,
    options.plugin.source.entryExtension === '.tsx' ? 'index.tsx' : 'index.ts',
  );
  const entrySource = `${modules.map((module) => reExportLine(module)).join('\n')}\n`;
  context.writer.writeText(path.basename(entryFile), entrySource, 'entry');
  context.writer.finalize([path.basename(entryFile)]);
  return entryFile;
}

/** Options for {@link hookLibraryDtsPlugin}. */
export interface HookLibraryDtsOptions {
  /** The framework of the generated source tree — selects the source extensions + JSX handling. */
  framework: JsxFramework;
  /**
   * Absolute path of the generated per-framework source tree (the `outDir`
   * handed to {@link generateHookLibrarySources}).
   */
  generatedDir: string;
  /** Absolute path of the directory the emitted `.d.ts` files are written to (e.g. `dist/react`, `dist/vue`). */
  outDir: string;
}

/** Base compiler options for emitting a generated hook tree's declarations (mirrors the packages' `tsconfig.build.json`). */
const HOOK_DTS_COMPILER_OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2023,
  lib: ['lib.es2023.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  skipLibCheck: true,
  esModuleInterop: true,
  strict: true,
  declaration: true,
  emitDeclarationOnly: true,
  noEmitOnError: false,
  types: [],
};

/** The source extensions a generated framework tree is authored under (React also emits `.tsx`). */
function hookSourceExtensions(framework: JsxFramework): readonly string[] {
  return framework === 'react' || framework === 'solid' || framework === 'svelte' ? ['.ts', '.tsx'] : ['.ts'];
}

/**
 * A post-build Vite plugin that emits **genuine, per-framework** declarations
 * for a hook library's generated source tree.
 *
 * Each framework build ({@link generateHookLibrarySources} + the framework's
 * Stage-2 bundler) produces JS but no declarations, since the generated tree is
 * not a `tsc`-visible source file. Rather than re-export a single *common*
 * neutral declaration for every framework, this plugin runs the TypeScript
 * compiler API over the generated tree in `closeBundle` (a post-build step) and
 * writes the resulting `.d.ts` files (`index.d.ts` + one per module) into the
 * build's own `outDir`. Each framework build gets declarations typed against
 * its own generated runtime types. Type diagnostics are
 * surfaced as build warnings rather than failures so a `.d.ts` is always
 * produced.
 */
export function hookLibraryDtsPlugin(options: HookLibraryDtsOptions): Plugin {
  const extensions = hookSourceExtensions(options.framework);
  return {
    name: '@mission-platform/vite-plugin-forge:hook-dts',
    // Rolldown runs `writeBundle` for every output config, while its
    // `closeBundle` compatibility hook is not guaranteed for array configs.
    // Generate declarations after the framework tree has been written so every
    // target receives the same package-level contract.
    writeBundle() {
      const rootNames = collectGeneratedSources(options.generatedDir, extensions);

      const program = ts.createProgram(rootNames, {
        ...HOOK_DTS_COMPILER_OPTIONS,
        // The React tree is authored in the classic-`h` JSX dialect; preserving
        // JSX keeps declaration emit agnostic to the runtime factory (the hooks
        // themselves carry no JSX, so this only future-proofs the emitter).
        jsx: ts.JsxEmit.Preserve,
        rootDir: options.generatedDir,
        outDir: options.outDir,
        declarationDir: options.outDir,
      });
      const emitResult = program.emit(undefined, undefined, undefined, true);

      const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
      for (const diagnostic of diagnostics) {
        this.warn(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      }
    },
  };
}

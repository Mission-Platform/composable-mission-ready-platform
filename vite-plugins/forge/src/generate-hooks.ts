/**
 * Stage-1 driver + declaration synthesis for a neutral **hook library**.
 *
 * A hook library (e.g. `@mission-platform/rxjs`, `@mission-platform/d3`) is a
 * write-once package of composables authored against `@mission-platform/forge`'s
 * React-style hooks, re-exported from a single barrel (`src/index.ts`) — the
 * hook counterpart of the components barrel {@link generateFrameworkSources}
 * consumes. {@link generateHookLibrarySources} reads that barrel, compiles every
 * re-exported module to the target framework with {@link compileHookModule}
 * (framework-neutral *pure* modules — those that never import the neutral
 * package — are copied verbatim), writes them as a flat generated tree plus a
 * public entry re-exporting the barrel's API, and returns that entry path so it
 * can be handed straight to Vite's `lib.entry`. Stage 2 (the framework's own
 * Vite plugins) then compiles that tree natively.
 *
 * Because the generated tree is not a source file `tsc` sees, no declarations
 * are emitted for it by the framework's Stage-2 bundler. {@link
 * hookLibraryDtsPlugin} fills that gap as a post-build step: it runs the
 * TypeScript compiler API over the generated tree and emits **genuine,
 * per-framework** declarations into the build's own `dist/<framework>` — so the
 * React build gets declarations typed against React's hooks and the Vue build
 * gets declarations whose composables return Vue `Ref`s, rather than every
 * framework sharing one common (neutral) declaration.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { LOCAL_EFFECT_FILE, LOCAL_EFFECT_MODULE, localEffectModuleSource, readNeutralImports } from './compiler/ast.js';
import { compileHookModule } from './compiler/compile.js';
import { type DiscoveredHelperExport } from './compiler/discover.js';
import { parseForgeSource } from './compiler/frontends.js';

import type { FrameworkOutputPlugin, JsxFramework } from '@mission-platform/forge-plugin-api';
import type { Plugin } from 'vite';

/** Options for {@link generateHookLibrarySources}. */
export interface GenerateHookLibrarySourcesOptions {
  /** Explicit output plugin that owns hook lowering and source generation. */
  plugin: FrameworkOutputPlugin;
  /** Absolute path of the neutral barrel (e.g. `src/index.ts`). */
  entryModule: string;
  /** Absolute path of the directory the generated sources + entry are written to. */
  outDir: string;
}

/** The extensions a re-exported module's source may be authored under. */
const SOURCE_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx'] as const;

interface HookReExport {
  values: string[];
  types: string[];
  from: string;
  exportAll: boolean;
}

function parseHookReExports(source: string): HookReExport[] {
  const result: HookReExport[] = [];
  const reExport = /export\s+(type\s+)?(\*|\{([^}]*)\})\s+from\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null = reExport.exec(source);
  while (match !== null) {
    const values: string[] = [];
    const types: string[] = [];
    if (match[2] !== '*') {
      for (const raw of match[3].split(',')) {
        const token = raw.trim();
        if (token.length === 0) {
          continue;
        }
        if (match[1] !== undefined || token.startsWith('type ')) {
          types.push(match[1] !== undefined ? token : token.slice('type '.length).trim());
        } else {
          values.push(token);
        }
      }
    }
    result.push({ values, types, from: match[4], exportAll: match[2] === '*' });
    match = reExport.exec(source);
  }
  return result;
}

function resolveSourceModule(directory: string, specifier: string): string | undefined {
  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = path.resolve(directory, `${specifier}.${extension}`);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = path.resolve(directory, specifier, `index.${extension}`);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function moduleRelativePath(rootDirectory: string, sourcePath: string): string {
  const sourceDirectory = path.dirname(sourcePath);
  const sourceName = path.basename(sourcePath, path.extname(sourcePath));
  const parentName = path.basename(sourceDirectory);
  const isDirectoryBarrel = sourceName === 'index';
  const isDuplicatedFileWithBarrel = sourceName === parentName && existsSync(path.join(sourceDirectory, 'index.ts'));
  const modulePath = isDirectoryBarrel || isDuplicatedFileWithBarrel ? sourceDirectory : sourcePath;
  const relative = path.relative(rootDirectory, modulePath).split(path.sep).join('/');
  return isDirectoryBarrel || isDuplicatedFileWithBarrel
    ? relative
    : relative.slice(0, -path.extname(sourcePath).length);
}

function discoverHookModules(entryModule: string): DiscoveredHelperExport[] {
  const rootDirectory = path.dirname(entryModule);
  const discovered = new Map<string, DiscoveredHelperExport>();
  const visitedBarrels = new Set<string>();

  const visit = (barrelPath: string): void => {
    const resolvedBarrel = path.resolve(barrelPath);
    if (visitedBarrels.has(resolvedBarrel)) {
      return;
    }
    visitedBarrels.add(resolvedBarrel);

    const source = readFileSync(resolvedBarrel, 'utf8');
    for (const reExport of parseHookReExports(source)) {
      const target = resolveSourceModule(path.dirname(resolvedBarrel), reExport.from);
      if (target === undefined) {
        continue;
      }
      if (reExport.exportAll && path.basename(target, path.extname(target)) === 'index') {
        visit(target);
        continue;
      }

      const relativePath = moduleRelativePath(rootDirectory, target);
      const base = path.basename(relativePath);
      const current = discovered.get(relativePath) ?? {
        base,
        relativePath,
        values: [],
        types: [],
      };
      current.values.push(...reExport.values.filter((name) => !current.values.includes(name)));
      current.types.push(...reExport.types.filter((name) => !current.types.includes(name)));
      discovered.set(relativePath, current);
    }
  };

  visit(entryModule);
  return [...discovered.values()];
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

/** How many folder levels deep a generated module sits (0 = tree root). */
function moduleDepth(relativePath: string): number {
  return relativePath.split('/').length - 1;
}

/**
 * The generated Vue hook modules import the co-located effect helper as
 * `./mp-effect` ({@link LOCAL_EFFECT_MODULE}), which is written at the tree root.
 * A module nested under `composables/` must reach it with `../`, so rewrite the
 * specifier to the depth-correct relative path before the module is written.
 */
function rewriteLocalEffectImport(code: string, depth: number): string {
  if (depth === 0) {
    return code;
  }
  const target = `${'../'.repeat(depth)}mp-effect`;
  return code
    .replaceAll(`'${LOCAL_EFFECT_MODULE}'`, `'${target}'`)
    .replaceAll(`"${LOCAL_EFFECT_MODULE}"`, `"${target}"`);
}

/** Write a generated module to `outDir`, mirroring its nested `relativePath` and creating folders as needed. */
function writeGeneratedModule(outDir: string, relativePath: string, extension: string, contents: string): void {
  const target = path.join(outDir, `${relativePath}.${extension}`);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents, 'utf8');
}

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
  outDir: string,
  sourcePath: string,
  generatedPath: string,
  extension: string,
  plugin: FrameworkOutputPlugin,
): void {
  const source = readFileSync(sourcePath, 'utf8');
  const parsed = parseForgeSource(sourcePath, source);
  const neutral = readNeutralImports(parsed);
  const usesNeutral = neutral.values.length > 0 || neutral.types.length > 0;
  if (!usesNeutral) {
    writeGeneratedModule(outDir, generatedPath, extension, source);
    return;
  }
  const compiled = compileHookModule(source, { framework: plugin, fileName: sourcePath });
  const code = rewriteLocalEffectImport(compiled.code, moduleDepth(generatedPath));
  writeGeneratedModule(outDir, generatedPath, compiled.lang, code);
}

/**
 * Compile a neutral hook library to its per-framework source tree (Stage 1),
 * returning the generated entry module path.
 */
export function generateHookLibrarySources(options: GenerateHookLibrarySourcesOptions): string {
  const modules = discoverHookModules(options.entryModule);
  const directory = path.dirname(options.entryModule);

  rmSync(options.outDir, { recursive: true, force: true });
  mkdirSync(options.outDir, { recursive: true });

  for (const module of modules) {
    const resolved = resolveModuleSource(directory, module.relativePath);
    if (resolved === undefined) {
      continue;
    }
    if (!resolved.directory) {
      emitGeneratedSource(options.outDir, resolved.path, module.relativePath, resolved.extension, options.plugin);
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
        options.outDir,
        sourcePath,
        `${module.relativePath}/${relativeSourceBase}`,
        sourceExtension,
        options.plugin,
      );
    }
  }

  // The co-located effect helper module: the Vue-only generalised watcher
  // (`mpEffect`) the compiled composables route every `useEffect` through (built
  // on native `watch`/lifecycle). Written once per tree, exactly as the components
  // driver writes it. It is Vue-only, so `localEffectModuleSource` returns an empty
  // string for React and nothing is written for the React build.
  const framework = options.plugin.id as JsxFramework;
  const effectModuleSource = localEffectModuleSource(framework);
  if (effectModuleSource.length > 0) {
    writeFileSync(path.join(options.outDir, LOCAL_EFFECT_FILE), effectModuleSource, 'utf8');
  }

  const entryFile = path.join(
    options.outDir,
    options.plugin.source.entryExtension === '.tsx' ? 'index.tsx' : 'index.ts',
  );
  const entrySource = `${modules.map((module) => reExportLine(module)).join('\n')}\n`;
  writeFileSync(entryFile, entrySource, 'utf8');
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
 * build's own `outDir`. So the **React** build gets declarations typed against
 * React's own hooks and the **Vue** build gets declarations whose composables
 * return Vue `Ref`s — each framework its own types. Type diagnostics are
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

      if (options.framework === 'react' || options.framework === 'vue') {
        const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
        for (const diagnostic of diagnostics) {
          this.warn(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
      }
    },
  };
}

/**
 * Stage-1 driver + declaration synthesis for a neutral **hook library**.
 *
 * A hook library (e.g. `@mission-platform/rxjs`, `@mission-platform/d3`) is a
 * write-once package of composables authored against `@mission-platform/jsx`'s
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

import { LOCAL_EFFECT_FILE, localEffectModuleSource, parseTsx, readNeutralImports } from './compiler/ast.js';
import { compileHookModule, type JsxFramework } from './compiler/compile.js';
import { discoverHelperExports, type DiscoveredHelperExport } from './compiler/discover.js';

import type { Plugin } from 'vite';

/** Options for {@link generateHookLibrarySources}. */
export interface GenerateHookLibrarySourcesOptions {
  /** Target framework the neutral hooks are compiled to. */
  framework: JsxFramework;
  /** Absolute path of the neutral barrel (e.g. `src/index.ts`). */
  entryModule: string;
  /** Absolute path of the directory the generated sources + entry are written to. */
  outDir: string;
}

/** The extensions a re-exported module's source may be authored under. */
const SOURCE_EXTENSIONS = ['ts', 'tsx'] as const;

/** Resolve the on-disk source path for a re-exported module base, if it exists. */
function resolveModuleSource(directory: string, base: string): { path: string; extension: string } | undefined {
  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = path.join(directory, `${base}.${extension}`);
    if (existsSync(candidate)) {
      return { path: candidate, extension };
    }
  }
  return undefined;
}

/** Re-export one module's value + type bindings from the flat generated tree. */
function reExportLine(module: DiscoveredHelperExport): string {
  const names = [...module.values, ...module.types.map((type) => `type ${type}`)];
  return `export { ${names.join(', ')} } from './${module.base}';`;
}

/**
 * Compile a neutral hook library to its per-framework source tree (Stage 1),
 * returning the generated entry module path.
 */
export function generateHookLibrarySources(options: GenerateHookLibrarySourcesOptions): string {
  const directory = path.dirname(options.entryModule);
  const barrelSource = readFileSync(options.entryModule, 'utf8');
  // Every re-exported module of a hook library is a "helper" (there are no
  // components), so discovery with an empty component set yields them all.
  const modules = discoverHelperExports(barrelSource, new Set());

  rmSync(options.outDir, { recursive: true, force: true });
  mkdirSync(options.outDir, { recursive: true });

  for (const module of modules) {
    const resolved = resolveModuleSource(directory, module.base);
    if (resolved === undefined) {
      continue;
    }
    const source = readFileSync(resolved.path, 'utf8');
    const parsed = parseTsx(resolved.path, source);
    const neutral = readNeutralImports(parsed);
    const usesNeutral = neutral.values.length > 0 || neutral.types.length > 0;

    if (!usesNeutral) {
      // A pure, framework-agnostic module (no neutral import) needs no rewrite —
      // copy it verbatim into the flat tree so the entry's `./<base>` resolves.
      writeFileSync(path.join(options.outDir, `${module.base}.${resolved.extension}`), source, 'utf8');
      continue;
    }

    const compiled = compileHookModule(source, { framework: options.framework, fileName: resolved.path });
    writeFileSync(path.join(options.outDir, `${module.base}.${compiled.lang}`), compiled.code, 'utf8');
  }

  // The co-located effect helper module: the Vue-only generalised watcher
  // (`mpEffect`) the compiled composables route every `useEffect` through (built
  // on native `watch`/lifecycle). Written once per tree, exactly as the components
  // driver writes it. It is Vue-only, so `localEffectModuleSource` returns an empty
  // string for React and nothing is written for the React build.
  const effectModuleSource = localEffectModuleSource(options.framework);
  if (effectModuleSource.length > 0) {
    writeFileSync(path.join(options.outDir, LOCAL_EFFECT_FILE), effectModuleSource, 'utf8');
  }

  const entryFile = path.join(options.outDir, options.framework === 'react' || options.framework === 'solid' ? 'index.tsx' : 'index.ts');
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
  return framework === 'react' || framework === 'solid' ? ['.ts', '.tsx'] : ['.ts'];
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
    name: '@mission-platform/vite-plugin-jsx:hook-dts',
    closeBundle() {
      const rootNames = readdirSync(options.generatedDir)
        .filter((file) => extensions.some((extension) => file.endsWith(extension)) && !file.endsWith('.d.ts'))
        .map((file) => path.join(options.generatedDir, file));

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

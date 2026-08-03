/**
 * Stage-1 of the two-stage compiler: source-to-source transformation.
 *
 * A neutral component authored against `@mission-platform/forge` is parsed with
 * the TypeScript compiler API and re-emitted as a per-framework **source
 * module** — a React `.tsx` or a Vue `.vue` single-file component. Stage 2 (the
 * framework's own Vite plugin / JSX transform) then compiles that module
 * natively, so the output never pays for a generic runtime adapter and a new
 * target framework is added simply by writing another emitter.
 */
// eslint-disable-next-line import-x/no-useless-path-segments -- explicit `/index.js` keeps the directory barrel resolvable by Node ESM at runtime
import { emitReactModule } from '../generators/react/index.js';
// eslint-disable-next-line import-x/no-useless-path-segments -- explicit `/index.js` keeps the directory barrel resolvable by Node ESM at runtime
import { emitSolidHookModule, emitSolidModule } from '../generators/solid/index.js';
// eslint-disable-next-line import-x/no-useless-path-segments -- explicit `/index.js` keeps the directory barrel resolvable by Node ESM at runtime
import { emitSvelteHookModule, emitSvelteModule } from '../generators/svelte/index.js';
import { emitVueHookModule } from '../generators/vue/hook-module.js';
// eslint-disable-next-line import-x/no-useless-path-segments -- explicit `/index.js` keeps the directory barrel resolvable by Node ESM at runtime
import { emitVueModule } from '../generators/vue/index.js';
// eslint-disable-next-line import-x/no-useless-path-segments -- explicit `/index.js` keeps the directory barrel resolvable by Node ESM at runtime
import { emitWebComponentHookModule, emitWebComponentModule } from '../generators/web-components/index.js';

import { parseTsx, stripFrameworkDirective } from './ast.js';

export { moduleTargetsFramework, readFrameworkDirective } from './ast.js';

/** A framework the neutral components can be compiled to. */
export type JsxFramework = 'react' | 'vue' | 'svelte' | 'solid' | 'web-components';

/** Options for {@link compileComponentModule}. */
export interface CompileOptions {
  /** The target framework. */
  framework: JsxFramework;
  /** The neutral component's export name (e.g. `BaseBadge`); used by the Vue emitter. */
  componentName: string;
  /** Source file name used for diagnostics. Defaults to `<componentName>.tsx`. */
  fileName?: string;
  /**
   * The folder base names of the package's discovered components (e.g.
   * `base-typography`). A relative value import whose base is in this set is a
   * sibling **component** (the Vue emitter imports it as `./<base>.vue`);
   * everything else is a plain **helper module** (imported by name from
   * `./<base>`). When omitted every relative value import is treated as a
   * component, preserving the original behaviour.
   */
  componentFolders?: ReadonlySet<string>;
}

/** An auxiliary SFC emitted alongside a primary module (e.g. a recursive helper component). */
export interface ExtraModule {
  /** The flat-tree base name (no extension) the module is written under, e.g. `base-menubar-item`. */
  name: string;
  /** The emitted SFC source. */
  code: string;
  /** The extension/language the module is written under. */
  lang: 'vue' | 'svelte' | 'ts' | 'tsx';
}

/** The Stage-1 result: emitted source and the extension it should be written under. */
export interface CompiledModule {
  /** The emitted per-framework source. */
  code: string;
  /**
   * The file extension/language of {@link CompiledModule.code}: `tsx` for a React/Solid
   * component/hook module, `vue` for a Vue SFC, `svelte` for a Svelte SFC, or `ts` for a hook module.
   */
  lang: 'tsx' | 'vue' | 'svelte' | 'ts';
  /**
   * Auxiliary SFCs generated alongside the primary module (e.g. the recursive
   * helper components the Vue emitter extracts from a self-recursive,
   * state-capturing render helper). Written next to the primary SFC by the
   * driver and compiled in Stage 2. Empty/absent for the common single-file case.
   */
  extraModules?: ExtraModule[];
}

/**
 * Compile one neutral (or framework-gated) component module to its per-framework
 * source (Stage 1).
 *
 * A leading `"use react";` / `"use vue";` directive is stripped before emitting
 * so the marker never leaks into the output; gating a module out of the
 * non-matching framework's build is handled upstream by the discovery step
 * (see {@link moduleTargetsFramework}).
 */
export function compileComponentModule(source: string, options: CompileOptions): CompiledModule {
  const parsed = parseTsx(options.fileName ?? `${options.componentName}.tsx`, source);
  const sourceFile = stripFrameworkDirective(parsed);
  if (options.framework === 'react') {
    return { code: emitReactModule(sourceFile, options.componentName), lang: 'tsx' };
  }
  if (options.framework === 'solid') {
    const emitted = emitSolidModule(sourceFile, options.componentName, options.componentFolders);
    return { code: emitted.code, lang: 'tsx', extraModules: emitted.extraModules };
  }
  if (options.framework === 'svelte') {
    const emitted = emitSvelteModule(sourceFile, options.componentName, options.componentFolders);
    return { code: emitted.code, lang: 'svelte', extraModules: emitted.extraModules };
  }
  if (options.framework === 'web-components') {
    const emitted = emitWebComponentModule(sourceFile, options.componentName, options.componentFolders);
    return { code: emitted.code, lang: 'ts', extraModules: emitted.extraModules };
  }
  const emitted = emitVueModule(sourceFile, options.componentName, options.componentFolders);
  return {
    code: emitted.code,
    lang: 'vue',
    extraModules: emitted.extraModules.map((module) => ({ name: module.name, code: module.code, lang: 'vue' })),
  };
}

/** Options for {@link compileHookModule}. */
export interface CompileHookOptions {
  /** The target framework. */
  framework: JsxFramework;
  /** Source file name used for diagnostics. Defaults to `hook.tsx`. */
  fileName?: string;
}

/**
 * Compile one neutral **hook module** (a write-once composable authored against
 * `@mission-platform/forge`'s React-style hooks, *not* a UI component) to its
 * per-framework source (Stage 1).
 */
export function compileHookModule(source: string, options: CompileHookOptions): CompiledModule {
  const parsed = parseTsx(options.fileName ?? 'hook.tsx', source);
  const sourceFile = stripFrameworkDirective(parsed);
  if (options.framework === 'vue') {
    return { code: emitVueHookModule(sourceFile), lang: 'ts' };
  }
  if (options.framework === 'solid') {
    return { code: emitSolidHookModule(sourceFile), lang: 'ts' };
  }
  if (options.framework === 'svelte') {
    return { code: emitSvelteHookModule(sourceFile), lang: 'ts' };
  }
  if (options.framework === 'web-components') {
    return { code: emitWebComponentHookModule(sourceFile), lang: 'ts' };
  }
  return { code: emitReactModule(sourceFile), lang: 'tsx' };
}

/** Compile neutral TSX component to Svelte 5. */
export function compileToSvelte(source: string, options: Omit<CompileOptions, 'framework'>): CompiledModule {
  return compileComponentModule(source, { ...options, framework: 'svelte' });
}

/** Compile neutral TSX component to SolidJS. */
export function compileToSolid(source: string, options: Omit<CompileOptions, 'framework'>): CompiledModule {
  return compileComponentModule(source, { ...options, framework: 'solid' });
}

/** Compile neutral TSX component to Web Component Custom Element. */
export function compileToWebComponent(source: string, options: Omit<CompileOptions, 'framework'>): CompiledModule {
  return compileComponentModule(source, { ...options, framework: 'web-components' });
}

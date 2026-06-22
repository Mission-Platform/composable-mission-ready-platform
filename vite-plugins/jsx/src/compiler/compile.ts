/**
 * Stage-1 of the two-stage compiler: source-to-source transformation.
 *
 * A neutral component authored against `@mission-platform/jsx` is parsed with
 * the TypeScript compiler API and re-emitted as a per-framework **source
 * module** — a React `.tsx` or a Vue `.vue` single-file component. Stage 2 (the
 * framework's own Vite plugin / JSX transform) then compiles that module
 * natively, so the output never pays for a generic runtime adapter and a new
 * target framework is added simply by writing another emitter.
 */
// eslint-disable-next-line import-x/no-useless-path-segments -- explicit `/index.js` keeps the directory barrel resolvable by Node ESM at runtime
import { emitReactModule } from '../generators/react/index.js';
// eslint-disable-next-line import-x/no-useless-path-segments -- explicit `/index.js` keeps the directory barrel resolvable by Node ESM at runtime
import { emitVueModule } from '../generators/vue/index.js';

import { parseTsx } from './ast.js';

/** A framework the neutral components can be compiled to. */
export type JsxFramework = 'react' | 'vue';

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

/** The Stage-1 result: emitted source and the extension it should be written under. */
export interface CompiledModule {
  /** The emitted per-framework source. */
  code: string;
  /** The file extension/language of {@link CompiledModule.code} (`tsx` for React, `vue` for Vue). */
  lang: 'tsx' | 'vue';
}

/** Compile one neutral component module to its per-framework source (Stage 1). */
export function compileComponentModule(source: string, options: CompileOptions): CompiledModule {
  const sourceFile = parseTsx(options.fileName ?? `${options.componentName}.tsx`, source);
  if (options.framework === 'react') {
    return { code: emitReactModule(sourceFile, options.componentName), lang: 'tsx' };
  }
  return { code: emitVueModule(sourceFile, options.componentName, options.componentFolders), lang: 'vue' };
}

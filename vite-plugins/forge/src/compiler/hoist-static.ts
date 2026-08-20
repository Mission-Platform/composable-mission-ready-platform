/**
 * Static hoisting over the framework-neutral generic AST.
 *
 * Hoisting is a pure record transform: static-marked render subtrees are lifted
 * into {@link HoistedStaticEntry} records that each target generator declares in
 * its own native output language. This module delegates to the shared,
 * parser-independent {@link hoistStaticRenderNodes} helper so no TypeScript AST
 * or printer is involved; it exposes a small Oxc-module convenience used by the
 * benchmark harness and analysis tooling.
 */
import {
  hoistStaticRenderNodes,
  type GenericHoistResult,
} from '@mission-platform/forge-plugin-api/compiler/hoist-static.js';
import { optimizeGenericModule } from '@mission-platform/forge-plugin-api/compiler/optimize.js';

import { createGenericAstFromOxc } from './frontends.js';

import type { OxcParsedModule } from './oxc.js';

export { hoistStaticRenderNodes, MP_HOIST_PREFIX } from '@mission-platform/forge-plugin-api/compiler/hoist-static.js';
export type {
  GenericHoistResult,
  HoistedStaticEntry,
} from '@mission-platform/forge-plugin-api/compiler/hoist-static.js';

/**
 * Static-mark then hoist the render tree of an Oxc-parsed module, returning the
 * hoisted generic module plus the lifted entries. Equivalent to running the
 * Stage-1 static-marking pass followed by generic hoisting.
 */
export function hoistStaticJsx(
  module: OxcParsedModule,
  moduleKind: 'component' | 'composable' = 'component',
  componentName?: string,
): GenericHoistResult {
  const marked = optimizeGenericModule(createGenericAstFromOxc(module, moduleKind, componentName)).module;
  return hoistStaticRenderNodes(marked);
}

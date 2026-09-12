import { localJsxTypesModuleSource as sharedLocalJsxTypesModuleSource } from '@mission-platform/forge-plugin-api/compiler/ast.js';

import type { JsxFramework } from '@mission-platform/forge-plugin-api';

/** The neutral package the components import their primitives from. */
export const NEUTRAL_MODULE = '@mission-platform/forge-jsx';

/** The relative specifier for the generated framework-specific JSX types module. */
export const LOCAL_JSX_TYPES_MODULE = './mp-jsx-types';

/** The file name used for the generated framework-specific JSX types module. */
export const LOCAL_JSX_TYPES_FILE = 'mp-jsx-types.ts';

/** Generate the co-located framework-specific JSX type declarations. */
export function localJsxTypesModuleSource(framework: JsxFramework): string {
  return sharedLocalJsxTypesModuleSource(framework);
}

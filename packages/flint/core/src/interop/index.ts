/**
 * Web IDL parser and zero-copy host binding generator for Flint.
 */

import { generateTypeDeclarations } from './dts-generator.js';
import { generateFlintBindings } from './flint-generator.js';
import { generateHostShims } from './host-shim-generator.js';
import { parseWebIdl } from './parser.js';

import type { WebIdlCompileOptions, WebIdlCompileResult } from './types.js';

export { DtsGenerator, generateTypeDeclarations } from './dts-generator.js';
export { FlintBindingGenerator, generateFlintBindings } from './flint-generator.js';
export { HostShimGenerator, generateHostShims } from './host-shim-generator.js';
export { lexWebIdl, WebIdlLexer, type WebIdlToken, type WebIdlTokenKind } from './lexer.js';
export { parseWebIdl, WebIdlParseError, WebIdlParser } from './parser.js';
export {
  compileCHeader,
  cHeaderToFlintModule,
  generateDtsFromC,
  generateFfiHostShim,
  generateFlintFromC,
  mapCTypeToFlint,
  parseCHeader,
  type CConstantDefinition,
  type CFunctionDefinition,
  type CFunctionParameter,
  type CHeaderAst,
  type CStructDefinition,
  type CStructField,
  type FfiHostShimOptions,
  type FfiShimTarget,
} from './c-bindgen.js';

export * from './types.js';

/**
 * End-to-end compilation of a Web IDL source string into FLINT headers, zero-copy host JS shims, and TypeScript .d.ts declarations.
 */
export function compileWebIdl(source: string, options: WebIdlCompileOptions = {}): WebIdlCompileResult {
  const ast = parseWebIdl(source);
  const flintBindings = generateFlintBindings(ast, options.flint);
  const hostShims = generateHostShims(ast, options.host);
  const typeDeclarations = generateTypeDeclarations(ast, options.dts);

  return {
    ast,
    flintBindings,
    hostShims,
    typeDeclarations,
  };
}

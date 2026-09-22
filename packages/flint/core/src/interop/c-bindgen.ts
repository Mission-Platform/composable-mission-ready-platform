/**
 * Automated C and Rust cbindgen Header to Flint Foreign Binding Generator (flint-bindgen).
 * Parses C headers, Rust extern "C" prototypes, and struct layouts into Flint AST,
 * TypeScript declarations, and zero-copy FFI host shims.
 */

import {
  mapCTypeToFlint,
  mapFlintToFfiType,
  mapFlintToTsType,
  type TargetPlatform,
} from '@mission-platform/flint-c-abi';

import type {
  FlintForeignCapabilityDeclaration,
  FlintForeignFunctionDeclaration,
  FlintModule,
  FlintOpaqueForeignTypeDeclaration,
  FlintStructDeclaration,
  FlintTypeName,
} from '../ast.js';
import type { FlintSourceSpan } from '../diagnostics.js';

export { mapCTypeToFlint } from '@mission-platform/flint-c-abi';

/** Parsed numeric or string #define constant definition. */
export interface CConstantDefinition {
  readonly name: string;
  readonly value: string;
  readonly flintType: string;
}

/** Field definition within a parsed C struct. */
export interface CStructField {
  readonly name: string;
  readonly cType: string;
  readonly flintType: string;
  readonly isPointer: boolean;
  readonly isConst: boolean;
}

/** Parsed C struct definition. */
export interface CStructDefinition {
  readonly name: string;
  readonly fields: readonly CStructField[];
  readonly packed?: number;
  readonly align?: number;
}

/** Parameter definition within a parsed C function prototype. */
export interface CFunctionParameter {
  readonly name: string;
  readonly cType: string;
  readonly flintType: string;
  readonly isPointer: boolean;
  readonly isConst: boolean;
}

/** Parsed C function prototype declaration. */
export interface CFunctionDefinition {
  readonly name: string;
  readonly returnType: string;
  readonly flintReturnType: string;
  readonly parameters: readonly CFunctionParameter[];
}

/** Complete parsed C header AST. */
export interface CHeaderAst {
  readonly structs: readonly CStructDefinition[];
  readonly functions: readonly CFunctionDefinition[];
  readonly opaqueTypes: readonly string[];
  readonly constants?: readonly CConstantDefinition[];
}

const emptySpan: FlintSourceSpan = {
  start: 0,
  end: 0,
  line: 1,
  column: 1,
  endLine: 1,
  endColumn: 1,
};

/**
 * Strips comments, preprocessor lines, and whitespace normalization from C source.
 */
function sanitizeCSource(source: string): string {
  return source
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/\/\/.*/g, '')
    .replaceAll(/^#.*/gm, '')
    .trim();
}

/** Parses opaque typedefs: typedef struct Name Name; */
function parseOpaqueTypes(clean: string): string[] {
  const opaqueTypes: string[] = [];
  const opaqueRegex = /typedef\s+struct\s+([A-Za-z0-9_]+)\s+\1\s*;/g;
  let opaqueMatch: RegExpExecArray | undefined;
  while ((opaqueMatch = opaqueRegex.exec(clean) ?? undefined) !== undefined) {
    if (opaqueMatch[1] !== undefined) {
      opaqueTypes.push(opaqueMatch[1]);
    }
  }
  return opaqueTypes;
}

/** Classifies a raw C constant literal into its Flint type and normalized string value. */
function classifyConstantLiteral(rawValue: string): { value: string; flintType: string } | undefined {
  if (/^-?\d+$/.test(rawValue)) {
    return { value: rawValue, flintType: 'c_int' };
  }
  if (/^-?0x[0-9a-f]+$/i.test(rawValue)) {
    return { value: rawValue, flintType: 'c_uint' };
  }
  if (/^-?\d+\.\d+f?$/.test(rawValue)) {
    return { value: rawValue.replace(/f$/i, ''), flintType: 'c_double' };
  }
  if (/^".*"$/.test(rawValue)) {
    return { value: rawValue, flintType: 'string' };
  }
  return undefined;
}

/**
 * Parses #define constants from C source text.
 */
// skipcq: JS-R1005
function parseConstants(source: string): CConstantDefinition[] {
  const constants: CConstantDefinition[] = [];
  const defineRegex = /^[ \t]*#[ \t]*define[ \t]+([A-Za-z_][A-Za-z0-9_]*)[ \t]+([^\r\n]+)/gm;
  let match: RegExpExecArray | undefined;
  while ((match = defineRegex.exec(source) ?? undefined) !== undefined) {
    const name = match[1];
    let rawValue = match[2].trim();
    rawValue = rawValue.replace(/(\/\*.*?\*\/)|(\/\/.*$)/, '').trim();
    if (!rawValue || name.includes('(')) continue;

    const classified = classifyConstantLiteral(rawValue);
    if (classified !== undefined) {
      constants.push({ name, value: classified.value, flintType: classified.flintType });
    }
  }
  return constants;
}

/** Strips pointer asterisks from raw declarator string and reports whether it is a pointer. */
function stripDeclaratorPointer(raw: string): { clean: string; isPointer: boolean } {
  let clean = raw.trim();
  let isPointer = false;
  while (clean.startsWith('*')) {
    isPointer = true;
    clean = clean.slice(1).trim();
  }
  return { clean, isPointer };
}

/** Parses a single struct field declarator statement into a CStructField. */
// skipcq: JS-R1005
function parseStructFieldDeclarator(baseTypeString: string, rawDeclarator: string): CStructField {
  const { clean, isPointer } = stripDeclaratorPointer(rawDeclarator);

  const arrayMatch = /^([A-Za-z0-9_]+)\[(\d+)\]$/.exec(clean);
  const fieldName = arrayMatch ? arrayMatch[1] : clean;
  const arrayLength = arrayMatch ? arrayMatch[2] : undefined;

  const rawType = `${baseTypeString}${isPointer ? '*' : ''}`;
  let flintType = mapCTypeToFlint(rawType);
  if (arrayLength !== undefined) {
    flintType = `[${flintType}; ${arrayLength}]`;
  }

  return {
    name: fieldName,
    cType: rawType + (arrayLength ? `[${arrayLength}]` : ''),
    flintType,
    isPointer: isPointer || rawType.includes('*'),
    isConst: baseTypeString.includes('const'),
  };
}

/** Parses struct fields from a C struct body. */
// skipcq: JS-R1005
function parseStructFields(body: string): CStructField[] {
  const fields: CStructField[] = [];
  const fieldStatements = body
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of fieldStatements) {
    const commaParts = statement
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (commaParts.length === 0) continue;

    const firstTokens = commaParts[0].split(/\s+/);
    if (firstTokens.length < 2) continue;

    const firstDeclarator = firstTokens.pop();
    if (firstDeclarator === undefined) continue;
    const baseTypeString = firstTokens.join(' ');
    const declarators = [firstDeclarator, ...commaParts.slice(1)];

    for (const rawDeclarator of declarators) {
      fields.push(parseStructFieldDeclarator(baseTypeString, rawDeclarator));
    }
  }
  return fields;
}

/** Parses an individual regex match into a CStructDefinition. */
function parseSingleStruct(structMatch: RegExpExecArray): CStructDefinition {
  const structName = structMatch[1] ?? structMatch[3] ?? 'AnonymousStruct';
  const body = structMatch[2] ?? '';
  return {
    name: structName,
    fields: parseStructFields(body),
  };
}

/** Parses struct definitions from C header text. */
// skipcq: JS-R1005
function parseStructs(clean: string): CStructDefinition[] {
  const structs: CStructDefinition[] = [];
  const structRegex = /(?:typedef\s+)?struct\s+([A-Za-z0-9_]+)\s*\{([^}]*)\}\s*(?:([A-Za-z0-9_]+))?\s*;/g;
  let structMatch: RegExpExecArray | undefined;
  while ((structMatch = structRegex.exec(clean) ?? undefined) !== undefined) {
    structs.push(parseSingleStruct(structMatch));
  }
  return structs;
}

/** Parses a single parameter declaration from a C prototype parameter list. */
function parseSingleParameter(raw: string, index: number): CFunctionParameter {
  const parameterMatch = /^(.*?)(?:(?:\s+)|(?:\s*(\*+)\s*))([A-Za-z0-9_]+)$/.exec(raw);
  let parameterName: string;
  let rawType: string;
  if (parameterMatch) {
    const typeBase = parameterMatch[1]?.trim() ?? '';
    const typeStars = parameterMatch[2] ?? '';
    parameterName = parameterMatch[3];
    rawType = `${typeBase}${typeStars ? ` ${typeStars}` : ''}`.trim();
  } else {
    parameterName = `arg${index}`;
    rawType = raw;
  }
  const flintType = mapCTypeToFlint(rawType);
  return {
    name: parameterName,
    cType: rawType,
    flintType,
    isPointer: rawType.includes('*'),
    isConst: rawType.includes('const'),
  };
}

/** Parses function parameter list from C prototype parameter string. */
// skipcq: JS-R1005
function parseFunctionParameters(rawParameters: string): CFunctionParameter[] {
  if (rawParameters.length === 0 || rawParameters === 'void') return [];
  return rawParameters.split(',').map((p, index) => parseSingleParameter(p.trim(), index));
}

/** Parses a single function prototype declaration from matched regex groups. */
// skipcq: JS-R1005
function parseSinglePrototype(rawPrefix: string, rawParameters: string): CFunctionDefinition | undefined {
  if (rawPrefix.startsWith('typedef') || rawPrefix.startsWith('struct')) {
    return undefined;
  }
  const nameMatch = /^(.*?)(?:(?:\s+)|(?:\s*(\*+)\s*))([A-Za-z0-9_]+)$/.exec(rawPrefix);
  if (!nameMatch) {
    return undefined;
  }
  const returnBase = nameMatch[1]?.trim() ?? 'void';
  const returnStars = nameMatch[2] ?? '';
  const functionName = nameMatch[3];
  const rawReturn = `${returnBase}${returnStars ? ` ${returnStars}` : ''}`.trim();

  return {
    name: functionName,
    returnType: rawReturn,
    flintReturnType: mapCTypeToFlint(rawReturn),
    parameters: parseFunctionParameters(rawParameters),
  };
}

/** Parses function prototypes from C header text. */
// skipcq: JS-R1005
function parseFunctionPrototypes(clean: string): CFunctionDefinition[] {
  const functions: CFunctionDefinition[] = [];
  const functionRegex = /([^;{}]*?)\(([^)]*)\)\s*;/g;
  let functionMatch: RegExpExecArray | undefined;
  while ((functionMatch = functionRegex.exec(clean) ?? undefined) !== undefined) {
    const rawPrefix = functionMatch[1]?.trim() ?? '';
    const rawParameters = functionMatch[2]?.trim() ?? '';
    const parsed = parseSinglePrototype(rawPrefix, rawParameters);
    if (parsed !== undefined) {
      functions.push(parsed);
    }
  }
  return functions;
}

/**
 * Parses C struct definitions and function prototypes from C header or cbindgen text.
 *
 * @param source - C header source code.
 * @returns Structured CHeaderAst.
 */
export function parseCHeader(source: string): CHeaderAst {
  const constants = parseConstants(source);
  const clean = sanitizeCSource(source);
  return {
    constants,
    opaqueTypes: parseOpaqueTypes(clean),
    structs: parseStructs(clean),
    functions: parseFunctionPrototypes(clean),
  };
}

/** Formats C constants as Flint public constant declarations. */
// skipcq: JS-R1005
function renderFlintConstants(constants: readonly CConstantDefinition[] | undefined, lines: string[]): void {
  if (!constants || constants.length === 0) return;
  for (const constant of constants) {
    lines.push(`pub const ${constant.name}: ${constant.flintType} = ${constant.value};`);
  }
  lines.push('');
}

/** Formats C struct definitions into Flint AST `#[repr(C)] struct` declarations. */
function renderFlintStructs(structs: readonly CStructDefinition[], lines: string[]): void {
  for (const structDefinition of structs) {
    lines.push('#[repr(C)]', `struct ${structDefinition.name} {`);
    for (const field of structDefinition.fields) {
      lines.push(`  ${field.name}: ${field.flintType},`);
    }
    lines.push('}', '');
  }
}

/** Formats C function definitions into Flint foreign capability block declarations. */
function renderFlintFunctions(functions: readonly CFunctionDefinition[], library: string, lines: string[]): void {
  if (functions.length === 0) return;
  lines.push(`foreign "C" capability "${library}" {`);
  for (const function_ of functions) {
    const parameters = function_.parameters.map((p) => `${p.name}: ${p.flintType}`).join(', ');
    lines.push(`  fn ${function_.name}(${parameters}) -> ${function_.flintReturnType};`);
  }
  lines.push('}', '');
}

/**
 * Generates Flint source code containing `#[repr(C)] struct`, `opaque foreign type`,
 * and `foreign "C" capability` declarations from a CHeaderAst.
 *
 * @param ast - Parsed C header AST.
 * @param library - Foreign library name for capability binding.
 * @returns Formatted Flint source code string.
 */
// skipcq: JS-R1005
export function generateFlintFromC(ast: CHeaderAst, library: string): string {
  const lines: string[] = [
    '// Generated by flint-bindgen. DO NOT EDIT DIRECTLY.',
    '// Roadmap for typed macro metaprogramming tracked in GitHub Issue #101.',
    '',
  ];

  renderFlintConstants(ast.constants, lines);

  for (const opaque of ast.opaqueTypes) {
    lines.push(`opaque foreign type ${opaque};`, '');
  }

  renderFlintStructs(ast.structs, lines);
  renderFlintFunctions(ast.functions, library, lines);

  return `${lines.join('\n').trim()}\n`;
}

/**
 * Converts a parsed CHeaderAst into an in-memory FlintModule AST structure.
 *
 * @param ast - Parsed C header AST.
 * @param library - Foreign library identifier.
 * @param moduleName - Canonical logical module name.
 * @returns Fully constructed FlintModule.
 */
export function cHeaderToFlintModule(ast: CHeaderAst, library: string, moduleName = 'bindings'): FlintModule {
  const structs: FlintStructDeclaration[] = ast.structs.map((s) => ({
    kind: 'struct',
    name: s.name,
    repr: { kind: 'c' },
    genericParameters: [],
    fields: s.fields.map((f) => ({
      kind: 'struct-field' as const,
      name: f.name,
      type: parseTypeNameAst(f.flintType),
      span: emptySpan,
    })),
    immutable: true,
    span: emptySpan,
  }));

  const opaqueForeignTypes: FlintOpaqueForeignTypeDeclaration[] = ast.opaqueTypes.map((name) => ({
    kind: 'opaque-foreign-type',
    name,
    span: emptySpan,
  }));

  const foreignCapabilities: FlintForeignCapabilityDeclaration[] =
    ast.functions.length === 0
      ? []
      : [
          {
            kind: 'foreign-capability',
            abi: 'C',
            library,
            callingConvention: 'wasm-c-abi',
            memoryModel: 'shared',
            functions: ast.functions.map((function_): FlintForeignFunctionDeclaration => ({
              kind: 'foreign-function',
              name: function_.name,
              parameters: function_.parameters.map((p) => ({
                name: p.name,
                type: parseTypeNameAst(p.flintType),
                span: emptySpan,
              })),
              result: parseTypeNameAst(function_.flintReturnType),
              span: emptySpan,
            })),
            span: emptySpan,
          },
        ];

  return {
    kind: 'module',
    name: moduleName,
    imports: [],
    sourceImports: [],
    structs,
    enums: [],
    interfaces: [],
    functions: [],
    foreignCapabilities,
    opaqueForeignTypes,
    span: emptySpan,
  };
}

/**
 * Helper parsing a Flint type signature string into a FlintTypeName AST node.
 */
// skipcq: JS-R1005
function parseTypeNameAst(typeString: string): FlintTypeName {
  const arrayMatch = /^\[\s*(.*?)\s*;\s*(\d+)\s*\]$/.exec(typeString);
  if (arrayMatch) {
    return {
      kind: 'type-name',
      name: 'unit',
      reference: 'Array',
      arguments: [parseTypeNameAst(arrayMatch[1])],
      length: Number.parseInt(arrayMatch[2], 10),
      span: emptySpan,
    };
  }
  if (typeString.startsWith('CPtr<') && typeString.endsWith('>')) {
    const inner = typeString.slice(5, -1);
    return { kind: 'type-name' as const, name: 'CPtr' as never, arguments: [parseTypeNameAst(inner)], span: emptySpan };
  }
  if (typeString.startsWith('MutCPtr<') && typeString.endsWith('>')) {
    const inner = typeString.slice(8, -1);
    return {
      kind: 'type-name' as const,
      name: 'MutCPtr' as never,
      arguments: [parseTypeNameAst(inner)],
      span: emptySpan,
    };
  }
  return { kind: 'type-name' as const, name: typeString as never, span: emptySpan };
}

/** Maps a Flint constant type to its TypeScript equivalent representation. */
function mapConstantTsType(flintType: string): string {
  return flintType === 'string' ? 'string' : 'number';
}

/** Formats C constants as TypeScript declaration export statements. */
// skipcq: JS-R1005
function renderDtsConstants(constants: readonly CConstantDefinition[] | undefined, lines: string[]): void {
  if (!constants || constants.length === 0) return;
  for (const constant of constants) {
    const tsType = mapConstantTsType(constant.flintType);
    lines.push(`  export const ${constant.name}: ${tsType};`);
  }
  lines.push('');
}

/**
 * Generates TypeScript declaration file (.d.ts) matching C header bindings.
 *
 * @param ast - Parsed C header AST.
 * @param moduleName - Target module or library name.
 * @returns Rendered .d.ts content.
 */
// skipcq: JS-R1005
export function generateDtsFromC(ast: CHeaderAst, moduleName: string): string {
  const lines: string[] = [
    '// Generated by flint-bindgen TypeScript definition generator.',
    `export namespace ${moduleName} {`,
  ];

  renderDtsConstants(ast.constants, lines);

  for (const s of ast.structs) {
    lines.push(`  export interface ${s.name} {`);
    for (const f of s.fields) {
      const tsType = mapFlintToTsType(f.flintType);
      lines.push(`    readonly ${f.name}: ${tsType};`);
    }
    lines.push('  }', '');
  }

  for (const opaque of ast.opaqueTypes) {
    lines.push(`  export type ${opaque} = number;`, '');
  }

  lines.push('  export interface ForeignCapability {');
  for (const function_ of ast.functions) {
    const parameters = function_.parameters.map((p) => `${p.name}: ${mapFlintToTsType(p.flintType)}`).join(', ');
    lines.push(`    ${function_.name}(${parameters}): ${mapFlintToTsType(function_.flintReturnType)};`);
  }
  lines.push('  }', '}');

  return `${lines.join('\n').trim()}\n`;
}

/** FFI target runtime environments for host shim generation. */
export type FfiShimTarget = 'bun' | 'node' | 'universal';

/** Options for generating FFI host shims. */
export interface FfiHostShimOptions {
  readonly target?: FfiShimTarget;
  readonly targetAbi?: TargetPlatform;
}

/** Renders Node-API (koffi) FFI host shim. */
function generateNodeFfiShim(ast: CHeaderAst, libraryPath: string): string {
  const lines: string[] = [
    '// Generated by flint-bindgen Node FFI host shim generator.',
    "import { createRequire } from 'node:module';",
    'const require = createRequire(import.meta.url);',
    '',
    `export function openForeignLibrary(path = ${JSON.stringify(libraryPath)}) {`,
    "  const ffi = require('koffi');",
    '  const lib = ffi.load(path);',
    '  return {',
  ];
  for (const function_ of ast.functions) {
    lines.push(
      `    ${function_.name}: lib.func('${function_.name}', '${function_.returnType}', [${function_.parameters.map((p) => `'${p.cType}'`).join(', ')}]),`,
    );
  }
  lines.push('  };', '}', '');
  return `${lines.join('\n').trim()}\n`;
}

/** Renders universal FFI host shim supporting dynamic runtime detection. */
function generateUniversalFfiShim(ast: CHeaderAst, libraryPath: string, options: FfiHostShimOptions): string {
  const lines: string[] = [
    '// Generated by flint-bindgen universal FFI host shim generator.',
    `export async function openForeignLibrary(path = ${JSON.stringify(libraryPath)}) {`,
    "  if (typeof globalThis.Bun !== 'undefined') {",
    "    const { dlopen, FFIType } = await import('bun:ffi');",
    '    return dlopen(path, {',
  ];
  for (const function_ of ast.functions) {
    const arguments_ = function_.parameters.map((p) => mapFlintToFfiType(p.flintType, options.targetAbi));
    const returnValue = mapFlintToFfiType(function_.flintReturnType, options.targetAbi);
    lines.push(
      `      ${function_.name}: {`,
      `        args: [${arguments_.join(', ')}],`,
      `        returns: ${returnValue},`,
      '      },',
    );
  }
  lines.push(
    '    });',
    '  }',
    "  throw new Error('Native foreign FFI requires Bun or a compatible host runtime.');",
    '}',
    '',
  );
  return `${lines.join('\n').trim()}\n`;
}

/** Renders native Bun FFI host shim. */
function generateBunFfiShim(ast: CHeaderAst, libraryPath: string, options: FfiHostShimOptions): string {
  const lines: string[] = [
    '// Generated by flint-bindgen FFI host shim generator.',
    "import { dlopen, ptr, FFIType } from 'bun:ffi';",
    '',
    `export function openForeignLibrary(path = ${JSON.stringify(libraryPath)}) {`,
    '  return dlopen(path, {',
  ];

  for (const function_ of ast.functions) {
    const arguments_ = function_.parameters.map((p) => mapFlintToFfiType(p.flintType, options.targetAbi));
    const returnValue = mapFlintToFfiType(function_.flintReturnType, options.targetAbi);
    lines.push(
      `    ${function_.name}: {`,
      `      args: [${arguments_.join(', ')}],`,
      `      returns: ${returnValue},`,
      '    },',
    );
  }

  lines.push('  });', '}', '');
  return `${lines.join('\n').trim()}\n`;
}

/**
 * Generates zero-copy Node-API / bun:ffi / universal host shims for dynamic or native foreign execution.
 *
 * @param ast - Parsed C header AST.
 * @param libraryPath - Native shared library path (.so, .dylib, .dll).
 * @param options - Configuration options specifying the target runtime (default: 'bun').
 * @returns Rendered host JavaScript shim.
 */
// skipcq: JS-R1005
export function generateFfiHostShim(ast: CHeaderAst, libraryPath: string, options: FfiHostShimOptions = {}): string {
  const target = options.target ?? 'bun';
  if (target === 'node') {
    return generateNodeFfiShim(ast, libraryPath);
  }
  if (target === 'universal') {
    return generateUniversalFfiShim(ast, libraryPath, options);
  }
  return generateBunFfiShim(ast, libraryPath, options);
}

/**
 * End-to-end compilation of a C header string into Flint bindings, AST, .d.ts, and FFI shims.
 */
export function compileCHeader(
  source: string,
  library: string,
  libraryPath = `lib${library}.so`,
  options?: FfiHostShimOptions,
): {
  readonly ast: CHeaderAst;
  readonly flintBindings: string;
  readonly flintModule: FlintModule;
  readonly typeDeclarations: string;
  readonly hostShim: string;
} {
  const ast = parseCHeader(source);
  const flintBindings = generateFlintFromC(ast, library);
  const flintModule = cHeaderToFlintModule(ast, library);
  const typeDeclarations = generateDtsFromC(ast, library);
  const hostShim = generateFfiHostShim(ast, libraryPath, options);

  return { ast, flintBindings, flintModule, typeDeclarations, hostShim };
}

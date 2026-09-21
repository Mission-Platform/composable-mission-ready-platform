/**
 * Automated C and Rust cbindgen Header to Flint Foreign Binding Generator (flint-bindgen).
 * Parses C headers, Rust extern "C" prototypes, and struct layouts into Flint AST,
 * TypeScript declarations, and zero-copy FFI host shims.
 */

import type {
  FlintForeignCapabilityDeclaration,
  FlintForeignFunctionDeclaration,
  FlintModule,
  FlintOpaqueForeignTypeDeclaration,
  FlintStructDeclaration,
  FlintTypeName,
} from '../ast.js';
import type { FlintSourceSpan } from '../diagnostics.js';

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
}

const emptySpan: FlintSourceSpan = {
  start: 0,
  end: 0,
  line: 1,
  column: 1,
  endLine: 1,
  endColumn: 1,
};

const C_BASE_TYPE_MAP: Readonly<Record<string, string>> = {
  void: 'c_void',
  bool: 'bool',
  _Bool: 'bool',
  char: 'c_char',
  'unsigned char': 'u8',
  uint8_t: 'u8',
  u8: 'u8',
  'signed char': 'i8',
  int8_t: 'i8',
  i8: 'i8',
  short: 'c_short',
  'short int': 'c_short',
  int16_t: 'c_short',
  'unsigned short': 'c_ushort',
  uint16_t: 'c_ushort',
  int: 'c_int',
  'signed int': 'c_int',
  int32_t: 'c_int',
  'unsigned int': 'c_uint',
  uint32_t: 'c_uint',
  unsigned: 'c_uint',
  long: 'c_long',
  'long int': 'c_long',
  'unsigned long': 'c_ulong',
  'long long': 'c_longlong',
  int64_t: 'c_longlong',
  'unsigned long long': 'c_ulonglong',
  uint64_t: 'c_ulonglong',
  size_t: 'c_size',
  uintptr_t: 'c_size',
  ssize_t: 'c_ssize',
  intptr_t: 'c_ssize',
  float: 'c_float',
  double: 'c_double',
};

/**
 * Maps a C scalar or pointer type signature to a Flint type name.
 *
 * @param cType - Raw C type string (e.g. "const uint8_t*", "int32_t", "ScannerResult*").
 * @returns Flint type representation (e.g. "CPtr<u8>", "c_int", "MutCPtr<ScannerResult>").
 */
export function mapCTypeToFlint(cType: string): string {
  const trimmed = cType.trim().replace(/^struct\s+/, '');
  // Double pointer (e.g. sqlite3**, char**, void**)
  if (/\*{2,}$/.test(trimmed.replaceAll(/\s+/g, ''))) {
    return 'MutCPtr<COpaquePtr>';
  }

  const isConst = /^const\s+/.test(trimmed) || /\s+const(\s*\*)*$/.test(trimmed);
  const isPointer = trimmed.includes('*');
  const base = trimmed
    .replace(/\s*\*+$/, '')
    .replace(/^const\s+/, '')
    .replace(/\s+const$/, '')
    .trim();

  const flintBase = C_BASE_TYPE_MAP[base] ?? base;

  if (!isPointer) return flintBase;
  if (flintBase === 'c_void') return 'COpaquePtr';
  return isConst ? `CPtr<${flintBase}>` : `MutCPtr<${flintBase}>`;
}

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

/** Parses struct fields from a C struct body. */
function parseStructFields(body: string): CStructField[] {
  const fields: CStructField[] = [];
  const fieldStatements = body
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of fieldStatements) {
    const parts = statement.split(/\s+/);
    if (parts.length >= 2) {
      const fieldName = parts.pop();
      if (!fieldName) continue;
      let cleanFieldName = fieldName;
      let isPointer = false;
      if (cleanFieldName.startsWith('*')) {
        isPointer = true;
        cleanFieldName = cleanFieldName.slice(1);
      }
      const rawType = parts.join(' ') + (isPointer ? '*' : '');
      const flintType = mapCTypeToFlint(rawType);
      fields.push({
        name: cleanFieldName,
        cType: rawType,
        flintType,
        isPointer: rawType.includes('*'),
        isConst: rawType.includes('const'),
      });
    }
  }
  return fields;
}

/** Parses struct definitions from C header text. */
function parseStructs(clean: string): CStructDefinition[] {
  const structs: CStructDefinition[] = [];
  const structRegex = /(?:typedef\s+)?struct\s+([A-Za-z0-9_]+)\s*\{([^}]*)\}\s*(?:([A-Za-z0-9_]+))?\s*;/g;
  let structMatch: RegExpExecArray | undefined;
  while ((structMatch = structRegex.exec(clean) ?? undefined) !== undefined) {
    const structName = structMatch[1] ?? structMatch[3] ?? 'AnonymousStruct';
    const body = structMatch[2] ?? '';
    structs.push({
      name: structName,
      fields: parseStructFields(body),
    });
  }
  return structs;
}

/** Parses function parameter list from C prototype parameter string. */
function parseFunctionParameters(rawParameters: string): CFunctionParameter[] {
  const parameters: CFunctionParameter[] = [];
  if (rawParameters.length === 0 || rawParameters === 'void') return parameters;
  const parameterList = rawParameters.split(',').map((p) => p.trim());
  for (const [index, p] of parameterList.entries()) {
    const parameterMatch = /^(.*?)(?:(?:\s+)|(?:\s*(\*+)\s*))([A-Za-z0-9_]+)$/.exec(p);
    let parameterName: string;
    let rawType: string;
    if (parameterMatch) {
      const typeBase = parameterMatch[1]?.trim() ?? '';
      const typeStars = parameterMatch[2] ?? '';
      parameterName = parameterMatch[3];
      rawType = `${typeBase}${typeStars ? ` ${typeStars}` : ''}`.trim();
    } else {
      parameterName = `arg${index}`;
      rawType = p.trim();
    }
    const flintType = mapCTypeToFlint(rawType);
    parameters.push({
      name: parameterName,
      cType: rawType,
      flintType,
      isPointer: rawType.includes('*'),
      isConst: rawType.includes('const'),
    });
  }
  return parameters;
}

/** Parses function prototypes from C header text. */
function parseFunctionPrototypes(clean: string): CFunctionDefinition[] {
  const functions: CFunctionDefinition[] = [];
  const functionRegex = /([^;{}]*?)\(([^)]*)\)\s*;/g;
  let functionMatch: RegExpExecArray | undefined;
  while ((functionMatch = functionRegex.exec(clean) ?? undefined) !== undefined) {
    const rawPrefix = functionMatch[1]?.trim() ?? '';
    const rawParameters = functionMatch[2]?.trim() ?? '';

    // Ignore typedefs or struct declarations matched accidentally
    if (rawPrefix.startsWith('typedef') || rawPrefix.startsWith('struct')) continue;

    // The function name is the trailing identifier in rawPrefix
    const nameMatch = /^(.*?)(?:(?:\s+)|(?:\s*(\*+)\s*))([A-Za-z0-9_]+)$/.exec(rawPrefix);
    if (!nameMatch) continue;

    const returnBase = nameMatch[1]?.trim() ?? 'void';
    const returnStars = nameMatch[2] ?? '';
    const functionName = nameMatch[3];
    const rawReturn = `${returnBase}${returnStars ? ` ${returnStars}` : ''}`.trim();

    functions.push({
      name: functionName,
      returnType: rawReturn,
      flintReturnType: mapCTypeToFlint(rawReturn),
      parameters: parseFunctionParameters(rawParameters),
    });
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
  const clean = sanitizeCSource(source);
  return {
    opaqueTypes: parseOpaqueTypes(clean),
    structs: parseStructs(clean),
    functions: parseFunctionPrototypes(clean),
  };
}

function renderFlintStructs(structs: readonly CStructDefinition[], lines: string[]): void {
  for (const structDefinition of structs) {
    lines.push('#[repr(C)]', `c_struct ${structDefinition.name} {`);
    for (const field of structDefinition.fields) {
      lines.push(`  ${field.name}: ${field.flintType},`);
    }
    lines.push('}', '');
  }
}

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
 * Generates Flint source code containing `c_struct`, `opaque foreign type`,
 * and `foreign "C" capability` declarations from a CHeaderAst.
 *
 * @param ast - Parsed C header AST.
 * @param library - Foreign library name for capability binding.
 * @returns Formatted Flint source code string.
 */
export function generateFlintFromC(ast: CHeaderAst, library: string): string {
  const lines: string[] = [
    '// Generated by flint-bindgen. DO NOT EDIT DIRECTLY.',
    '// Roadmap for typed macro metaprogramming tracked in GitHub Issue #101.',
    '',
  ];

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
    c_struct: true,
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
function parseTypeNameAst(typeString: string): FlintTypeName {
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

/**
 * Generates TypeScript declaration file (.d.ts) matching C header bindings.
 *
 * @param ast - Parsed C header AST.
 * @param moduleName - Target module or library name.
 * @returns Rendered .d.ts content.
 */
export function generateDtsFromC(ast: CHeaderAst, moduleName: string): string {
  const lines: string[] = [
    '// Generated by flint-bindgen TypeScript definition generator.',
    `export namespace ${moduleName} {`,
  ];

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

const BIGINT_FLINT_TYPES = new Set(['c_longlong', 'c_ulonglong', 'i64', 'u64']);

/**
 * Maps a Flint type representation to its corresponding TypeScript type declaration string.
 *
 * @param flintType - Flint type representation name.
 * @returns TypeScript type string.
 */
function mapFlintToTsType(flintType: string): string {
  if (flintType === 'bool') return 'boolean';
  if (flintType === 'c_void' || flintType === 'unit') return 'void';
  if (BIGINT_FLINT_TYPES.has(flintType)) return 'bigint';
  return 'number';
}

/**
 * Generates zero-copy Node-API / bun:ffi host shims for dynamic or native foreign execution.
 *
 * @param ast - Parsed C header AST.
 * @param libraryPath - Native shared library path (.so, .dylib, .dll).
 * @returns Rendered host JavaScript shim.
 */
export function generateFfiHostShim(ast: CHeaderAst, libraryPath: string): string {
  const lines: string[] = [
    '// Generated by flint-bindgen FFI host shim generator.',
    "import { dlopen, ptr, FFIType } from 'bun:ffi';",
    '',
    `export function openForeignLibrary(path = ${JSON.stringify(libraryPath)}) {`,
    '  return dlopen(path, {',
  ];

  for (const function_ of ast.functions) {
    const arguments_ = function_.parameters.map((p) => mapFlintToFfiType(p.flintType));
    const returnValue = mapFlintToFfiType(function_.flintReturnType);
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

const FFI_TYPE_MAP: Readonly<Record<string, string>> = {
  c_void: 'FFIType.void',
  unit: 'FFIType.void',
  c_float: 'FFIType.f32',
  c_double: 'FFIType.f64',
  c_longlong: 'FFIType.i64',
  c_ulonglong: 'FFIType.i64',
  i64: 'FFIType.i64',
  u64: 'FFIType.i64',
};

/**
 * Maps a Flint type representation to its bun:ffi FFIType identifier.
 *
 * @param flintType - Flint type representation name.
 * @returns Corresponding bun:ffi FFIType string.
 */
function mapFlintToFfiType(flintType: string): string {
  if (flintType.startsWith('CPtr') || flintType.startsWith('MutCPtr') || flintType === 'COpaquePtr') {
    return 'FFIType.ptr';
  }
  return FFI_TYPE_MAP[flintType] ?? 'FFIType.i32';
}

/**
 * End-to-end compilation of a C header string into Flint bindings, AST, .d.ts, and FFI shims.
 */
export function compileCHeader(
  source: string,
  library: string,
  libraryPath = `lib${library}.so`,
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
  const hostShim = generateFfiHostShim(ast, libraryPath);

  return { ast, flintBindings, flintModule, typeDeclarations, hostShim };
}

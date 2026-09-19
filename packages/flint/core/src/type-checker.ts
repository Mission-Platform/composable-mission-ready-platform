import { createDiagnostic, type FlintDiagnostic, type FlintSourceSpan } from './diagnostics.js';
import { primitiveTypes } from './parser.js';
import { checkFlintSafety } from './safety.js';
import { FLINT_MEMORY_FUNCTIONS, type FlintMemoryFunction } from './stdlib/memory.js';
import { FLINT_REGEX_FUNCTIONS, type FlintStandardLibraryFunction } from './stdlib/regex.js';
import { FLINT_STRING_FUNCTIONS, type FlintStringFunction } from './stdlib/string.js';
import { TypeAlgebra, createTypeAlgebra } from './type-algebra.js';

import type {
  FlintExpression,
  FlintFunction,
  FlintModule,
  FlintParameter,
  FlintPrimitiveType,
  FlintStatement,
  FlintTypeName,
} from './ast.js';

/** Shared intern table for checker type keys within a process. */
const checkerAlgebra: TypeAlgebra = createTypeAlgebra();

/** Built-in generic type constructors recognized by the checker. */
const BUILT_IN_GENERIC_TYPES = new Set([
  'Array',
  'Vector',
  'Iterable',
  'Iterator',
  'Result',
  'Option',
  'iterResult',
  'Fn',
]);

/** Integer primitive type keys accepted for indexes and discriminants. */
const INTEGER_TYPES = new Set(['i32', 'u32']);

/** Numeric primitive type keys accepted by arithmetic operators. */
const NUMERIC_TYPES = new Set(['i32', 'i64', 'u32', 'u64', 'f32', 'f64']);

/** Arithmetic binary operators. */
const ARITHMETIC_OPERATORS = new Set(['+', '-', '*', '/', '%']);

/** Ordered comparison binary operators. */
const ORDERED_COMPARISON_OPERATORS = new Set(['<', '<=', '>', '>=']);

/** Equality binary operators. */
const EQUALITY_OPERATORS = new Set(['==', '!=']);

/**
 * Options controlling Flint type checking and ABI validation.
 */
export interface FlintTypeCheckOptions {
  /** Host-requested capability names that imported capabilities must match. */
  readonly requestedCapabilities?: readonly string[];
  /** When not false, every module function must be explicitly exported. */
  readonly requireExports?: boolean;
  /** Additional callable declarations supplied by linked external modules. */
  readonly externalFunctions?: readonly FlintFunction[];
}

/**
 * Result of running the Flint type checker over a module.
 */
export interface FlintTypeCheckResult {
  /** Diagnostics collected during checking, ordered by discovery. */
  readonly diagnostics: readonly FlintDiagnostic[];
  /** True when no diagnostic has severity `error`. */
  readonly valid: boolean;
}

/**
 * Callable signature used for both user functions and standard-library bindings.
 */
interface Callable {
  readonly parameters: readonly string[];
  readonly result: string;
  readonly standardLibrary?:
    FlintStandardLibraryFunction['operation'] | FlintStringFunction['operation'] | FlintMemoryFunction['operation'];
}

/** Supported collection receiver kinds for method contracts. */
type CollectionKind = 'Array' | 'Vector';

/** Parameter roles accepted by collection methods. */
type CollectionParameter = 'index' | 'element';

/**
 * Method contract describing a collection receiver's parameter and result shape.
 */
interface CollectionMethodContract {
  readonly receiver: CollectionKind;
  readonly parameters: readonly CollectionParameter[];
  readonly result: 'iterator' | 'length' | 'element-option' | 'receiver' | 'unit';
}

/**
 * Shared type-check environment threaded through statement and expression checking.
 */
interface TypeCheckEnvironment {
  readonly fileName: string;
  readonly diagnostics: FlintDiagnostic[];
  readonly callables: ReadonlyMap<string, Callable>;
  readonly enumValues: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly module: FlintModule;
}

const collectionMethods: ReadonlyMap<string, CollectionMethodContract> = new Map([
  ['Array.iter', { receiver: 'Array', parameters: [], result: 'iterator' }],
  ['Array.length', { receiver: 'Array', parameters: [], result: 'length' }],
  ['Array.get', { receiver: 'Array', parameters: ['index'], result: 'element-option' }],
  ['Array.set', { receiver: 'Array', parameters: ['index', 'element'], result: 'receiver' }],
  ['Vector.iter', { receiver: 'Vector', parameters: [], result: 'iterator' }],
  ['Vector.length', { receiver: 'Vector', parameters: [], result: 'length' }],
  ['Vector.get', { receiver: 'Vector', parameters: ['index'], result: 'element-option' }],
  ['Vector.set', { receiver: 'Vector', parameters: ['index', 'element'], result: 'receiver' }],
  ['Vector.push', { receiver: 'Vector', parameters: ['element'], result: 'receiver' }],
  ['Vector.add', { receiver: 'Vector', parameters: ['element'], result: 'receiver' }],
  ['Vector.pop', { receiver: 'Vector', parameters: [], result: 'element-option' }],
]);

const COLLECTION_METHOD_RESULTS: Readonly<
  Record<CollectionMethodContract['result'], (element: string, receiverType: string) => string>
> = {
  iterator: (element) => `Iterator<${element}>`,
  length: () => 'u32',
  'element-option': (element) => `Option<${element}>`,
  receiver: (_element, receiverType) => receiverType,
  unit: () => 'unit',
};

/**
 * Type-checks a Flint module, validating ABI, names, and body typing.
 *
 * @param module - Parsed module AST to check.
 * @param fileName - Logical source file name used in diagnostics.
 * @param options - Optional capability, export, and external-function constraints.
 * @returns Diagnostics and an overall validity flag.
 */
export function checkFlint(
  module: FlintModule,
  fileName = '<input>',
  options: FlintTypeCheckOptions = {},
): FlintTypeCheckResult {
  const diagnostics: FlintDiagnostic[] = [];
  const callables = createStandardLibraryCallables();
  const standardLibraryNames = new Set(callables.keys());
  const names = new Set<string>();

  registerExternalFunctions(callables, options.externalFunctions);
  const enumValues = buildEnumValueMap(module);

  checkSourceImports(module, fileName, diagnostics, standardLibraryNames, names);
  checkCapabilityImports(module, fileName, diagnostics, standardLibraryNames, names, callables, options);
  checkStructFieldTypes(module, fileName, diagnostics);
  checkEnumDeclarations(module, fileName, diagnostics);
  checkInterfaceDeclarations(module, fileName, diagnostics);
  registerModuleFunctions(module, fileName, diagnostics, standardLibraryNames, names, callables, options);

  for (const functionDeclaration of module.functions)
    checkFunction(functionDeclaration, callables, fileName, diagnostics, module, enumValues);

  checkFlintSafety(module, fileName, diagnostics);
  return { diagnostics, valid: diagnostics.every((diagnostic) => diagnostic.severity !== 'error') };
}

/**
 * Builds the initial callable map from standard-library declarations.
 *
 * @returns Mutable map of standard-library callables keyed by name.
 */
function createStandardLibraryCallables(): Map<string, Callable> {
  const standardLibraryFunctions = [...FLINT_REGEX_FUNCTIONS, ...FLINT_STRING_FUNCTIONS, ...FLINT_MEMORY_FUNCTIONS];
  return new Map(
    standardLibraryFunctions.map((declaration) => [
      declaration.name,
      {
        parameters: declaration.parameters,
        result: declaration.result,
        standardLibrary: declaration.operation,
      },
    ]),
  );
}

/**
 * Registers externally supplied function declarations into the callable table.
 *
 * @param callables - Mutable callable registry.
 * @param externalFunctions - Optional external function declarations.
 */
function registerExternalFunctions(
  callables: Map<string, Callable>,
  externalFunctions: readonly FlintFunction[] | undefined,
): void {
  for (const declaration of externalFunctions ?? [])
    callables.set(declaration.name, {
      parameters: declaration.parameters.map((parameter) => typeNameKey(parameter.type)),
      result: typeNameKey(declaration.result),
    });
}

/**
 * Builds a map from enum name to variant name/tag pairs.
 *
 * @param module - Module containing enum declarations.
 * @returns Enum discriminant lookup table.
 */
function buildEnumValueMap(module: FlintModule): Map<string, ReadonlyMap<string, number>> {
  return new Map(
    module.enums.map((declaration) => [
      declaration.name,
      new Map(declaration.variants.map(({ name, tag }) => [name, tag])),
    ]),
  );
}

/**
 * Validates source-module import aliases for collisions and reserved names.
 *
 * @param module - Module under check.
 * @param fileName - Source file name for diagnostics.
 * @param diagnostics - Accumulator for diagnostics.
 * @param standardLibraryNames - Reserved standard-library names.
 * @param names - Mutable set of declared top-level names.
 */
function checkSourceImports(
  module: FlintModule,
  fileName: string,
  diagnostics: FlintDiagnostic[],
  standardLibraryNames: ReadonlySet<string>,
  names: Set<string>,
): void {
  for (const imported of module.sourceImports) {
    if (standardLibraryNames.has(imported.alias))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'abi',
          'FLINT-ABI-005',
          `The name '${imported.alias}' is reserved by the Forge standard library.`,
          imported.span,
          'error',
          'Choose a different source-module alias.',
        ),
      );
    if (names.has(imported.alias))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'abi',
          'FLINT-ABI-004',
          `The name '${imported.alias}' is declared more than once.`,
          imported.span,
        ),
      );
    names.add(imported.alias);
  }
}

/**
 * Validates capability imports, registers them as callables, and checks parameter types.
 *
 * @param module - Module under check.
 * @param fileName - Source file name for diagnostics.
 * @param diagnostics - Accumulator for diagnostics.
 * @param standardLibraryNames - Reserved standard-library names.
 * @param names - Mutable set of declared top-level names.
 * @param callables - Mutable callable registry.
 * @param options - Type-check options including requested capabilities.
 */
function checkCapabilityImports(
  module: FlintModule,
  fileName: string,
  diagnostics: FlintDiagnostic[],
  standardLibraryNames: ReadonlySet<string>,
  names: Set<string>,
  callables: Map<string, Callable>,
  options: FlintTypeCheckOptions,
): void {
  for (const imported of module.imports) {
    if (standardLibraryNames.has(imported.alias))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'abi',
          'FLINT-ABI-005',
          `The name '${imported.alias}' is reserved by the Forge standard library.`,
          imported.span,
          'error',
          'Choose a different capability alias.',
        ),
      );
    if (names.has(imported.alias))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'abi',
          'FLINT-ABI-001',
          `The name '${imported.alias}' is declared more than once.`,
          imported.span,
        ),
      );
    names.add(imported.alias);
    if (options.requestedCapabilities !== undefined && !options.requestedCapabilities.includes(imported.capability))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'abi',
          'FLINT-ABI-002',
          `Capability '${imported.capability}' was not requested by the host.`,
          imported.span,
          'error',
          'Add the capability to requestedCapabilities or remove this import.',
        ),
      );
    callables.set(imported.alias, {
      parameters: imported.parameters.map((parameter) => typeNameKey(parameter.type)),
      result: typeNameKey(imported.result),
    });
    validateType(imported.result, fileName, diagnostics, module);
    for (const parameter of imported.parameters) validateType(parameter.type, fileName, diagnostics, module);
  }
}

/**
 * Validates field types on all struct declarations.
 *
 * @param module - Module under check.
 * @param fileName - Source file name for diagnostics.
 * @param diagnostics - Accumulator for diagnostics.
 */
function checkStructFieldTypes(module: FlintModule, fileName: string, diagnostics: FlintDiagnostic[]): void {
  for (const declaration of module.structs)
    for (const field of declaration.fields)
      validateType(
        field.type,
        fileName,
        diagnostics,
        module,
        declaration.genericParameters.map(({ name }) => name),
      );
}

/**
 * Validates enum variant uniqueness, discriminant ranges, and field types.
 *
 * @param module - Module under check.
 * @param fileName - Source file name for diagnostics.
 * @param diagnostics - Accumulator for diagnostics.
 */
function checkEnumDeclarations(module: FlintModule, fileName: string, diagnostics: FlintDiagnostic[]): void {
  for (const declaration of module.enums) {
    checkEnumVariants(declaration, fileName, diagnostics);
    for (const variant of declaration.variants)
      for (const field of variant.fields)
        validateType(
          field.type,
          fileName,
          diagnostics,
          module,
          declaration.genericParameters.map(({ name }) => name),
        );
  }
}

/**
 * Validates a single enum's variant names and discriminant tags.
 *
 * @param declaration - Enum declaration AST node.
 * @param fileName - Source file name for diagnostics.
 * @param diagnostics - Accumulator for diagnostics.
 */
function checkEnumVariants(
  declaration: FlintModule['enums'][number],
  fileName: string,
  diagnostics: FlintDiagnostic[],
): void {
  const tags = new Set<number>();
  const variantNames = new Set<string>();
  for (const variant of declaration.variants) {
    if (variantNames.has(variant.name))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'type-check',
          'FLINT-TYPE-001',
          `Enum '${declaration.name}' declares variant '${variant.name}' more than once.`,
          variant.span,
        ),
      );
    variantNames.add(variant.name);
    if (!Number.isSafeInteger(variant.tag) || variant.tag < -2_147_483_648 || variant.tag > 2_147_483_647)
      diagnostics.push(
        createDiagnostic(
          fileName,
          'type-check',
          'FLINT-TYPE-013',
          `Enum '${declaration.name}' discriminant '${variant.tag}' is outside the signed i32 range.`,
          variant.span,
        ),
      );
    if (tags.has(variant.tag))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'type-check',
          'FLINT-TYPE-014',
          `Enum '${declaration.name}' has duplicate discriminant '${variant.tag}'.`,
          variant.span,
        ),
      );
    tags.add(variant.tag);
  }
}

/**
 * Validates interface method signatures and generic bounds.
 *
 * @param module - Module under check.
 * @param fileName - Source file name for diagnostics.
 * @param diagnostics - Accumulator for diagnostics.
 */
function checkInterfaceDeclarations(module: FlintModule, fileName: string, diagnostics: FlintDiagnostic[]): void {
  for (const declaration of module.interfaces)
    for (const required of declaration.functions) {
      const genericNames = [...declaration.genericParameters, ...required.genericParameters].map(({ name }) => name);
      validateType(required.result, fileName, diagnostics, module, genericNames);
      for (const parameter of required.parameters)
        validateType(parameter.type, fileName, diagnostics, module, genericNames);
      for (const bound of required.genericParameters.flatMap(({ bounds }) => bounds))
        if (!module.interfaces.some(({ name }) => name === bound))
          diagnostics.push(
            createDiagnostic(
              fileName,
              'type-check',
              'FLINT-TYPE-007',
              `Unknown interface bound '${bound}'.`,
              required.span,
            ),
          );
    }
}

/**
 * Registers module functions as callables and validates names, exports, and signatures.
 *
 * @param module - Module under check.
 * @param fileName - Source file name for diagnostics.
 * @param diagnostics - Accumulator for diagnostics.
 * @param standardLibraryNames - Reserved standard-library names.
 * @param names - Mutable set of declared top-level names.
 * @param callables - Mutable callable registry.
 * @param options - Type-check options including export requirements.
 */
function registerModuleFunctions(
  module: FlintModule,
  fileName: string,
  diagnostics: FlintDiagnostic[],
  standardLibraryNames: ReadonlySet<string>,
  names: Set<string>,
  callables: Map<string, Callable>,
  options: FlintTypeCheckOptions,
): void {
  for (const functionDeclaration of module.functions) {
    if (standardLibraryNames.has(functionDeclaration.name))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'abi',
          'FLINT-ABI-005',
          `The name '${functionDeclaration.name}' is reserved by the Forge standard library.`,
          functionDeclaration.span,
          'error',
          'Choose a different function name.',
        ),
      );
    if (names.has(functionDeclaration.name))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'type-check',
          'FLINT-TYPE-001',
          `The name '${functionDeclaration.name}' is declared more than once.`,
          functionDeclaration.span,
        ),
      );
    names.add(functionDeclaration.name);
    if (options.requireExports !== false && !functionDeclaration.exported)
      diagnostics.push(
        createDiagnostic(
          fileName,
          'abi',
          'FLINT-ABI-003',
          `Function '${functionDeclaration.name}' must be explicitly exported.`,
          functionDeclaration.span,
          'error',
          "Prefix the declaration with 'export'.",
        ),
      );
    const genericNames = functionDeclaration.genericParameters.map(({ name }) => name);
    for (const parameter of functionDeclaration.parameters)
      validateType(parameter.type, fileName, diagnostics, module, genericNames);
    validateType(functionDeclaration.result, fileName, diagnostics, module, genericNames);
    callables.set(functionDeclaration.name, {
      parameters: functionDeclaration.parameters.map((parameter) => typeNameKey(parameter.type)),
      result: typeNameKey(functionDeclaration.result),
    });
    if (functionDeclaration.iterable && !isIteratorLike(typeNameKey(functionDeclaration.result)))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'type-check',
          'FLINT-TYPE-009',
          `Iterator function '${functionDeclaration.name}' must return Iterable<T> or Iterator<T>.`,
          functionDeclaration.result.span,
          'error',
          'Declare the result as Iterator<T> and yield values of type T.',
        ),
      );
  }
}

/**
 * Type-checks a single function body against its declared parameter and result types.
 *
 * @param functionDeclaration - Function AST node to check.
 * @param callables - Known callable signatures.
 * @param fileName - Source file name for diagnostics.
 * @param diagnostics - Accumulator for diagnostics.
 * @param module - Enclosing module AST.
 * @param enumValues - Enum discriminant lookup table.
 */
function checkFunction(
  functionDeclaration: FlintFunction,
  callables: ReadonlyMap<string, Callable>,
  fileName: string,
  diagnostics: FlintDiagnostic[],
  module: FlintModule,
  enumValues: ReadonlyMap<string, ReadonlyMap<string, number>>,
): void {
  const locals = new Map(
    functionDeclaration.parameters.map((parameter) => [parameter.name, typeNameKey(parameter.type)]),
  );
  const environment: TypeCheckEnvironment = {
    fileName,
    diagnostics,
    callables,
    enumValues,
    module,
  };
  const genericNames = functionDeclaration.genericParameters.map(({ name }) => name);
  for (const statement of functionDeclaration.body)
    checkStatement(
      statement,
      typeNameKey(functionDeclaration.result),
      functionDeclaration.iterable === true,
      locals,
      environment,
      genericNames,
    );
}

/**
 * Dispatches statement type checking by statement kind.
 *
 * @param statement - Statement AST node.
 * @param result - Expected function result type key.
 * @param iterable - Whether the enclosing function is an iterator.
 * @param locals - Mutable local variable type map.
 * @param environment - Shared type-check environment.
 * @param genericNames - In-scope generic parameter names.
 */
function checkStatement(
  statement: FlintStatement,
  result: string,
  iterable: boolean,
  locals: Map<string, string>,
  environment: TypeCheckEnvironment,
  genericNames: readonly string[],
): void {
  const context: StatementCheckContext = { result, iterable, locals, environment, genericNames };
  if (checkBindingStatement(statement, context)) return;
  if (checkBranchingStatement(statement, context)) return;
  if (checkIterationStatement(statement, context)) return;
  if (statement.kind === 'expression-statement') inferExpression(statement.expression, locals, environment);
}

/** Shared arguments for statement-kind handlers. */
interface StatementCheckContext {
  readonly result: string;
  readonly iterable: boolean;
  readonly locals: Map<string, string>;
  readonly environment: TypeCheckEnvironment;
  readonly genericNames: readonly string[];
}

/**
 * Handles let, assignment, return, match-statement, and yield kinds.
 *
 * @param statement - Statement AST node.
 * @param context - Shared statement-check context.
 * @returns True when the statement kind was handled.
 */
function checkBindingStatement(statement: FlintStatement, context: StatementCheckContext): boolean {
  const { result, iterable, locals, environment, genericNames } = context;
  if (statement.kind === 'let') {
    checkLetStatement(statement, locals, environment, genericNames);
    return true;
  }
  if (statement.kind === 'assignment') {
    checkAssignmentStatement(statement, locals, environment);
    return true;
  }
  if (statement.kind === 'return') {
    checkReturnStatement(statement, result, locals, environment);
    return true;
  }
  if (statement.kind === 'match-statement') {
    checkMatchStatement(statement, locals, environment);
    return true;
  }
  if (statement.kind === 'yield') {
    checkYieldStatement(statement, result, iterable, locals, environment);
    return true;
  }
  return false;
}

/**
 * Handles if and switch kinds.
 *
 * @param statement - Statement AST node.
 * @param context - Shared statement-check context.
 * @returns True when the statement kind was handled.
 */
function checkBranchingStatement(statement: FlintStatement, context: StatementCheckContext): boolean {
  const { result, iterable, locals, environment, genericNames } = context;
  if (statement.kind === 'if') {
    checkIfStatement(statement, result, iterable, locals, environment, genericNames);
    return true;
  }
  if (statement.kind === 'switch') {
    checkSwitchStatement(statement, result, iterable, locals, environment, genericNames);
    return true;
  }
  return false;
}

/**
 * Handles while, do-while, and iterator-loop kinds.
 *
 * @param statement - Statement AST node.
 * @param context - Shared statement-check context.
 * @returns True when the statement kind was handled.
 */
function checkIterationStatement(statement: FlintStatement, context: StatementCheckContext): boolean {
  const { result, iterable, locals, environment, genericNames } = context;
  if (statement.kind === 'while' || statement.kind === 'do-while') {
    checkLoopStatement(statement, result, iterable, locals, environment, genericNames);
    return true;
  }
  if (statement.kind === 'iterator-loop') {
    checkIteratorLoopStatement(statement, result, iterable, locals, environment, genericNames);
    return true;
  }
  return false;
}

/**
 * Type-checks a let binding, validating uniqueness and value/type agreement.
 *
 * @param statement - Let statement node.
 * @param locals - Mutable local variable type map.
 * @param environment - Shared type-check environment.
 * @param genericNames - In-scope generic parameter names.
 */
function checkLetStatement(
  statement: Extract<FlintStatement, { kind: 'let' }>,
  locals: Map<string, string>,
  environment: TypeCheckEnvironment,
  genericNames: readonly string[],
): void {
  const { fileName, diagnostics, callables } = environment;
  const isDuplicate = locals.has(statement.name) || callables.has(statement.name);
  if (isDuplicate)
    diagnostics.push(
      createDiagnostic(
        fileName,
        'type-check',
        'FLINT-TYPE-006',
        `Local '${statement.name}' is declared more than once in this scope.`,
        statement.span,
      ),
    );
  validateType(statement.type, fileName, diagnostics, environment.module, genericNames);
  const declaredType = typeNameKey(statement.type);
  const valueType = inferExpression(statement.value, locals, environment, declaredType);
  if (valueType !== declaredType)
    mismatch(
      statement.span,
      fileName,
      diagnostics,
      `Local '${statement.name}' has type '${declaredType}' but its value has type '${valueType}'.`,
    );
  if (!isDuplicate) locals.set(statement.name, declaredType);
}

/**
 * Type-checks an assignment, including optional collection index writes.
 *
 * @param statement - Assignment statement node.
 * @param locals - Mutable local variable type map.
 * @param environment - Shared type-check environment.
 */
function checkAssignmentStatement(
  statement: Extract<FlintStatement, { kind: 'assignment' }>,
  locals: Map<string, string>,
  environment: TypeCheckEnvironment,
): void {
  const { fileName, diagnostics } = environment;
  const localType = locals.get(statement.name);
  const valueType = inferExpression(statement.value, locals, environment);
  if (localType === undefined) {
    diagnostics.push(
      createDiagnostic(fileName, 'type-check', 'FLINT-TYPE-002', `Unknown value '${statement.name}'.`, statement.span),
    );
    return;
  }
  if (statement.index !== undefined) {
    checkIndexedAssignment(statement, localType, valueType, locals, environment);
    return;
  }
  if (valueType !== localType)
    mismatch(
      statement.span,
      fileName,
      diagnostics,
      `Local '${statement.name}' has type '${localType}' but its assigned value has type '${valueType}'.`,
    );
}

/**
 * Type-checks an indexed assignment into an Array or Vector local.
 *
 * @param statement - Assignment statement with an index expression.
 * @param localType - Declared type key of the target local.
 * @param valueType - Inferred type key of the assigned value.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 */
function checkIndexedAssignment(
  statement: Extract<FlintStatement, { kind: 'assignment' }>,
  localType: string,
  valueType: string,
  locals: Map<string, string>,
  environment: TypeCheckEnvironment,
): void {
  const { fileName, diagnostics } = environment;
  const indexExpression = statement.index;
  if (indexExpression === undefined) return;

  const indexType = inferExpression(indexExpression, locals, environment);
  if (!INTEGER_TYPES.has(indexType))
    mismatch(indexExpression.span, fileName, diagnostics, 'Collection indexes must have integer type.');

  if (!localType.startsWith('Array<') && !localType.startsWith('Vector<')) {
    mismatch(statement.span, fileName, diagnostics, `Value '${statement.name}' is not indexable.`);
    return;
  }

  reportFixedArrayIndexOutOfBounds(localType, indexExpression, fileName, diagnostics);
  const element = elementType(localType);
  if (valueType !== element)
    mismatch(
      statement.span,
      fileName,
      diagnostics,
      `Indexed value has type '${valueType}' but the collection element has type '${element}'.`,
    );
}

/**
 * Reports a diagnostic when a literal index is outside a fixed Array bound.
 *
 * @param localType - Collection type key of the assignment target.
 * @param indexExpression - Index expression being assigned through.
 * @param fileName - Source file name for diagnostics.
 * @param diagnostics - Accumulator for diagnostics.
 */
function reportFixedArrayIndexOutOfBounds(
  localType: string,
  indexExpression: FlintExpression,
  fileName: string,
  diagnostics: FlintDiagnostic[],
): void {
  if (!localType.startsWith('Array<')) return;
  if (indexExpression.kind !== 'literal' || typeof indexExpression.value !== 'number') return;
  const bound = /\[(\d+)\]$/.exec(localType)?.[1];
  if (bound === undefined) return;
  const fixedBound = Number(bound);
  if (indexExpression.value >= 0 && indexExpression.value < fixedBound) return;
  diagnostics.push(
    createDiagnostic(
      fileName,
      'type-check',
      'FLINT-TYPE-017',
      `Array index ${indexExpression.value} is outside the fixed bound ${fixedBound}.`,
      indexExpression.span,
    ),
  );
}

/**
 * Type-checks a return statement against the enclosing function result type.
 *
 * @param statement - Return statement node.
 * @param result - Expected function result type key.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 */
function checkReturnStatement(
  statement: Extract<FlintStatement, { kind: 'return' }>,
  result: string,
  locals: Map<string, string>,
  environment: TypeCheckEnvironment,
): void {
  const valueType =
    statement.value === undefined ? 'unit' : inferExpression(statement.value, locals, environment, result);
  if (valueType !== result)
    mismatch(
      statement.span,
      environment.fileName,
      environment.diagnostics,
      `This function returns '${result}', but the return statement has type '${valueType}'.`,
    );
}

/**
 * Type-checks an if statement and its branched bodies.
 *
 * @param statement - If statement node.
 * @param result - Expected function result type key.
 * @param iterable - Whether the enclosing function is an iterator.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @param genericNames - In-scope generic parameter names.
 */
function checkIfStatement(
  statement: Extract<FlintStatement, { kind: 'if' }>,
  result: string,
  iterable: boolean,
  locals: Map<string, string>,
  environment: TypeCheckEnvironment,
  genericNames: readonly string[],
): void {
  if (inferExpression(statement.condition, locals, environment) !== 'bool')
    mismatch(
      statement.condition.span,
      environment.fileName,
      environment.diagnostics,
      'An if condition must have type bool.',
    );
  checkNestedStatements(statement.consequent, result, iterable, locals, environment, genericNames);
  if (statement.alternate)
    checkNestedStatements(statement.alternate, result, iterable, locals, environment, genericNames);
}

/**
 * Type-checks a switch statement, its cases, and optional default arm.
 *
 * @param statement - Switch statement node.
 * @param result - Expected function result type key.
 * @param iterable - Whether the enclosing function is an iterator.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @param genericNames - In-scope generic parameter names.
 */
function checkSwitchStatement(
  statement: Extract<FlintStatement, { kind: 'switch' }>,
  result: string,
  iterable: boolean,
  locals: Map<string, string>,
  environment: TypeCheckEnvironment,
  genericNames: readonly string[],
): void {
  const { fileName, diagnostics, enumValues } = environment;
  const discriminant = inferExpression(statement.value, locals, environment);
  const enumCases = enumValues.get(discriminant);
  if (!INTEGER_TYPES.has(discriminant) && enumCases === undefined)
    diagnostics.push(
      createDiagnostic(
        fileName,
        'type-check',
        'FLINT-TYPE-018',
        `Switch discriminants must be integer or integer-enum values, not '${discriminant}'.`,
        statement.value.span,
      ),
    );

  const seen = new Set<number>();
  for (const arm of statement.cases) {
    checkSwitchArmTag(arm, discriminant, enumCases, seen, fileName, diagnostics);
    checkNestedStatements(arm.body, result, iterable, locals, environment, genericNames);
  }
  if (statement.defaultCase !== undefined)
    checkNestedStatements(statement.defaultCase, result, iterable, locals, environment, genericNames);
}

/**
 * Validates a single switch case tag for uniqueness and range.
 *
 * @param arm - Switch case arm.
 * @param discriminant - Inferred discriminant type key.
 * @param enumCases - Optional enum variant tag map for the discriminant.
 * @param seen - Mutable set of already-seen numeric tags.
 * @param fileName - Source file name for diagnostics.
 * @param diagnostics - Accumulator for diagnostics.
 */
function checkSwitchArmTag(
  arm: Extract<FlintStatement, { kind: 'switch' }>['cases'][number],
  discriminant: string,
  enumCases: ReadonlyMap<string, number> | undefined,
  seen: Set<number>,
  fileName: string,
  diagnostics: FlintDiagnostic[],
): void {
  const tag = typeof arm.value === 'number' ? arm.value : enumCases?.get(arm.value);
  if (tag === undefined) {
    diagnostics.push(
      createDiagnostic(
        fileName,
        'type-check',
        'FLINT-TYPE-015',
        `Unknown switch case '${arm.value}' for discriminant '${discriminant}'.`,
        arm.span,
      ),
    );
    return;
  }
  if (seen.has(tag)) {
    diagnostics.push(
      createDiagnostic(fileName, 'type-check', 'FLINT-TYPE-016', `Duplicate switch case '${arm.value}'.`, arm.span),
    );
    return;
  }
  if (discriminant === 'i32' && (tag < -2_147_483_648 || tag > 2_147_483_647))
    diagnostics.push(
      createDiagnostic(
        fileName,
        'type-check',
        'FLINT-TYPE-019',
        `Switch case '${tag}' is outside the signed i32 range.`,
        arm.span,
      ),
    );
  seen.add(tag);
}

/**
 * Type-checks while and do-while loops.
 *
 * @param statement - Loop statement node.
 * @param result - Expected function result type key.
 * @param iterable - Whether the enclosing function is an iterator.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @param genericNames - In-scope generic parameter names.
 */
function checkLoopStatement(
  statement: Extract<FlintStatement, { kind: 'while' | 'do-while' }>,
  result: string,
  iterable: boolean,
  locals: Map<string, string>,
  environment: TypeCheckEnvironment,
  genericNames: readonly string[],
): void {
  if (inferExpression(statement.condition, locals, environment) !== 'bool')
    mismatch(
      statement.condition.span,
      environment.fileName,
      environment.diagnostics,
      `A ${statement.kind} condition must have type bool.`,
    );
  checkNestedStatements(statement.body, result, iterable, locals, environment, genericNames);
}

/**
 * Type-checks a match statement by reusing expression-level match inference.
 *
 * @param statement - Match statement node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 */
function checkMatchStatement(
  statement: Extract<FlintStatement, { kind: 'match-statement' }>,
  locals: Map<string, string>,
  environment: TypeCheckEnvironment,
): void {
  inferExpression(
    { kind: 'match', value: statement.value, arms: statement.arms, span: statement.span },
    locals,
    environment,
  );
}

/**
 * Type-checks a yield statement inside an iterator function.
 *
 * @param statement - Yield statement node.
 * @param result - Expected function result type key.
 * @param iterable - Whether the enclosing function is an iterator.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 */
function checkYieldStatement(
  statement: Extract<FlintStatement, { kind: 'yield' }>,
  result: string,
  iterable: boolean,
  locals: Map<string, string>,
  environment: TypeCheckEnvironment,
): void {
  const { fileName, diagnostics } = environment;
  const valueType = inferExpression(statement.value, locals, environment);
  if (!iterable) {
    diagnostics.push(
      createDiagnostic(
        fileName,
        'type-check',
        'FLINT-TYPE-011',
        'Yield is only valid inside an iterator function.',
        statement.span,
        'error',
        'Prefix the function with iter and return Iterator<T>.',
      ),
    );
    return;
  }
  if (elementType(result) !== valueType)
    mismatch(
      statement.value.span,
      fileName,
      diagnostics,
      `Yielded value has type '${valueType}', expected '${elementType(result)}'.`,
    );
}

/**
 * Type-checks an iterator-for loop and binds the loop variable.
 *
 * @param statement - Iterator-loop statement node.
 * @param result - Expected function result type key.
 * @param iterable - Whether the enclosing function is an iterator.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @param genericNames - In-scope generic parameter names.
 */
function checkIteratorLoopStatement(
  statement: Extract<FlintStatement, { kind: 'iterator-loop' }>,
  result: string,
  iterable: boolean,
  locals: Map<string, string>,
  environment: TypeCheckEnvironment,
  genericNames: readonly string[],
): void {
  const iteratorType = inferExpression(statement.iterator, locals, environment);
  const nextValue = isOptionType(iteratorType) ? elementType(iteratorType) : undefined;
  const iterableValue = isIteratorLike(iteratorType) ? elementType(iteratorType) : undefined;
  if (nextValue === undefined && iterableValue === undefined)
    mismatch(
      statement.iterator.span,
      environment.fileName,
      environment.diagnostics,
      'Iterator loops require value.next() -> Option<T> or an Iterable<T>.',
    );
  const bodyLocals = new Map(locals);
  bodyLocals.set(statement.binding, nextValue ?? iterableValue ?? 'unit');
  for (const nested of statement.body) checkStatement(nested, result, iterable, bodyLocals, environment, genericNames);
}

/**
 * Type-checks nested statements under a cloned local scope.
 *
 * @param statements - Nested statement list.
 * @param result - Expected function result type key.
 * @param iterable - Whether the enclosing function is an iterator.
 * @param locals - Parent local variable type map.
 * @param environment - Shared type-check environment.
 * @param genericNames - In-scope generic parameter names.
 */
function checkNestedStatements(
  statements: readonly FlintStatement[],
  result: string,
  iterable: boolean,
  locals: Map<string, string>,
  environment: TypeCheckEnvironment,
  genericNames: readonly string[],
): void {
  const nestedLocals = new Map(locals);
  for (const nested of statements) checkStatement(nested, result, iterable, nestedLocals, environment, genericNames);
}

/**
 * Infers the type key of an expression, emitting diagnostics for mismatches.
 *
 * @param expression - Expression AST node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @param expectedType - Optional expected type used for literal widening and checks.
 * @returns Inferred type key string.
 */
function inferExpression(
  expression: FlintExpression,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
  expectedType?: string,
): string {
  const primary = inferPrimaryExpression(expression, locals, environment, expectedType);
  if (primary !== undefined) return primary;
  const composite = inferCompositeExpression(expression, locals, environment, expectedType);
  if (composite !== undefined) return composite;
  return 'unit';
}

/**
 * Infers types for literal, identifier, call, and function-value expressions.
 *
 * @param expression - Expression AST node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @param expectedType - Optional expected type key.
 * @returns Inferred type key, or undefined when not a primary expression kind.
 */
function inferPrimaryExpression(
  expression: FlintExpression,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
  expectedType?: string,
): string | undefined {
  if (expression.kind === 'literal') return inferLiteralExpression(expression, expectedType);
  if (expression.kind === 'identifier') return inferIdentifierExpression(expression, locals, environment);
  if (expression.kind === 'call') return inferCallExpression(expression, locals, environment);
  if (expression.kind === 'function-value') return inferFunctionValueExpression(expression, environment, expectedType);
  return undefined;
}

/**
 * Infers types for aggregate, match, and operator expressions.
 *
 * @param expression - Expression AST node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @param expectedType - Optional expected type key.
 * @returns Inferred type key, or undefined when not a composite expression kind.
 */
function inferCompositeExpression(
  expression: FlintExpression,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
  expectedType?: string,
): string | undefined {
  if (expression.kind === 'struct-value') return inferStructValueExpression(expression, locals, environment);
  if (expression.kind === 'enum-value') return inferEnumValueExpression(expression, locals, environment, expectedType);
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal')
    return inferCollectionLiteralExpression(expression, locals, environment, expectedType);
  if (expression.kind === 'index') return inferIndexExpression(expression, locals, environment);
  if (expression.kind === 'match') return inferMatchExpression(expression, locals, environment);
  if (expression.kind === 'unary') return inferUnaryExpression(expression, locals, environment);
  if (expression.kind === 'binary') return inferBinaryExpression(expression, locals, environment);
  return undefined;
}

/**
 * Infers the type of a literal expression, optionally widening integer literals.
 *
 * @param expression - Literal expression node.
 * @param expectedType - Optional expected numeric type for widening.
 * @returns Inferred type key.
 */
function inferLiteralExpression(
  expression: Extract<FlintExpression, { kind: 'literal' }>,
  expectedType?: string,
): string {
  if (
    expectedType !== undefined &&
    ['i32', 'u32', 'i64', 'u64'].includes(expectedType) &&
    expression.type === 'i32' &&
    typeof expression.value === 'number' &&
    Number.isInteger(expression.value) &&
    (expectedType[0] !== 'u' || expression.value >= 0)
  )
    return expectedType;
  return expression.type;
}

/**
 * Infers the type of an identifier expression from locals.
 *
 * @param expression - Identifier expression node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @returns Inferred type key, or `unit` when unknown.
 */
function inferIdentifierExpression(
  expression: Extract<FlintExpression, { kind: 'identifier' }>,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
): string {
  const type = locals.get(expression.name);
  if (type === undefined) {
    environment.diagnostics.push(
      createDiagnostic(
        environment.fileName,
        'type-check',
        'FLINT-TYPE-002',
        `Unknown value '${expression.name}'.`,
        expression.span,
      ),
    );
    return 'unit';
  }
  return type;
}

/**
 * Infers the result type of a call expression, including collection methods.
 *
 * @param expression - Call expression node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @returns Inferred result type key.
 */
function inferCallExpression(
  expression: Extract<FlintExpression, { kind: 'call' }>,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
): string {
  if (expression.callee.endsWith('.next') && expression.arguments.length === 0) {
    const receiver = expression.callee.slice(0, -'.next'.length);
    const receiverType = memberReceiverType(receiver, locals, environment.callables);
    if (receiverType !== undefined && isIteratorLike(receiverType)) return `Option<${elementType(receiverType)}>`;
  }

  const methodResult = inferCollectionMethodCall(expression, locals, environment);
  if (methodResult !== undefined) return methodResult;

  return inferOrdinaryCall(expression, locals, environment);
}

/**
 * Infers a collection method call when the callee matches a known contract.
 *
 * @param expression - Call expression node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @returns Result type key, or undefined when not a collection method call.
 */
function inferCollectionMethodCall(
  expression: Extract<FlintExpression, { kind: 'call' }>,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
): string | undefined {
  const dot = expression.callee.lastIndexOf('.');
  if (dot <= 0) return undefined;

  const receiverType = memberReceiverType(expression.callee.slice(0, dot), locals, environment.callables);
  const method = expression.callee.slice(dot + 1);
  const receiverKind = collectionKind(receiverType);
  const contract = receiverKind === undefined ? undefined : collectionMethods.get(`${receiverKind}.${method}`);
  if (receiverType === undefined || receiverKind === undefined || contract === undefined) return undefined;

  checkCollectionMethodArguments(expression, contract, elementType(receiverType), locals, environment);
  return COLLECTION_METHOD_RESULTS[contract.result](elementType(receiverType), receiverType);
}

/**
 * Validates argument count and types for a collection method call.
 *
 * @param expression - Call expression node.
 * @param contract - Collection method contract.
 * @param element - Element type key of the receiver collection.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 */
function checkCollectionMethodArguments(
  expression: Extract<FlintExpression, { kind: 'call' }>,
  contract: CollectionMethodContract,
  element: string,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
): void {
  const { fileName, diagnostics } = environment;
  if (expression.arguments.length !== contract.parameters.length)
    diagnostics.push(
      createDiagnostic(
        fileName,
        'type-check',
        'FLINT-TYPE-003',
        `'${expression.callee}' expects ${contract.parameters.length} argument(s), received ${expression.arguments.length}.`,
        expression.span,
      ),
    );

  for (const [index, argument] of expression.arguments.entries()) {
    const actual = inferExpression(argument, locals, environment);
    const parameter = contract.parameters[index];
    if (parameter === 'index' && !INTEGER_TYPES.has(actual))
      mismatch(
        argument.span,
        fileName,
        diagnostics,
        `Argument ${index + 1} of '${expression.callee}' must have integer index type.`,
      );
    if (parameter === 'element' && actual !== element)
      mismatch(
        argument.span,
        fileName,
        diagnostics,
        `Argument ${index + 1} of '${expression.callee}' has type '${actual}', expected '${element}'.`,
      );
  }
}

/**
 * Infers an ordinary function or capability call.
 *
 * @param expression - Call expression node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @returns Inferred result type key.
 */
function inferOrdinaryCall(
  expression: Extract<FlintExpression, { kind: 'call' }>,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
): string {
  const callable = environment.callables.get(expression.callee) ?? callableFromType(locals.get(expression.callee));
  if (callable === undefined) {
    reportUnknownCallable(expression, locals, environment);
    return 'unit';
  }
  checkCallableArguments(expression, callable, locals, environment);
  return callable.result;
}

/**
 * Reports a diagnostic for an unknown or non-callable callee and still types arguments.
 *
 * @param expression - Call expression node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 */
function reportUnknownCallable(
  expression: Extract<FlintExpression, { kind: 'call' }>,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
): void {
  const isLocal = locals.has(expression.callee);
  environment.diagnostics.push(
    createDiagnostic(
      environment.fileName,
      isLocal ? 'type-check' : 'abi',
      isLocal ? 'FLINT-TYPE-023' : 'FLINT-ABI-004',
      isLocal
        ? `Value '${expression.callee}' is not callable.`
        : `Call to undeclared function or capability '${expression.callee}'.`,
      expression.span,
    ),
  );
  for (const argument of expression.arguments) inferExpression(argument, locals, environment);
}

/**
 * Validates ordinary callable argument arity and types.
 *
 * @param expression - Call expression node.
 * @param callable - Resolved callable signature.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 */
function checkCallableArguments(
  expression: Extract<FlintExpression, { kind: 'call' }>,
  callable: Callable,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
): void {
  const { fileName, diagnostics } = environment;
  if (expression.arguments.length !== callable.parameters.length)
    diagnostics.push(
      createDiagnostic(
        fileName,
        'type-check',
        'FLINT-TYPE-003',
        `'${expression.callee}' expects ${callable.parameters.length} argument(s), received ${expression.arguments.length}.`,
        expression.span,
      ),
    );

  for (const [index, argument] of expression.arguments.entries()) {
    const expected = callable.parameters[index];
    const actual = inferExpression(argument, locals, environment, expected);
    if (expected !== undefined && actual !== expected)
      mismatch(
        argument.span,
        fileName,
        diagnostics,
        `Argument ${index + 1} of '${expression.callee}' has type '${actual}', expected '${expected}'.`,
      );
  }
}

/**
 * Infers the type of a first-class function value reference.
 *
 * @param expression - Function-value expression node.
 * @param environment - Shared type-check environment.
 * @param expectedType - Optional expected function type key.
 * @returns Inferred function type key.
 */
function inferFunctionValueExpression(
  expression: Extract<FlintExpression, { kind: 'function-value' }>,
  environment: TypeCheckEnvironment,
  expectedType?: string,
): string {
  const callable = environment.callables.get(expression.name);
  if (callable === undefined) {
    environment.diagnostics.push(
      createDiagnostic(
        environment.fileName,
        'type-check',
        'FLINT-TYPE-022',
        `Unknown function value '${expression.name}'.`,
        expression.span,
      ),
    );
    return 'unit';
  }
  const type = functionTypeKey(callable);
  if (expectedType !== undefined && expectedType !== type)
    mismatch(
      expression.span,
      environment.fileName,
      environment.diagnostics,
      `Function value '${expression.name}' has type '${type}', expected '${expectedType}'.`,
    );
  return type;
}

/**
 * Infers the type of a struct literal expression.
 *
 * @param expression - Struct-value expression node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @returns Struct type key.
 */
function inferStructValueExpression(
  expression: Extract<FlintExpression, { kind: 'struct-value' }>,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
): string {
  for (const value of Object.values(expression.fields)) inferExpression(value, locals, environment);
  return typeNameKey(expression.type);
}

/**
 * Infers the type of an enum construction expression.
 *
 * @param expression - Enum-value expression node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @param expectedType - Optional expected aggregate type key.
 * @returns Inferred enum type key.
 */
function inferEnumValueExpression(
  expression: Extract<FlintExpression, { kind: 'enum-value' }>,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
  expectedType?: string,
): string {
  const enumName = expression.type.reference ?? expression.type.name;
  const declaration = environment.module.enums.find(({ name }) => name === enumName);
  const variant = declaration?.variants.find(({ name }) => name === expression.variant);
  const fields = variant?.fields ?? builtInEnumFields(enumName, expression.variant, expectedType);
  reportEnumValueShapeDiagnostics(expression, enumName, declaration, variant, fields, environment);

  const actualArguments = expression.arguments.map((argument) => inferExpression(argument, locals, environment));
  checkEnumValueFieldTypes(expression, fields, declaration, expectedType, actualArguments, environment);
  return resolveEnumValueResultType(expression, enumName, declaration, variant, actualArguments, expectedType);
}

/**
 * Reports unknown-enum/variant and arity diagnostics for enum construction.
 *
 * @param expression - Enum-value expression node.
 * @param enumName - Enum constructor name.
 * @param declaration - Optional user-defined enum declaration.
 * @param variant - Optional matched variant declaration.
 * @param fields - Expected variant fields when known.
 * @param environment - Shared type-check environment.
 */
function reportEnumValueShapeDiagnostics(
  expression: Extract<FlintExpression, { kind: 'enum-value' }>,
  enumName: string,
  declaration: FlintModule['enums'][number] | undefined,
  variant: FlintModule['enums'][number]['variants'][number] | undefined,
  fields: readonly FlintParameter[] | undefined,
  environment: TypeCheckEnvironment,
): void {
  const { fileName, diagnostics } = environment;
  if (declaration === undefined && fields === undefined)
    diagnostics.push(
      createDiagnostic(fileName, 'type-check', 'FLINT-TYPE-020', `Unknown enum '${enumName}'.`, expression.span),
    );
  if (declaration !== undefined && variant === undefined)
    diagnostics.push(
      createDiagnostic(
        fileName,
        'type-check',
        'FLINT-TYPE-020',
        `Unknown variant '${expression.variant}' for enum '${enumName}'.`,
        expression.span,
      ),
    );
  if (fields !== undefined && expression.arguments.length !== fields.length)
    diagnostics.push(
      createDiagnostic(
        fileName,
        'type-check',
        'FLINT-TYPE-021',
        `Enum variant '${enumName}::${expression.variant}' expects ${fields.length} argument(s), received ${expression.arguments.length}.`,
        expression.span,
      ),
    );
}

/**
 * Checks constructed enum field argument types against expected field types.
 *
 * @param expression - Enum-value expression node.
 * @param fields - Expected variant fields when known.
 * @param declaration - Optional user-defined enum declaration.
 * @param expectedType - Optional expected aggregate type key.
 * @param actualArguments - Inferred argument type keys.
 * @param environment - Shared type-check environment.
 */
function checkEnumValueFieldTypes(
  expression: Extract<FlintExpression, { kind: 'enum-value' }>,
  fields: readonly FlintParameter[] | undefined,
  declaration: FlintModule['enums'][number] | undefined,
  expectedType: string | undefined,
  actualArguments: readonly string[],
  environment: TypeCheckEnvironment,
): void {
  const expectedArguments = fields?.map((field) => resolveEnumFieldType(field.type, declaration, expectedType)) ?? [];
  for (const [index, actual] of actualArguments.entries()) {
    const expectedArgument = expectedArguments[index];
    if (expectedArgument !== undefined && expectedArgument !== 'unit' && actual !== expectedArgument)
      mismatch(
        expression.arguments[index]?.span ?? expression.span,
        environment.fileName,
        environment.diagnostics,
        `Enum field ${index + 1} has type '${actual}', expected '${expectedArgument}'.`,
      );
  }
}

/**
 * Resolves the result type key for an enum construction expression.
 *
 * @param expression - Enum-value expression node.
 * @param enumName - Enum constructor name.
 * @param declaration - Optional user-defined enum declaration.
 * @param variant - Optional matched variant declaration.
 * @param actualArguments - Inferred argument type keys.
 * @param expectedType - Optional expected aggregate type key.
 * @returns Result type key.
 */
function resolveEnumValueResultType(
  expression: Extract<FlintExpression, { kind: 'enum-value' }>,
  enumName: string,
  declaration: FlintModule['enums'][number] | undefined,
  variant: FlintModule['enums'][number]['variants'][number] | undefined,
  actualArguments: readonly string[],
  expectedType: string | undefined,
): string {
  if (expectedType !== undefined && expectedType.startsWith(`${enumName}<`)) return expectedType;
  if (declaration === undefined) return typeNameKey(expression.type);
  const inferred = declaration.genericParameters.map((parameter) => {
    const index =
      variant?.fields.findIndex(({ type }) => type.reference === parameter.name || type.name === parameter.name) ?? -1;
    return index < 0 ? 'unit' : (actualArguments[index] ?? 'unit');
  });
  return `${enumName}<${inferred.join(',')}>`;
}

/**
 * Infers the type of an array or vector literal expression.
 *
 * @param expression - Collection literal expression node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @param expectedType - Optional expected collection type key.
 * @returns Inferred collection type key.
 */
function inferCollectionLiteralExpression(
  expression: Extract<FlintExpression, { kind: 'array-literal' | 'vector-literal' }>,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
  expectedType?: string,
): string {
  const types = expression.elements.map((element) => inferExpression(element, locals, environment));
  const inferredElement = types[0] ?? collectionElementFromType(expectedType);
  const element = inferredElement ?? 'unit';
  for (const type of types)
    if (type !== element)
      mismatch(
        expression.span,
        environment.fileName,
        environment.diagnostics,
        'Collection elements must have the same type.',
      );
  const collection = expression.kind === 'array-literal' ? 'Array' : 'Vector';
  const fixedLength =
    expression.kind === 'array-literal' && expression.type.length !== undefined ? `[${expression.type.length}]` : '';
  return `${collection}<${element}>${fixedLength}`;
}

/**
 * Infers the element type of an index expression.
 *
 * @param expression - Index expression node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @returns Element type key, or `unit` when the receiver is not a collection.
 */
function inferIndexExpression(
  expression: Extract<FlintExpression, { kind: 'index' }>,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
): string {
  const receiver = inferExpression(expression.receiver, locals, environment);
  const index = inferExpression(expression.index, locals, environment);
  if (!INTEGER_TYPES.has(index))
    mismatch(
      expression.index.span,
      environment.fileName,
      environment.diagnostics,
      'Collection indexes must have integer type.',
    );
  return receiver.startsWith('Array<') || receiver.startsWith('Vector<') ? elementType(receiver) : 'unit';
}

/**
 * Infers the common result type of a match expression and validates exhaustiveness.
 *
 * @param expression - Match expression node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @returns Common arm result type key.
 */
function inferMatchExpression(
  expression: Extract<FlintExpression, { kind: 'match' }>,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
): string {
  const matchedType = inferExpression(expression.value, locals, environment);
  const enumName = matchedType.split('<', 1)[0] ?? matchedType;
  const declaration = environment.module.enums.find(({ name }) => name === enumName);
  const required = requiredMatchVariants(enumName);
  const patterns = new Set<string>();
  const covered = expression.arms.some(({ pattern }) => pattern.kind === 'wildcard');

  const types = expression.arms.map((arm) =>
    inferMatchArm(
      arm,
      matchedType,
      enumName,
      declaration,
      required !== undefined || matchedType.includes('<'),
      locals,
      environment,
      patterns,
    ),
  );

  if (required !== undefined && !covered && required.some((name) => !patterns.has(name)))
    environment.diagnostics.push(
      createDiagnostic(
        environment.fileName,
        'type-check',
        'FLINT-TYPE-012',
        `${enumName} matching must handle ${required.join(' and ')} (or use '_').`,
        expression.span,
        'error',
        'Add the missing explicit outcome arm before lowering to WASM.',
      ),
    );

  const first = types[0] ?? 'unit';
  for (const type of types)
    if (type !== first)
      mismatch(
        expression.span,
        environment.fileName,
        environment.diagnostics,
        'All match arms must have the same type.',
      );
  return first;
}

/**
 * Returns the required exhaustive variants for built-in enums.
 *
 * @param enumName - Enum type constructor name.
 * @returns Required variant names, or undefined when exhaustiveness is not enforced.
 */
function requiredMatchVariants(enumName: string): readonly string[] | undefined {
  if (enumName === 'Option') return ['Some', 'None'];
  if (enumName === 'Result') return ['Ok', 'Error'];
  return undefined;
}

/**
 * Infers one match arm and binds pattern variables into a cloned local scope.
 *
 * @param arm - Match arm node.
 * @param matchedType - Type key of the matched value.
 * @param enumName - Base enum name extracted from the matched type.
 * @param declaration - Optional user-defined enum declaration.
 * @param knownAggregate - Whether the matched type is a known aggregate/enum.
 * @param locals - Parent local variable type map.
 * @param environment - Shared type-check environment.
 * @param patterns - Mutable set of covered variant names.
 * @returns Inferred arm value type key.
 */
function inferMatchArm(
  arm: Extract<FlintExpression, { kind: 'match' }>['arms'][number],
  matchedType: string,
  enumName: string,
  declaration: FlintModule['enums'][number] | undefined,
  knownAggregate: boolean,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
  patterns: Set<string>,
): string {
  const armLocals = new Map(locals);
  if (arm.pattern.kind === 'variant')
    bindVariantPattern(
      arm.pattern,
      matchedType,
      enumName,
      declaration,
      knownAggregate,
      armLocals,
      environment,
      patterns,
    );
  return inferExpression(arm.value, armLocals, environment);
}

/**
 * Binds variables from a variant pattern and records coverage.
 *
 * @param pattern - Variant pattern node.
 * @param matchedType - Type key of the matched value.
 * @param enumName - Base enum name extracted from the matched type.
 * @param declaration - Optional user-defined enum declaration.
 * @param knownAggregate - Whether the matched type is a known aggregate/enum.
 * @param armLocals - Mutable local map for the arm.
 * @param environment - Shared type-check environment.
 * @param patterns - Mutable set of covered variant names.
 */
function bindVariantPattern(
  pattern: Extract<Extract<FlintExpression, { kind: 'match' }>['arms'][number]['pattern'], { kind: 'variant' }>,
  matchedType: string,
  enumName: string,
  declaration: FlintModule['enums'][number] | undefined,
  knownAggregate: boolean,
  armLocals: Map<string, string>,
  environment: TypeCheckEnvironment,
  patterns: Set<string>,
): void {
  const { variantName, fields } = resolveVariantPatternFields(
    pattern,
    matchedType,
    enumName,
    declaration,
    knownAggregate,
    environment,
  );
  bindVariantPatternLocals(pattern, fields, declaration, matchedType, knownAggregate, armLocals, environment);
  patterns.add(variantName);
}

/**
 * Resolves variant fields for a match pattern and reports shape diagnostics.
 *
 * @param pattern - Variant pattern node.
 * @param matchedType - Type key of the matched value.
 * @param enumName - Base enum name extracted from the matched type.
 * @param declaration - Optional user-defined enum declaration.
 * @param knownAggregate - Whether the matched type is a known aggregate/enum.
 * @param environment - Shared type-check environment.
 * @returns Resolved variant name and fields.
 */
function resolveVariantPatternFields(
  pattern: Extract<Extract<FlintExpression, { kind: 'match' }>['arms'][number]['pattern'], { kind: 'variant' }>,
  matchedType: string,
  enumName: string,
  declaration: FlintModule['enums'][number] | undefined,
  knownAggregate: boolean,
  environment: TypeCheckEnvironment,
): { variantName: string; fields: readonly FlintParameter[] | undefined } {
  const { variantName, patternEnum, isQualified } = splitVariantPatternName(pattern.name, enumName);
  reportMismatchedVariantEnum(pattern, enumName, patternEnum, isQualified, knownAggregate, environment);

  const variant = declaration?.variants.find(({ name }) => name === variantName);
  const fields = variant?.fields ?? builtInEnumFields(enumName, variantName, matchedType);
  reportUnknownOrArityVariantPattern(pattern, enumName, variantName, fields, knownAggregate, environment);
  return { variantName, fields };
}

/**
 * Splits a variant pattern name into enum and variant components.
 *
 * @param patternName - Raw pattern name, optionally qualified as `Enum::Variant`.
 * @param enumName - Fallback enum name from the matched type.
 * @returns Variant name, optional pattern enum, and qualification flag.
 */
function splitVariantPatternName(
  patternName: string,
  enumName: string,
): { variantName: string; patternEnum: string; isQualified: boolean } {
  const qualified = patternName.split('::');
  if (qualified.length === 2) {
    return {
      variantName: qualified[1] ?? '',
      patternEnum: qualified[0] ?? enumName,
      isQualified: true,
    };
  }
  return {
    variantName: qualified[0] ?? '',
    patternEnum: enumName,
    isQualified: false,
  };
}

/**
 * Reports when a qualified pattern names a different enum than the matched value.
 *
 * @param pattern - Variant pattern node.
 * @param enumName - Expected enum name from the matched type.
 * @param patternEnum - Enum name from a qualified pattern.
 * @param isQualified - Whether the pattern used `Enum::Variant` syntax.
 * @param knownAggregate - Whether the matched type is a known aggregate/enum.
 * @param environment - Shared type-check environment.
 */
function reportMismatchedVariantEnum(
  pattern: Extract<Extract<FlintExpression, { kind: 'match' }>['arms'][number]['pattern'], { kind: 'variant' }>,
  enumName: string,
  patternEnum: string,
  isQualified: boolean,
  knownAggregate: boolean,
  environment: TypeCheckEnvironment,
): void {
  if (!knownAggregate || !isQualified || patternEnum === enumName) return;
  environment.diagnostics.push(
    createDiagnostic(
      environment.fileName,
      'type-check',
      'FLINT-TYPE-020',
      `Pattern '${pattern.name}' does not match '${enumName}'.`,
      pattern.span,
    ),
  );
}

/**
 * Reports unknown-variant and binding-arity diagnostics for a match pattern.
 *
 * @param pattern - Variant pattern node.
 * @param enumName - Expected enum name from the matched type.
 * @param variantName - Resolved variant name.
 * @param fields - Expected variant fields when known.
 * @param knownAggregate - Whether the matched type is a known aggregate/enum.
 * @param environment - Shared type-check environment.
 */
function reportUnknownOrArityVariantPattern(
  pattern: Extract<Extract<FlintExpression, { kind: 'match' }>['arms'][number]['pattern'], { kind: 'variant' }>,
  enumName: string,
  variantName: string,
  fields: readonly FlintParameter[] | undefined,
  knownAggregate: boolean,
  environment: TypeCheckEnvironment,
): void {
  if (!knownAggregate) return;
  if (fields === undefined) {
    environment.diagnostics.push(
      createDiagnostic(
        environment.fileName,
        'type-check',
        'FLINT-TYPE-020',
        `Unknown variant '${variantName}' for enum '${enumName}'.`,
        pattern.span,
      ),
    );
    return;
  }
  if (pattern.bindings.length === fields.length) return;
  environment.diagnostics.push(
    createDiagnostic(
      environment.fileName,
      'type-check',
      'FLINT-TYPE-021',
      `Variant '${variantName}' expects ${fields.length} binding(s), received ${pattern.bindings.length}.`,
      pattern.span,
    ),
  );
}

/**
 * Binds match pattern variables into the arm local scope.
 *
 * @param pattern - Variant pattern node.
 * @param fields - Expected variant fields when known.
 * @param declaration - Optional user-defined enum declaration.
 * @param matchedType - Type key of the matched value.
 * @param knownAggregate - Whether the matched type is a known aggregate/enum.
 * @param armLocals - Mutable local map for the arm.
 * @param environment - Shared type-check environment.
 */
function bindVariantPatternLocals(
  pattern: Extract<Extract<FlintExpression, { kind: 'match' }>['arms'][number]['pattern'], { kind: 'variant' }>,
  fields: readonly FlintParameter[] | undefined,
  declaration: FlintModule['enums'][number] | undefined,
  matchedType: string,
  knownAggregate: boolean,
  armLocals: Map<string, string>,
  environment: TypeCheckEnvironment,
): void {
  const seenBindings = new Set<string>();
  for (const [index, binding] of pattern.bindings.entries()) {
    if (seenBindings.has(binding))
      environment.diagnostics.push(
        createDiagnostic(
          environment.fileName,
          'type-check',
          'FLINT-TYPE-024',
          `Duplicate match binding '${binding}'.`,
          pattern.span,
        ),
      );
    seenBindings.add(binding);
    const field = knownAggregate ? fields?.[index] : undefined;
    if (field !== undefined) armLocals.set(binding, resolveEnumFieldType(field.type, declaration, matchedType));
  }
}

/**
 * Infers the type of a unary expression.
 *
 * @param expression - Unary expression node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @returns Inferred result type key.
 */
function inferUnaryExpression(
  expression: Extract<FlintExpression, { kind: 'unary' }>,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
): string {
  const operand = inferExpression(expression.operand, locals, environment);
  if (expression.operator === '!' && operand !== 'bool')
    mismatch(expression.span, environment.fileName, environment.diagnostics, "The '!' operator requires bool.");
  if (expression.operator === '-' && !isNumber(operand))
    mismatch(
      expression.span,
      environment.fileName,
      environment.diagnostics,
      "The '-' operator requires a numeric value.",
    );
  return expression.operator === '!' ? 'bool' : operand;
}

/**
 * Infers the type of a binary expression.
 *
 * @param expression - Binary expression node.
 * @param locals - Local variable type map.
 * @param environment - Shared type-check environment.
 * @returns Inferred result type key.
 */
function inferBinaryExpression(
  expression: Extract<FlintExpression, { kind: 'binary' }>,
  locals: ReadonlyMap<string, string>,
  environment: TypeCheckEnvironment,
): string {
  const left = inferExpression(expression.left, locals, environment);
  const right = inferExpression(expression.right, locals, environment, isNumber(left) ? left : undefined);
  return resolveBinaryResultType(expression, left, right, environment);
}

/**
 * Resolves the result type of a binary operator after operand inference.
 *
 * @param expression - Binary expression node.
 * @param left - Left operand type key.
 * @param right - Right operand type key.
 * @param environment - Shared type-check environment.
 * @returns Result type key.
 */
function resolveBinaryResultType(
  expression: Extract<FlintExpression, { kind: 'binary' }>,
  left: string,
  right: string,
  environment: TypeCheckEnvironment,
): string {
  if (ARITHMETIC_OPERATORS.has(expression.operator)) {
    requireMatchingNumericOperands(
      expression,
      left,
      right,
      environment,
      'Arithmetic operands must have the same numeric type.',
    );
    return left;
  }
  if (ORDERED_COMPARISON_OPERATORS.has(expression.operator)) {
    requireMatchingNumericOperands(
      expression,
      left,
      right,
      environment,
      'Ordered comparison operands must have the same numeric type.',
    );
    return 'bool';
  }
  if (EQUALITY_OPERATORS.has(expression.operator)) {
    if (left !== right)
      mismatch(
        expression.span,
        environment.fileName,
        environment.diagnostics,
        'Equality operands must have the same type.',
      );
    return 'bool';
  }
  requireLogicalOperands(expression, left, right, environment);
  return 'bool';
}

/**
 * Requires both operands to be the same numeric type.
 *
 * @param expression - Binary expression node.
 * @param left - Left operand type key.
 * @param right - Right operand type key.
 * @param environment - Shared type-check environment.
 * @param message - Diagnostic message when the requirement fails.
 */
function requireMatchingNumericOperands(
  expression: Extract<FlintExpression, { kind: 'binary' }>,
  left: string,
  right: string,
  environment: TypeCheckEnvironment,
  message: string,
): void {
  if (isNumber(left) && left === right) return;
  mismatch(expression.span, environment.fileName, environment.diagnostics, message);
}

/**
 * Requires both operands to have type bool for logical operators.
 *
 * @param expression - Binary expression node.
 * @param left - Left operand type key.
 * @param right - Right operand type key.
 * @param environment - Shared type-check environment.
 */
function requireLogicalOperands(
  expression: Extract<FlintExpression, { kind: 'binary' }>,
  left: string,
  right: string,
  environment: TypeCheckEnvironment,
): void {
  if (left === 'bool' && right === 'bool') return;
  mismatch(expression.span, environment.fileName, environment.diagnostics, 'Logical operands must have type bool.');
}

/**
 * Checks whether a base type name refers to a known primitive, built-in, generic, or declared type.
 *
 * @param baseType - Name of the base type.
 * @param declared - Declared type structure if found.
 * @param generic - True if in-scope generic parameter.
 * @returns True if known.
 */
function isKnownType(baseType: string, declared: unknown, generic: boolean): boolean {
  return isPrimitiveTypeName(baseType) || BUILT_IN_GENERIC_TYPES.has(baseType) || declared !== undefined || generic;
}

/**
 * Validates that a type name refers to a known primitive, built-in, generic, or declared type.
 *
 * @param type - Type AST node to validate.
 * @param fileName - Source file name for diagnostics.
 * @param diagnostics - Accumulator for diagnostics.
 * @param module - Enclosing module AST.
 * @param genericNames - In-scope generic parameter names.
 * @param declarationSpan - Span used when reporting type errors.
 */
function validateType(
  type: FlintTypeName,
  fileName: string,
  diagnostics: FlintDiagnostic[],
  module: FlintModule,
  genericNames: readonly string[] = [],
  declarationSpan: FlintSourceSpan = type.span,
): void {
  const baseType = type.reference ?? type.name;
  const declared = findDeclaredType(module, baseType);
  const generic = genericNames.includes(baseType);
  if (!isKnownType(baseType, declared, generic))
    diagnostics.push(
      createDiagnostic(
        fileName,
        'type-check',
        'FLINT-TYPE-004',
        `Unknown type '${typeNameKey(type)}'.`,
        declarationSpan,
        'error',
        'Use one of the primitive v1 types.',
      ),
    );

  const argumentsList = type.arguments ?? [];
  validateGenericArity(baseType, argumentsList.length, declared, fileName, diagnostics, declarationSpan);
  for (const argument of argumentsList)
    validateType(argument, fileName, diagnostics, module, genericNames, declarationSpan);
}

/**
 * Looks up a user-declared struct, enum, or interface by name.
 *
 * @param module - Module containing type declarations.
 * @param baseType - Type constructor name.
 * @returns Matching declaration, or undefined when not found.
 */
function findDeclaredType(
  module: FlintModule,
  baseType: string,
): FlintModule['structs'][number] | FlintModule['enums'][number] | FlintModule['interfaces'][number] | undefined {
  return (
    module.structs.find(({ name }) => name === baseType) ??
    module.enums.find(({ name }) => name === baseType) ??
    module.interfaces.find(({ name }) => name === baseType)
  );
}

/**
 * Returns whether a name is a primitive type key.
 *
 * @param name - Candidate type name.
 * @returns True when the name is a known primitive.
 */
function isPrimitiveTypeName(name: string): name is FlintPrimitiveType {
  for (const primitive of primitiveTypes) {
    if (primitive === name) return true;
  }
  return false;
}

/**
 * Validates generic type-argument arity for built-ins and declared types.
 *
 * @param baseType - Type constructor name.
 * @param arity - Provided type-argument count.
 * @param declared - Optional user-declared type with generic parameters.
 * @param fileName - Source file name for diagnostics.
 * @param diagnostics - Accumulator for diagnostics.
 * @param declarationSpan - Span used when reporting arity errors.
 */
function validateGenericArity(
  baseType: string,
  arity: number,
  declared:
    FlintModule['structs'][number] | FlintModule['enums'][number] | FlintModule['interfaces'][number] | undefined,
  fileName: string,
  diagnostics: FlintDiagnostic[],
  declarationSpan: FlintSourceSpan,
): void {
  if (!BUILT_IN_GENERIC_TYPES.has(baseType) && declared === undefined) return;

  const expected = expectedGenericArity(baseType, declared);
  const arityMismatch = baseType === 'Fn' ? arity < expected : arity !== expected;
  if (!arityMismatch) return;

  diagnostics.push(
    createDiagnostic(
      fileName,
      'type-check',
      'FLINT-TYPE-008',
      baseType === 'Fn'
        ? 'Fn<...> requires at least one type argument for its result type.'
        : `${baseType}<T> requires ${expected} type argument${expected === 1 ? '' : 's'}.`,
      declarationSpan,
      'error',
      baseType === 'Result' ? 'Use Result<Success, Failure>.' : `Use ${baseType}<Element>.`,
    ),
  );
}

/**
 * Computes the expected generic arity for a type constructor.
 *
 * @param baseType - Type constructor name.
 * @param declared - Optional user-declared type.
 * @returns Expected type-argument count.
 */
function expectedGenericArity(
  baseType: string,
  declared:
    FlintModule['structs'][number] | FlintModule['enums'][number] | FlintModule['interfaces'][number] | undefined,
): number {
  if (baseType === 'Fn') return 1;
  if (baseType === 'Result' || baseType === 'iterResult') return 2;
  if (BUILT_IN_GENERIC_TYPES.has(baseType)) return 1;
  return declared?.genericParameters.length ?? 0;
}

/**
 * Converts a type AST node into the checker display key.
 *
 * @param type - Type AST node.
 * @returns Canonical type key string.
 */
function typeNameKey(type: FlintTypeName): string {
  // Historical checker keys ignore referenceMode so `&T` and `T` share a carrier key.
  const id = checkerAlgebra.fromAst(type.referenceMode === undefined ? type : { ...type, referenceMode: undefined });
  return checkerAlgebra.display(id);
}

/**
 * Emits a type-mismatch diagnostic.
 *
 * @param span - Source span of the mismatch.
 * @param fileName - Source file name for diagnostics.
 * @param diagnostics - Accumulator for diagnostics.
 * @param message - Human-readable mismatch message.
 */
function mismatch(span: FlintSourceSpan, fileName: string, diagnostics: FlintDiagnostic[], message: string): void {
  diagnostics.push(createDiagnostic(fileName, 'type-check', 'FLINT-TYPE-005', message, span));
}

/**
 * Returns whether a type key is numeric.
 *
 * @param type - Type key string.
 * @returns True when the type is a numeric primitive.
 */
function isNumber(type: string): boolean {
  return NUMERIC_TYPES.has(type);
}

/**
 * Interns a checker type key for structural queries.
 *
 * @param type - Type key string.
 * @returns Interned type algebra node, or undefined when parsing fails.
 */
function internKey(type: string) {
  // Rebuild a minimal AST from checker keys for structural queries.
  return parseCheckerTypeKey(type);
}

/**
 * Returns whether a type key is iterator-like.
 *
 * @param type - Type key string.
 * @returns True when the type is Iterable or Iterator shaped.
 */
function isIteratorLike(type: string): boolean {
  const id = internKey(type);
  return id !== undefined && checkerAlgebra.isIteratorLike(id);
}

/**
 * Returns whether a type key is an Option aggregate.
 *
 * @param type - Type key string.
 * @returns True when the type is Option-shaped.
 */
function isOptionType(type: string): boolean {
  const id = internKey(type);
  return id !== undefined && checkerAlgebra.isOption(id);
}

/**
 * Extracts the element type key from a container type key.
 *
 * @param type - Container type key string.
 * @returns Element type key, or `unit` when unavailable.
 */
function elementType(type: string): string {
  const id = internKey(type);
  if (id === undefined) return 'unit';
  const element = checkerAlgebra.elementType(id);
  return element === undefined ? 'unit' : checkerAlgebra.display(element);
}

/**
 * Returns the collection kind for a type key when it is Array or Vector.
 *
 * @param type - Optional type key string.
 * @returns Collection kind, or undefined when not a collection.
 */
function collectionKind(type: string | undefined): CollectionKind | undefined {
  if (type === undefined) return undefined;
  const id = internKey(type);
  return id === undefined ? undefined : checkerAlgebra.collectionKind(id);
}

/**
 * Extracts the element type from an optional collection type key.
 *
 * @param type - Optional collection type key.
 * @returns Element type key, or undefined when not a collection.
 */
function collectionElementFromType(type: string | undefined): string | undefined {
  if (type === undefined || collectionKind(type) === undefined) return undefined;
  return elementType(type);
}

/**
 * Parse checker type keys produced by `typeNameKey` back into interned nodes.
 * Supports the closed grammar emitted by the checker (nominal apps, arrays, Fn).
 *
 * @param type - Checker type key string.
 * @returns Interned type algebra node, or undefined when parsing fails.
 */
function parseCheckerTypeKey(type: string): ReturnType<TypeAlgebra['fromAst']> | undefined {
  const ast = parseTypeKeyAst(type);
  return ast === undefined ? undefined : checkerAlgebra.fromAst(ast);
}

/**
 * Parses a checker type key string into a minimal type AST node.
 *
 * @param value - Type key fragment to parse.
 * @returns Type AST node, or undefined when the fragment is empty/invalid.
 */
function parseTypeKeyAst(value: string): FlintTypeName | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  const arrayAst = parseFixedArrayTypeKey(trimmed);
  if (arrayAst !== undefined) return arrayAst;

  const genericAst = parseGenericTypeKey(trimmed);
  if (genericAst !== undefined) return genericAst;

  return parseSimpleTypeKey(trimmed);
}

/**
 * Parses a fixed-length array type key such as `i32[4]`.
 *
 * @param trimmed - Trimmed type key string.
 * @returns Type AST with length, or undefined when not a fixed array key.
 */
function parseFixedArrayTypeKey(trimmed: string): FlintTypeName | undefined {
  const arrayMatch = /^(.+)\[(\d+)]$/.exec(trimmed);
  if (arrayMatch === null) return undefined;
  const innerSource = arrayMatch[1];
  const lengthSource = arrayMatch[2];
  if (innerSource === undefined || lengthSource === undefined) return undefined;
  const inner = parseTypeKeyAst(innerSource);
  if (inner === undefined) return undefined;
  return { ...inner, length: Number(lengthSource) };
}

/**
 * Parses a generic type application key such as `Option<i32>`.
 *
 * @param trimmed - Trimmed type key string.
 * @returns Type AST node, or undefined when not a generic application.
 */
function parseGenericTypeKey(trimmed: string): FlintTypeName | undefined {
  const genericStart = trimmed.indexOf('<');
  if (genericStart === -1 || !trimmed.endsWith('>')) return undefined;

  const name = trimmed.slice(0, genericStart);
  const rawArguments = trimmed.slice(genericStart + 1, -1);
  const arguments_ = splitGenericArguments(rawArguments)
    .map((part) => parseTypeKeyAst(part))
    .filter((part): part is FlintTypeName => part !== undefined);
  if (arguments_.length === 0 && rawArguments.trim() !== '') return undefined;

  return buildTypeNameAst(name, arguments_);
}

/**
 * Parses a simple nominal or primitive type key.
 *
 * @param trimmed - Trimmed type key string.
 * @returns Type AST node.
 */
function parseSimpleTypeKey(trimmed: string): FlintTypeName {
  return buildTypeNameAst(trimmed, []);
}

/**
 * Builds a type-name AST node from a constructor name and optional arguments.
 *
 * @param name - Type constructor name.
 * @param arguments_ - Parsed type arguments.
 * @returns Type AST node.
 */
function buildTypeNameAst(name: string, arguments_: readonly FlintTypeName[]): FlintTypeName {
  const span = { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 };
  const primitive: FlintPrimitiveType = isPrimitiveTypeName(name) ? name : 'unit';
  return {
    kind: 'type-name',
    name: primitive,
    ...(primitive === name && arguments_.length === 0 ? {} : { reference: name }),
    ...(arguments_.length === 0 ? {} : { arguments: arguments_ }),
    span,
  };
}

/**
 * Resolves the receiver type for a dotted member or method callee path.
 *
 * @param receiver - Receiver path string.
 * @param locals - Local variable type map.
 * @param callables - Known callable signatures.
 * @returns Receiver type key, or undefined when unresolved.
 */
function memberReceiverType(
  receiver: string,
  locals: ReadonlyMap<string, string>,
  callables: ReadonlyMap<string, Callable>,
): string | undefined {
  const local = locals.get(receiver);
  if (local !== undefined) return local;
  const callable = callables.get(receiver);
  if (callable !== undefined) return callable.result;
  const separator = receiver.lastIndexOf('.');
  if (separator === -1) return undefined;
  const parent = receiver.slice(0, separator);
  const memberType = memberReceiverType(parent, locals, callables);
  return receiver.slice(separator + 1) === 'next' && memberType !== undefined && isIteratorLike(memberType)
    ? `Option<${elementType(memberType)}>`
    : undefined;
}

/**
 * Reconstructs a callable signature from a `Fn<...>` type key.
 *
 * @param type - Optional function type key.
 * @returns Callable signature, or undefined when not a function type.
 */
function callableFromType(type: string | undefined): Callable | undefined {
  if (type === undefined) return undefined;
  const id = internKey(type);
  if (id === undefined) return undefined;
  const parts = checkerAlgebra.functionParts(id);
  if (parts === undefined) return undefined;
  return {
    parameters: parts.parameters.map((parameter) => checkerAlgebra.display(parameter)),
    result: checkerAlgebra.display(parts.result),
  };
}

/**
 * Formats a callable signature as a `Fn<...>` type key.
 *
 * @param callable - Callable signature.
 * @returns Function type key string.
 */
function functionTypeKey(callable: Callable): string {
  return `Fn<${[...callable.parameters, callable.result].join(',')}>`;
}

/**
 * Splits a comma-separated generic argument list, respecting nested brackets.
 *
 * @param value - Raw generic argument list without surrounding angle brackets.
 * @returns Trimmed argument fragments.
 */
function splitGenericArguments(value: string): string[] {
  const result: string[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '<') depth += 1;
    else if (character === '>') depth -= 1;
    else if (character === ',' && depth === 0) {
      result.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (value.trim() !== '') result.push(value.slice(start).trim());
  return result;
}

/** Built-in enum field layouts keyed by `Enum::Variant`. */
const BUILT_IN_ENUM_FIELD_LAYOUTS: Readonly<Record<string, readonly number[]>> = {
  'Option::Some': [0],
  'Option::None': [],
  'Result::Ok': [0],
  'Result::Error': [1],
};

/**
 * Returns synthetic field parameters for built-in Option/Result variants.
 *
 * @param enumName - Built-in enum name.
 * @param variantName - Variant name.
 * @param aggregateType - Optional fully applied aggregate type key.
 * @returns Synthetic parameters, or undefined when not a built-in variant.
 */
function builtInEnumFields(
  enumName: string,
  variantName: string,
  aggregateType: string | undefined,
): readonly FlintParameter[] | undefined {
  const layout = BUILT_IN_ENUM_FIELD_LAYOUTS[`${enumName}::${variantName}`];
  if (layout === undefined) return undefined;

  const typeArguments = aggregateType?.startsWith(`${enumName}<`)
    ? splitGenericArguments(aggregateType.slice(enumName.length + 1, -1))
    : [];
  const span = { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 };
  return layout.map((index) => ({
    kind: 'parameter',
    name: 'value',
    type: buildTypeNameAst(typeArguments[index] ?? 'unit', []),
    span,
  }));
}

/**
 * Extracts the substituted generic argument corresponding to a generic parameter index.
 *
 * @param aggregateType - Applied aggregate type string.
 * @param enumName - Name of the enum type.
 * @param genericIndex - Index of the generic parameter.
 * @returns Substituted type name string.
 */
function extractSubstitutedGenericArgument(aggregateType: string, enumName: string, genericIndex: number): string {
  const prefix = `${enumName}<`;
  if (!aggregateType.startsWith(prefix)) return 'unit';
  const arguments_ = splitGenericArguments(aggregateType.slice(prefix.length, -1));
  return arguments_[genericIndex] ?? 'unit';
}

/**
 * Resolves an enum field type, substituting generic parameters from the aggregate.
 *
 * @param type - Field type AST node.
 * @param declaration - Optional enum declaration providing generic parameters.
 * @param aggregateType - Optional fully applied aggregate type key.
 * @returns Resolved field type key.
 */
function resolveEnumFieldType(
  type: FlintTypeName,
  declaration: FlintModule['enums'][number] | undefined,
  aggregateType: string | undefined,
): string {
  const name = type.reference ?? type.name;
  const genericIndex = declaration?.genericParameters.findIndex(({ name: genericName }) => genericName === name) ?? -1;
  if (genericIndex >= 0 && aggregateType !== undefined && declaration !== undefined) {
    return extractSubstitutedGenericArgument(aggregateType, declaration.name, genericIndex);
  }
  return typeNameKey(type);
}

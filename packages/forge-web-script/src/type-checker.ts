import { createDiagnostic, type ForgeWebScriptDiagnostic, type ForgeWebScriptSourceSpan } from './diagnostics.js';
import { primitiveTypes } from './parser.js';
import { FORGE_WEB_SCRIPT_REGEX_FUNCTIONS, type ForgeWebScriptStandardLibraryFunction } from './stdlib/regex.js';
import { FORGE_WEB_SCRIPT_STRING_FUNCTIONS, type ForgeWebScriptStringFunction } from './stdlib/string.js';
import { FORGE_WEB_SCRIPT_MEMORY_FUNCTIONS, type ForgeWebScriptMemoryFunction } from './stdlib/memory.js';

import type {
  ForgeWebScriptExpression,
  ForgeWebScriptFunction,
  ForgeWebScriptModule,
  ForgeWebScriptParameter,
  ForgeWebScriptPrimitiveType,
  ForgeWebScriptStatement,
  ForgeWebScriptTypeName,
} from './ast.js';

export interface ForgeWebScriptTypeCheckOptions {
  readonly requestedCapabilities?: readonly string[];
  readonly requireExports?: boolean;
  readonly externalFunctions?: readonly ForgeWebScriptFunction[];
}

export interface ForgeWebScriptTypeCheckResult {
  readonly diagnostics: readonly ForgeWebScriptDiagnostic[];
  readonly valid: boolean;
}

interface Callable {
  readonly parameters: readonly string[];
  readonly result: string;
  readonly standardLibrary?:
    | ForgeWebScriptStandardLibraryFunction['operation']
    | ForgeWebScriptStringFunction['operation']
    | ForgeWebScriptMemoryFunction['operation'];
}

type CollectionKind = 'Array' | 'Vector';
type CollectionParameter = 'index' | 'element';

interface CollectionMethodContract {
  readonly receiver: CollectionKind;
  readonly parameters: readonly CollectionParameter[];
  readonly result: 'iterator' | 'length' | 'element-option' | 'receiver' | 'unit';
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

export function checkForgeWebScript(
  module: ForgeWebScriptModule,
  fileName = '<input>',
  options: ForgeWebScriptTypeCheckOptions = {},
): ForgeWebScriptTypeCheckResult {
  const diagnostics: ForgeWebScriptDiagnostic[] = [];
  const standardLibraryFunctions = [
    ...FORGE_WEB_SCRIPT_REGEX_FUNCTIONS,
    ...FORGE_WEB_SCRIPT_STRING_FUNCTIONS,
    ...FORGE_WEB_SCRIPT_MEMORY_FUNCTIONS,
  ];
  const callables = new Map<string, Callable>(
    standardLibraryFunctions.map((declaration) => [
      declaration.name,
      {
        parameters: declaration.parameters,
        result: declaration.result,
        standardLibrary: declaration.operation,
      },
    ]),
  );
  const standardLibraryNames = new Set(callables.keys());
  const names = new Set<string>();
  for (const declaration of options.externalFunctions ?? [])
    callables.set(declaration.name, {
      parameters: declaration.parameters.map((parameter) => typeNameKey(parameter.type)),
      result: typeNameKey(declaration.result),
    });
  const enumValues = new Map<string, ReadonlyMap<string, number>>(
    module.enums.map((declaration) => [
      declaration.name,
      new Map(declaration.variants.map(({ name, tag }) => [name, tag])),
    ]),
  );
  for (const imported of module.sourceImports) {
    if (standardLibraryNames.has(imported.alias))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'abi',
          'FWS-ABI-005',
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
          'FWS-ABI-004',
          `The name '${imported.alias}' is declared more than once.`,
          imported.span,
        ),
      );
    names.add(imported.alias);
  }
  for (const imported of module.imports) {
    if (standardLibraryNames.has(imported.alias))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'abi',
          'FWS-ABI-005',
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
          'FWS-ABI-001',
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
          'FWS-ABI-002',
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
  for (const declaration of module.structs)
    for (const field of declaration.fields)
      validateType(
        field.type,
        fileName,
        diagnostics,
        module,
        declaration.genericParameters.map(({ name }) => name),
      );
  for (const declaration of module.enums) {
    const tags = new Set<number>();
    const variantNames = new Set<string>();
    for (const variant of declaration.variants) {
      if (variantNames.has(variant.name))
        diagnostics.push(
          createDiagnostic(
            fileName,
            'type-check',
            'FWS-TYPE-001',
            `Enum '${declaration.name}' declares variant '${variant.name}' more than once.`,
            variant.span,
          ),
        );
      variantNames.add(variant.name);
      if (!Number.isSafeInteger(variant.tag) || variant.tag < -2147483648 || variant.tag > 2147483647)
        diagnostics.push(
          createDiagnostic(
            fileName,
            'type-check',
            'FWS-TYPE-013',
            `Enum '${declaration.name}' discriminant '${variant.tag}' is outside the signed i32 range.`,
            variant.span,
          ),
        );
      if (tags.has(variant.tag))
        diagnostics.push(
          createDiagnostic(
            fileName,
            'type-check',
            'FWS-TYPE-014',
            `Enum '${declaration.name}' has duplicate discriminant '${variant.tag}'.`,
            variant.span,
          ),
        );
      tags.add(variant.tag);
    }
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
              'FWS-TYPE-007',
              `Unknown interface bound '${bound}'.`,
              required.span,
            ),
          );
    }
  for (const functionDeclaration of module.functions) {
    if (standardLibraryNames.has(functionDeclaration.name))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'abi',
          'FWS-ABI-005',
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
          'FWS-TYPE-001',
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
          'FWS-ABI-003',
          `Function '${functionDeclaration.name}' must be explicitly exported.`,
          functionDeclaration.span,
          'error',
          "Prefix the declaration with 'export'.",
        ),
      );
    for (const parameter of functionDeclaration.parameters)
      validateType(
        parameter.type,
        fileName,
        diagnostics,
        module,
        functionDeclaration.genericParameters.map(({ name }) => name),
      );
    validateType(
      functionDeclaration.result,
      fileName,
      diagnostics,
      module,
      functionDeclaration.genericParameters.map(({ name }) => name),
    );
    callables.set(functionDeclaration.name, {
      parameters: functionDeclaration.parameters.map((parameter) => typeNameKey(parameter.type)),
      result: typeNameKey(functionDeclaration.result),
    });
    if (functionDeclaration.iterable && !isIteratorLike(typeNameKey(functionDeclaration.result)))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'type-check',
          'FWS-TYPE-009',
          `Iterator function '${functionDeclaration.name}' must return Iterable<T> or Iterator<T>.`,
          functionDeclaration.result.span,
          'error',
          'Declare the result as Iterator<T> and yield values of type T.',
        ),
      );
  }
  for (const functionDeclaration of module.functions)
    checkFunction(functionDeclaration, callables, fileName, diagnostics, module, enumValues);
  return { diagnostics, valid: diagnostics.every((diagnostic) => diagnostic.severity !== 'error') };
}

function checkFunction(
  functionDeclaration: ForgeWebScriptFunction,
  callables: ReadonlyMap<string, Callable>,
  fileName: string,
  diagnostics: ForgeWebScriptDiagnostic[],
  module: ForgeWebScriptModule,
  enumValues: ReadonlyMap<string, ReadonlyMap<string, number>>,
): void {
  const locals = new Map(
    functionDeclaration.parameters.map((parameter) => [parameter.name, typeNameKey(parameter.type)]),
  );
  for (const statement of functionDeclaration.body)
    checkStatement(
      statement,
      typeNameKey(functionDeclaration.result),
      functionDeclaration.iterable === true,
      locals,
      callables,
      fileName,
      diagnostics,
      enumValues,
      module,
      functionDeclaration.genericParameters.map(({ name }) => name),
    );
}

function checkStatement(
  statement: ForgeWebScriptStatement,
  result: string,
  iterable: boolean,
  locals: Map<string, string>,
  callables: ReadonlyMap<string, Callable>,
  fileName: string,
  diagnostics: ForgeWebScriptDiagnostic[],
  enumValues: ReadonlyMap<string, ReadonlyMap<string, number>>,
  module: ForgeWebScriptModule,
  genericNames: readonly string[],
): void {
  switch (statement.kind) {
    case 'let': {
      const isDuplicate = locals.has(statement.name) || callables.has(statement.name);
      if (isDuplicate)
        diagnostics.push(
          createDiagnostic(
            fileName,
            'type-check',
            'FWS-TYPE-006',
            `Local '${statement.name}' is declared more than once in this scope.`,
            statement.span,
          ),
        );
      validateType(statement.type, fileName, diagnostics, module, genericNames);
      const valueType = inferExpression(
        statement.value,
        locals,
        callables,
        fileName,
        diagnostics,
        enumValues,
        typeNameKey(statement.type),
        module,
      );
      if (valueType !== typeNameKey(statement.type))
        mismatch(
          statement.span,
          fileName,
          diagnostics,
          `Local '${statement.name}' has type '${typeNameKey(statement.type)}' but its value has type '${valueType}'.`,
        );

      if (!isDuplicate) locals.set(statement.name, typeNameKey(statement.type));

      break;
    }
    case 'assignment': {
      const localType = locals.get(statement.name);
      const valueType = inferExpression(statement.value, locals, callables, fileName, diagnostics, enumValues, undefined, module);
      if (localType === undefined) {
        diagnostics.push(
          createDiagnostic(
            fileName,
            'type-check',
            'FWS-TYPE-002',
            `Unknown value '${statement.name}'.`,
            statement.span,
          ),
        );
      } else if (statement.index !== undefined) {
        const indexType = inferExpression(statement.index, locals, callables, fileName, diagnostics, enumValues, undefined, module);
        if (!['i32', 'u32'].includes(indexType))
          mismatch(statement.index.span, fileName, diagnostics, 'Collection indexes must have integer type.');
        const isArray = localType.startsWith('Array<');
        const isVector = localType.startsWith('Vector<');
        if (!isArray && !isVector) {
          mismatch(statement.span, fileName, diagnostics, `Value '${statement.name}' is not indexable.`);
        } else {
          const element = elementType(localType);

          const bound = isArray ? /\[(\d+)\]$/.exec(localType)?.[1] : undefined;
          const fixedBound = bound === undefined ? undefined : Number(bound);

          if (
            fixedBound !== undefined &&
            statement.index.kind === 'literal' &&
            typeof statement.index.value === 'number' &&
            (statement.index.value < 0 || statement.index.value >= fixedBound)
          )
            diagnostics.push(
              createDiagnostic(
                fileName,
                'type-check',
                'FWS-TYPE-017',
                `Array index ${statement.index.value} is outside the fixed bound ${fixedBound}.`,
                statement.index.span,
              ),
            );

          if (valueType !== element)
            mismatch(
              statement.span,
              fileName,
              diagnostics,
              `Indexed value has type '${valueType}' but the collection element has type '${element}'.`,
            );
        }
      } else if (valueType !== localType) {
        mismatch(
          statement.span,
          fileName,
          diagnostics,
          `Local '${statement.name}' has type '${localType}' but its assigned value has type '${valueType}'.`,
        );
      }
      break;
    }
    case 'return': {
      const valueType =
        statement.value === undefined
          ? 'unit'
          : inferExpression(statement.value, locals, callables, fileName, diagnostics, enumValues, result, module);
      if (valueType !== result)
        mismatch(
          statement.span,
          fileName,
          diagnostics,
          `This function returns '${result}', but the return statement has type '${valueType}'.`,
        );

      break;
    }
    case 'if': {
      if (inferExpression(statement.condition, locals, callables, fileName, diagnostics, enumValues, undefined, module) !== 'bool')
        mismatch(statement.condition.span, fileName, diagnostics, 'An if condition must have type bool.');
      {
        const consequentLocals = new Map(locals);
        for (const nested of statement.consequent)
          checkStatement(
            nested,
            result,
            iterable,
            consequentLocals,
            callables,
            fileName,
            diagnostics,
            enumValues,
            module,
            genericNames,
          );
      }
      if (statement.alternate) {
        const alternateLocals = new Map(locals);
        for (const nested of statement.alternate)
          checkStatement(
            nested,
            result,
            iterable,
            alternateLocals,
            callables,
            fileName,
            diagnostics,
            enumValues,
            module,
            genericNames,
          );
      }

      break;
    }
    case 'switch': {
      const discriminant = inferExpression(statement.value, locals, callables, fileName, diagnostics, enumValues, undefined, module);
      const enumCases = enumValues.get(discriminant);
      if (!['i32', 'u32'].includes(discriminant) && enumCases === undefined)
        diagnostics.push(
          createDiagnostic(
            fileName,
            'type-check',
            'FWS-TYPE-018',
            `Switch discriminants must be integer or integer-enum values, not '${discriminant}'.`,
            statement.value.span,
          ),
        );
      const seen = new Set<number>();
      for (const arm of statement.cases) {
        const tag = typeof arm.value === 'number' ? arm.value : enumCases?.get(arm.value);
        if (tag === undefined) {
          diagnostics.push(
            createDiagnostic(
              fileName,
              'type-check',
              'FWS-TYPE-015',
              `Unknown switch case '${arm.value}' for discriminant '${discriminant}'.`,
              arm.span,
            ),
          );
        } else if (seen.has(tag)) {
          diagnostics.push(
            createDiagnostic(fileName, 'type-check', 'FWS-TYPE-016', `Duplicate switch case '${arm.value}'.`, arm.span),
          );
        } else {
          if (discriminant === 'i32' && (tag < -2147483648 || tag > 2147483647))
            diagnostics.push(
              createDiagnostic(
                fileName,
                'type-check',
                'FWS-TYPE-019',
                `Switch case '${tag}' is outside the signed i32 range.`,
                arm.span,
              ),
            );
          seen.add(tag);
        }
        const armLocals = new Map(locals);
        for (const nested of arm.body)
          checkStatement(
            nested,
            result,
            iterable,
            armLocals,
            callables,
            fileName,
            diagnostics,
            enumValues,
            module,
            genericNames,
          );
      }
      if (statement.defaultCase !== undefined) {
        const defaultLocals = new Map(locals);
        for (const nested of statement.defaultCase)
          checkStatement(
            nested,
            result,
            iterable,
            defaultLocals,
            callables,
            fileName,
            diagnostics,
            enumValues,
            module,
            genericNames,
          );
      }
      break;
    }
    case 'while':
    case 'do-while': {
      if (inferExpression(statement.condition, locals, callables, fileName, diagnostics, enumValues, undefined, module) !== 'bool')
        mismatch(statement.condition.span, fileName, diagnostics, `A ${statement.kind} condition must have type bool.`);
      const bodyLocals = new Map(locals);
      for (const nested of statement.body)
        checkStatement(
          nested,
          result,
          iterable,
          bodyLocals,
          callables,
          fileName,
          diagnostics,
          enumValues,
          module,
          genericNames,
        );
      break;
    }
    case 'match-statement': {
      inferExpression(
        { kind: 'match', value: statement.value, arms: statement.arms, span: statement.span },
        locals,
        callables,
        fileName,
        diagnostics,
        enumValues,
        undefined,
        module,
      );
      break;
    }
    case 'yield': {
      const valueType = inferExpression(statement.value, locals, callables, fileName, diagnostics, enumValues, undefined, module);
      if (!iterable)
        diagnostics.push(
          createDiagnostic(
            fileName,
            'type-check',
            'FWS-TYPE-011',
            'Yield is only valid inside an iterator function.',
            statement.span,
            'error',
            'Prefix the function with iter and return Iterator<T>.',
          ),
        );
      else if (elementType(result) !== valueType)
        mismatch(
          statement.value.span,
          fileName,
          diagnostics,
          `Yielded value has type '${valueType}', expected '${elementType(result)}'.`,
        );
      break;
    }
    case 'iterator-loop': {
      const iteratorType = inferExpression(statement.iterator, locals, callables, fileName, diagnostics, enumValues, undefined, module);
      const nextValue = isOptionType(iteratorType) ? elementType(iteratorType) : undefined;
      const iterableValue = isIteratorLike(iteratorType) ? elementType(iteratorType) : undefined;
      if (nextValue === undefined && iterableValue === undefined)
        mismatch(
          statement.iterator.span,
          fileName,
          diagnostics,
          'Iterator loops require value.next() -> Option<T> or an Iterable<T>.',
        );
      const bodyLocals = new Map(locals);
      bodyLocals.set(statement.binding, nextValue ?? iterableValue ?? 'unit');
      for (const nested of statement.body)
        checkStatement(
          nested,
          result,
          iterable,
          bodyLocals,
          callables,
          fileName,
          diagnostics,
          enumValues,
          module,
          genericNames,
        );
      break;
    }
    case 'expression-statement': {
      inferExpression(statement.expression, locals, callables, fileName, diagnostics, enumValues, undefined, module);
      break;
    }
  }
}

function inferExpression(
  expression: ForgeWebScriptExpression,
  locals: ReadonlyMap<string, string>,
  callables: ReadonlyMap<string, Callable>,
  fileName: string,
  diagnostics: ForgeWebScriptDiagnostic[],
  enumValues: ReadonlyMap<string, ReadonlyMap<string, number>>,
  expectedType?: string,
  module?: ForgeWebScriptModule,
): string {
  if (expression.kind === 'literal') {
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
  if (expression.kind === 'identifier') {
    const type = locals.get(expression.name);
    if (type === undefined) {
      diagnostics.push(
        createDiagnostic(
          fileName,
          'type-check',
          'FWS-TYPE-002',
          `Unknown value '${expression.name}'.`,
          expression.span,
        ),
      );
      return 'unit';
    }
    return type;
  }
  if (expression.kind === 'call') {
    if (expression.callee.endsWith('.next') && expression.arguments.length === 0) {
      const receiver = expression.callee.slice(0, -'.next'.length);
      const receiverType = memberReceiverType(receiver, locals, callables);
      if (receiverType !== undefined && isIteratorLike(receiverType)) return `Option<${elementType(receiverType)}>`;
    }
    const dot = expression.callee.lastIndexOf('.');
    if (dot > 0) {
      const receiverType = memberReceiverType(expression.callee.slice(0, dot), locals, callables);
      const method = expression.callee.slice(dot + 1);
      const receiverKind = collectionKind(receiverType);
      const contract = receiverKind === undefined ? undefined : collectionMethods.get(`${receiverKind}.${method}`);
      if (receiverType !== undefined && receiverKind !== undefined && contract !== undefined) {
        if (expression.arguments.length !== contract.parameters.length)
          diagnostics.push(
            createDiagnostic(
              fileName,
              'type-check',
              'FWS-TYPE-003',
              `'${expression.callee}' expects ${contract.parameters.length} argument(s), received ${expression.arguments.length}.`,
              expression.span,
            ),
          );
        const element = elementType(receiverType);
        for (const [index, argument] of expression.arguments.entries()) {
          const actual = inferExpression(argument, locals, callables, fileName, diagnostics, enumValues, undefined, module);
          const parameter = contract.parameters[index];
          if (parameter === 'index' && !['i32', 'u32'].includes(actual))
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
        if (contract.result === 'iterator') return `Iterator<${element}>`;
        if (contract.result === 'length') return 'u32';
        if (contract.result === 'element-option') return `Option<${element}>`;
        if (contract.result === 'receiver') return receiverType;
        return 'unit';
      }
    }
    const callable = callables.get(expression.callee) ?? callableFromType(locals.get(expression.callee));
    if (callable === undefined) {
      diagnostics.push(
        createDiagnostic(
          fileName,
          locals.has(expression.callee) ? 'type-check' : 'abi',
          locals.has(expression.callee) ? 'FWS-TYPE-023' : 'FWS-ABI-004',
          locals.has(expression.callee)
            ? `Value '${expression.callee}' is not callable.`
            : `Call to undeclared function or capability '${expression.callee}'.`,
          expression.span,
        ),
      );
      for (const argument of expression.arguments)
        inferExpression(argument, locals, callables, fileName, diagnostics, enumValues, undefined, module);
      return 'unit';
    }
    if (expression.arguments.length !== callable.parameters.length)
      diagnostics.push(
        createDiagnostic(
          fileName,
          'type-check',
          'FWS-TYPE-003',
          `'${expression.callee}' expects ${callable.parameters.length} argument(s), received ${expression.arguments.length}.`,
          expression.span,
        ),
      );
    for (const [index, argument] of expression.arguments.entries()) {
      const expected = callable.parameters[index];
      const actual = inferExpression(argument, locals, callables, fileName, diagnostics, enumValues, expected, module);
      if (expected !== undefined && actual !== expected)
        mismatch(
          argument.span,
          fileName,
          diagnostics,
          `Argument ${index + 1} of '${expression.callee}' has type '${actual}', expected '${expected}'.`,
        );
    }
    return callable.result;
  }
  if (expression.kind === 'function-value') {
    const callable = callables.get(expression.name);
    if (callable === undefined) {
      diagnostics.push(
        createDiagnostic(
          fileName,
          'type-check',
          'FWS-TYPE-022',
          `Unknown function value '${expression.name}'.`,
          expression.span,
        ),
      );
      return 'unit';
    }
    const type = functionTypeKey(callable);
    if (expectedType !== undefined && expectedType !== type)
      mismatch(expression.span, fileName, diagnostics, `Function value '${expression.name}' has type '${type}', expected '${expectedType}'.`);
    return type;
  }
  if (expression.kind === 'struct-value') {
    for (const value of Object.values(expression.fields))
      inferExpression(value, locals, callables, fileName, diagnostics, enumValues, undefined, module);
    return typeNameKey(expression.type);
  }
  if (expression.kind === 'enum-value') {
    const enumName = expression.type.reference ?? expression.type.name;
    const declaration = module?.enums.find(({ name }) => name === enumName);
    const variant = declaration?.variants.find(({ name }) => name === expression.variant);
    const fields = variant?.fields ?? builtInEnumFields(enumName, expression.variant, expectedType);
    if (declaration === undefined && fields === undefined)
      diagnostics.push(createDiagnostic(fileName, 'type-check', 'FWS-TYPE-020', `Unknown enum '${enumName}'.`, expression.span));
    if (declaration !== undefined && variant === undefined)
      diagnostics.push(createDiagnostic(fileName, 'type-check', 'FWS-TYPE-020', `Unknown variant '${expression.variant}' for enum '${enumName}'.`, expression.span));
    if (fields !== undefined && expression.arguments.length !== fields.length)
      diagnostics.push(
        createDiagnostic(
          fileName,
          'type-check',
          'FWS-TYPE-021',
          `Enum variant '${enumName}::${expression.variant}' expects ${fields.length} argument(s), received ${expression.arguments.length}.`,
          expression.span,
        ),
      );
    const actualArguments = expression.arguments.map((argument) =>
      inferExpression(argument, locals, callables, fileName, diagnostics, enumValues, undefined, module),
    );
    const expectedArguments = fields?.map((field) => resolveEnumFieldType(field.type, declaration, expectedType)) ?? [];
    for (const [index, actual] of actualArguments.entries()) {
      const expectedArgument = expectedArguments[index];
      if (expectedArgument !== undefined && expectedArgument !== 'unit' && actual !== expectedArgument)
        mismatch(expression.arguments[index]?.span ?? expression.span, fileName, diagnostics, `Enum field ${index + 1} has type '${actual}', expected '${expectedArgument}'.`);
    }
    if (expectedType !== undefined && expectedType.startsWith(`${enumName}<`)) return expectedType;
    if (declaration !== undefined) {
      const inferred = declaration.genericParameters.map((parameter) => {
        const index = variant?.fields.findIndex(({ type }) => type.reference === parameter.name || type.name === parameter.name) ?? -1;
        return index < 0 ? 'unit' : actualArguments[index] ?? 'unit';
      });
      return `${enumName}<${inferred.join(',')}>`;
    }
    return typeNameKey(expression.type);
  }
  if (expression.kind === 'array-literal' || expression.kind === 'vector-literal') {
    const types = expression.elements.map((element) =>
      inferExpression(element, locals, callables, fileName, diagnostics, enumValues, undefined, module),
    );
    const inferredElement = types[0] ?? collectionElementFromType(expectedType);
    const element = inferredElement ?? 'unit';
    for (const type of types)
      if (type !== element)
        mismatch(expression.span, fileName, diagnostics, 'Collection elements must have the same type.');
    const collection = expression.kind === 'array-literal' ? 'Array' : 'Vector';
    const fixedLength =
      expression.kind === 'array-literal' && expression.type.length !== undefined ? `[${expression.type.length}]` : '';
    return `${collection}<${element}>${fixedLength}`;
  }
  if (expression.kind === 'index') {
    const receiver = inferExpression(expression.receiver, locals, callables, fileName, diagnostics, enumValues, undefined, module);
    const index = inferExpression(expression.index, locals, callables, fileName, diagnostics, enumValues, undefined, module);
    if (!['i32', 'u32'].includes(index))
      mismatch(expression.index.span, fileName, diagnostics, 'Collection indexes must have integer type.');
    return receiver.startsWith('Array<') || receiver.startsWith('Vector<') ? elementType(receiver) : 'unit';
  }
  if (expression.kind === 'match') {
    const matchedType = inferExpression(expression.value, locals, callables, fileName, diagnostics, enumValues, undefined, module);
    const enumName = matchedType.split('<', 1)[0];
    const declaration = module?.enums.find(({ name }) => name === enumName);
    const required = enumName === 'Option' ? ['Some', 'None'] : enumName === 'Result' ? ['Ok', 'Error'] : undefined;
    const patterns = new Set<string>();
    const covered = expression.arms.some(({ pattern }) => pattern.kind === 'wildcard');
    const types = expression.arms.map((arm) => {
      const armLocals = new Map(locals);
      if (arm.pattern.kind === 'variant') {
        const qualified = arm.pattern.name.split('::');
        const patternEnum = qualified.length === 2 ? qualified[0] : enumName;
        const variantName = qualified.length === 2 ? qualified[1] : qualified[0];
        const knownAggregate = declaration !== undefined || required !== undefined || matchedType.includes('<');
        if (knownAggregate && qualified.length === 2 && patternEnum !== enumName)
          diagnostics.push(createDiagnostic(fileName, 'type-check', 'FWS-TYPE-020', `Pattern '${arm.pattern.name}' does not match '${enumName}'.`, arm.pattern.span));
        const variant = declaration?.variants.find(({ name }) => name === variantName);
        const fields = variant?.fields ?? builtInEnumFields(enumName, variantName, matchedType);
        if (knownAggregate && fields === undefined)
          diagnostics.push(createDiagnostic(fileName, 'type-check', 'FWS-TYPE-020', `Unknown variant '${variantName}' for enum '${enumName}'.`, arm.pattern.span));
        if (knownAggregate && fields !== undefined && arm.pattern.bindings.length !== fields.length)
          diagnostics.push(createDiagnostic(fileName, 'type-check', 'FWS-TYPE-021', `Variant '${variantName}' expects ${fields.length} binding(s), received ${arm.pattern.bindings.length}.`, arm.pattern.span));
        const seenBindings = new Set<string>();
        for (const [index, binding] of arm.pattern.bindings.entries()) {
          if (seenBindings.has(binding))
            diagnostics.push(createDiagnostic(fileName, 'type-check', 'FWS-TYPE-024', `Duplicate match binding '${binding}'.`, arm.pattern.span));
          seenBindings.add(binding);
          const field = knownAggregate ? fields?.[index] : undefined;
          if (field !== undefined) armLocals.set(binding, resolveEnumFieldType(field.type, declaration, matchedType));
        }
        patterns.add(variantName);
      }
      return inferExpression(arm.value, armLocals, callables, fileName, diagnostics, enumValues, undefined, module);
    });
    if (required !== undefined && !covered && required.some((name) => !patterns.has(name)))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'type-check',
          'FWS-TYPE-012',
          `${enumName} matching must handle ${required.join(' and ')} (or use '_').`,
          expression.span,
          'error',
          'Add the missing explicit outcome arm before lowering to WASM.',
        ),
      );
    const first = types[0] ?? 'unit';
    for (const type of types)
      if (type !== first) mismatch(expression.span, fileName, diagnostics, 'All match arms must have the same type.');
    return first;
  }
  if (expression.kind === 'unary') {
    const operand = inferExpression(expression.operand, locals, callables, fileName, diagnostics, enumValues, undefined, module);
    if (expression.operator === '!' && operand !== 'bool')
      mismatch(expression.span, fileName, diagnostics, "The '!' operator requires bool.");
    if (expression.operator === '-' && !isNumber(operand))
      mismatch(expression.span, fileName, diagnostics, "The '-' operator requires a numeric value.");
    return expression.operator === '!' ? 'bool' : operand;
  }
  if (expression.kind !== 'binary') return 'unit';
  const left = inferExpression(expression.left, locals, callables, fileName, diagnostics, enumValues, undefined, module);
  const right = inferExpression(
    expression.right,
    locals,
    callables,
    fileName,
    diagnostics,
    enumValues,
    isNumber(left) ? left : undefined,
    module,
  );
  if (['+', '-', '*', '/', '%'].includes(expression.operator)) {
    if (!isNumber(left) || left !== right)
      mismatch(expression.span, fileName, diagnostics, 'Arithmetic operands must have the same numeric type.');
    return left;
  }
  if (['<', '<=', '>', '>='].includes(expression.operator)) {
    if (!isNumber(left) || left !== right)
      mismatch(expression.span, fileName, diagnostics, 'Ordered comparison operands must have the same numeric type.');
    return 'bool';
  }
  if (['==', '!='].includes(expression.operator)) {
    if (left !== right) mismatch(expression.span, fileName, diagnostics, 'Equality operands must have the same type.');
    return 'bool';
  }
  if (left !== 'bool' || right !== 'bool')
    mismatch(expression.span, fileName, diagnostics, 'Logical operands must have type bool.');
  return 'bool';
}

function validateType(
  type: ForgeWebScriptTypeName,
  fileName: string,
  diagnostics: ForgeWebScriptDiagnostic[],
  module: ForgeWebScriptModule,
  genericNames: readonly string[] = [],
  declarationSpan: ForgeWebScriptSourceSpan = type.span,
): void {
  const baseType = type.reference ?? type.name;
  const declaredStruct = module.structs.find(({ name }) => name === baseType);
  const declaredEnum = module.enums.find(({ name }) => name === baseType);
  const declaredInterface = module.interfaces.find(({ name }) => name === baseType);
  const declared = declaredStruct ?? declaredEnum ?? declaredInterface;
  const generic = genericNames.includes(baseType);
  const builtIn = new Set(['Array', 'Vector', 'Iterable', 'Iterator', 'Result', 'Option', 'iterResult', 'Fn']);
  if (!primitiveTypes.has(baseType as ForgeWebScriptPrimitiveType) && !builtIn.has(baseType) && !declared && !generic)
    diagnostics.push(
      createDiagnostic(
        fileName,
        'type-check',
        'FWS-TYPE-004',
        `Unknown type '${typeNameKey(type)}'.`,
        declarationSpan,
        'error',
        'Use one of the primitive v1 types.',
      ),
    );
  const argumentsList = type.arguments ?? [];
  if (builtIn.has(baseType) || declared !== undefined) {
    const expected = baseType === 'Fn'
      ? 1
      : builtIn.has(baseType)
      ? baseType === 'Result' || baseType === 'iterResult'
        ? 2
        : 1
      : (declared?.genericParameters.length ?? 0);
    const arity = argumentsList.length;
    if ((baseType === 'Fn' && arity < expected) || (baseType !== 'Fn' && arity !== expected))
      diagnostics.push(
        createDiagnostic(
          fileName,
          'type-check',
          'FWS-TYPE-008',
          baseType === 'Fn'
            ? 'Fn<...> requires at least one type argument for its result type.'
            : `${baseType}<T> requires ${expected} type argument${expected === 1 ? '' : 's'}.`,
          declarationSpan,
          'error',
          baseType === 'Result' ? 'Use Result<Success, Failure>.' : `Use ${baseType}<Element>.`,
        ),
      );
  }
  for (const argument of argumentsList)
    validateType(argument, fileName, diagnostics, module, genericNames, declarationSpan);
}

function typeNameKey(type: ForgeWebScriptTypeName): string {
  const name = type.reference ?? type.name;
  const generic =
    type.arguments === undefined || type.arguments.length === 0
      ? name
      : `${name}<${type.arguments.map((argument) => typeNameKey(argument)).join(',')}>`;
  return type.length === undefined ? generic : `${generic}[${type.length}]`;
}

function mismatch(
  span: ForgeWebScriptSourceSpan,
  fileName: string,
  diagnostics: ForgeWebScriptDiagnostic[],
  message: string,
): void {
  diagnostics.push(createDiagnostic(fileName, 'type-check', 'FWS-TYPE-005', message, span));
}

function isNumber(type: string): boolean {
  return ['i32', 'i64', 'u32', 'u64', 'f32', 'f64'].includes(type);
}

function isIteratorLike(type: string): boolean {
  return type.startsWith('Iterable<') || type.startsWith('Iterator<');
}

function isOptionType(type: string): boolean {
  return type.startsWith('Option<');
}

function elementType(type: string): string {
  const start = type.indexOf('<');
  return start < 0 ? 'unit' : type.slice(start + 1, type.lastIndexOf('>')) || 'unit';
}

function collectionKind(type: string | undefined): CollectionKind | undefined {
  if (type?.startsWith('Array<')) return 'Array';
  if (type?.startsWith('Vector<')) return 'Vector';
  return undefined;
}

function collectionElementFromType(type: string | undefined): string | undefined {
  return collectionKind(type) === undefined ? undefined : elementType(type!);
}

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
  if (separator < 0) return undefined;
  const parent = receiver.slice(0, separator);
  const memberType = memberReceiverType(parent, locals, callables);
  return receiver.slice(separator + 1) === 'next' && memberType !== undefined && isIteratorLike(memberType)
    ? `Option<${elementType(memberType)}>`
    : undefined;
}

function callableFromType(type: string | undefined): Callable | undefined {
  if (type === undefined || !type.startsWith('Fn<') || !type.endsWith('>')) return undefined;
  const parts = splitGenericArguments(type.slice(3, -1));
  if (parts.length === 0) return undefined;
  return { parameters: parts.slice(0, -1), result: parts[parts.length - 1] };
}

function functionTypeKey(callable: Callable): string {
  return `Fn<${[...callable.parameters, callable.result].join(',')}>`;
}

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

function builtInEnumFields(
  enumName: string,
  variantName: string,
  aggregateType: string | undefined,
): readonly ForgeWebScriptParameter[] | undefined {
  const typeArguments = aggregateType?.startsWith(`${enumName}<`) ? splitGenericArguments(aggregateType.slice(enumName.length + 1, -1)) : [];
  const span = { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 };
  const field = (index: number): ForgeWebScriptParameter => ({
    kind: 'parameter',
    name: 'value',
    type: { kind: 'type-name', name: (typeArguments[index] ?? 'unit') as ForgeWebScriptPrimitiveType, span },
    span,
  });
  if (enumName === 'Option' && variantName === 'Some') return [field(0)];
  if (enumName === 'Option' && variantName === 'None') return [];
  if (enumName === 'Result' && variantName === 'Ok') return [field(0)];
  if (enumName === 'Result' && variantName === 'Error') return [field(1)];
  return undefined;
}

function resolveEnumFieldType(
  type: ForgeWebScriptTypeName,
  declaration: ForgeWebScriptModule['enums'][number] | undefined,
  aggregateType: string | undefined,
): string {
  const name = type.reference ?? type.name;
  const genericIndex = declaration?.genericParameters.findIndex(({ name: genericName }) => genericName === name) ?? -1;
  if (genericIndex >= 0 && aggregateType !== undefined) {
    const enumName = declaration?.name ?? '';
    const arguments_ = aggregateType.startsWith(`${enumName}<`) ? splitGenericArguments(aggregateType.slice(enumName.length + 1, -1)) : [];
    return arguments_[genericIndex] ?? 'unit';
  }
  return typeNameKey(type);
}

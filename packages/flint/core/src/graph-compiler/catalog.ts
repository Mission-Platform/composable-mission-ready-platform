import {
  createContainerType,
  createPrimitiveType,
  type FlintGraphNode,
  type FlintGraphPort,
  type FlintNodeCategory,
  type FlintNodeKind,
} from './types.js';

import type { FlintTypeName } from '../ast.js';

export interface FlintNodeDefinition {
  readonly operation: string;
  readonly title: string;
  readonly category: FlintNodeCategory;
  readonly kind: FlintNodeKind;
  readonly description: string;
  readonly defaultInputs: readonly FlintGraphPort[];
  readonly defaultOutputs: readonly FlintGraphPort[];
  readonly requiredCapabilities?: readonly string[];
  readonly defaultProperties?: Readonly<Record<string, unknown>>;
}

const f32Type = createPrimitiveType('f32');
const typeInt32 = createPrimitiveType('i32');
const typeInt64 = createPrimitiveType('i64');
const f64Type = createPrimitiveType('f64');
const boolType = createPrimitiveType('bool');
const stringType = createPrimitiveType('string');
const unitType = createPrimitiveType('unit');

const vectorI32Type = createContainerType('Vector', [typeInt32]);
const optionI32Type = createContainerType('Option', [typeInt32]);
const resultI32StringType = createContainerType('Result', [typeInt32, stringType]);
const mapStringI32Type = createContainerType('Map', [stringType, typeInt32]);

const DEFINITIONS: readonly FlintNodeDefinition[] = [
  // Graph IO & Constants
  {
    operation: 'input',
    title: 'Graph Input',
    category: 'control',
    kind: 'input',
    description: 'Entry parameter provided to the compiled Flint function.',
    defaultInputs: [],
    defaultOutputs: [{ id: 'value', name: 'value', direction: 'output', type: typeInt32 }],
    defaultProperties: { name: 'input', typeName: 'i32' },
  },
  {
    operation: 'output',
    title: 'Graph Output',
    category: 'control',
    kind: 'output',
    description: 'Final return value produced by the compiled Flint function.',
    defaultInputs: [{ id: 'value', name: 'value', direction: 'input', type: typeInt32, required: true }],
    defaultOutputs: [],
    defaultProperties: { name: 'output', typeName: 'i32' },
  },
  {
    operation: 'constant',
    title: 'Constant Value',
    category: 'control',
    kind: 'constant',
    description: 'Fixed literal value embedded directly into the compiled program.',
    defaultInputs: [],
    defaultOutputs: [{ id: 'value', name: 'value', direction: 'output', type: typeInt32 }],
    defaultProperties: { value: 0, typeName: 'i32' },
  },

  // Math (i32)
  {
    operation: 'add',
    title: 'Add',
    category: 'math',
    kind: 'operation',
    description: 'Computes sum of two numbers (a + b).',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
      { id: 'b', name: 'b', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: typeInt32 }],
  },
  {
    operation: 'subtract',
    title: 'Subtract',
    category: 'math',
    kind: 'operation',
    description: 'Computes difference of two numbers (a - b).',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
      { id: 'b', name: 'b', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: typeInt32 }],
  },
  {
    operation: 'multiply',
    title: 'Multiply',
    category: 'math',
    kind: 'operation',
    description: 'Computes product of two numbers (a * b).',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 1, required: true },
      { id: 'b', name: 'b', direction: 'input', type: typeInt32, defaultValue: 1, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: typeInt32 }],
  },
  {
    operation: 'divide',
    title: 'Divide',
    category: 'math',
    kind: 'operation',
    description: 'Computes quotient of two numbers (a / b).',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 1, required: true },
      { id: 'b', name: 'b', direction: 'input', type: typeInt32, defaultValue: 1, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: typeInt32 }],
  },
  {
    operation: 'negate',
    title: 'Negate',
    category: 'math',
    kind: 'operation',
    description: 'Negates a numeric value (-a).',
    defaultInputs: [{ id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 0, required: true }],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: typeInt32 }],
  },
  {
    operation: 'abs',
    title: 'Absolute Value',
    category: 'math',
    kind: 'operation',
    description: 'Returns the absolute value of a number.',
    defaultInputs: [{ id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 0, required: true }],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: typeInt32 }],
  },
  {
    operation: 'min',
    title: 'Minimum',
    category: 'math',
    kind: 'operation',
    description: 'Returns the smaller of two numbers.',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
      { id: 'b', name: 'b', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: typeInt32 }],
  },
  {
    operation: 'max',
    title: 'Maximum',
    category: 'math',
    kind: 'operation',
    description: 'Returns the larger of two numbers.',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
      { id: 'b', name: 'b', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: typeInt32 }],
  },

  // Integer Math (i32)
  {
    operation: 'add_i32',
    title: 'Add (i32)',
    category: 'math',
    kind: 'operation',
    description: 'Computes sum of two 32-bit integers.',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
      { id: 'b', name: 'b', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: typeInt32 }],
  },
  {
    operation: 'subtract_i32',
    title: 'Subtract (i32)',
    category: 'math',
    kind: 'operation',
    description: 'Computes difference of two 32-bit integers.',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
      { id: 'b', name: 'b', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: typeInt32 }],
  },
  {
    operation: 'multiply_i32',
    title: 'Multiply (i32)',
    category: 'math',
    kind: 'operation',
    description: 'Computes product of two 32-bit integers.',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 1, required: true },
      { id: 'b', name: 'b', direction: 'input', type: typeInt32, defaultValue: 1, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: typeInt32 }],
  },
  {
    operation: 'divide_i32',
    title: 'Divide (i32)',
    category: 'math',
    kind: 'operation',
    description: 'Computes integer quotient of two 32-bit integers.',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 1, required: true },
      { id: 'b', name: 'b', direction: 'input', type: typeInt32, defaultValue: 1, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: typeInt32 }],
  },
  {
    operation: 'modulo',
    title: 'Modulo (i32)',
    category: 'math',
    kind: 'operation',
    description: 'Computes integer remainder (a % b).',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
      { id: 'b', name: 'b', direction: 'input', type: typeInt32, defaultValue: 1, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: typeInt32 }],
  },

  // Logic & Comparison
  {
    operation: 'and',
    title: 'Logical AND',
    category: 'logic',
    kind: 'operation',
    description: 'Computes logical conjunction (a && b).',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: boolType, defaultValue: false, required: true },
      { id: 'b', name: 'b', direction: 'input', type: boolType, defaultValue: false, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: boolType }],
  },
  {
    operation: 'or',
    title: 'Logical OR',
    category: 'logic',
    kind: 'operation',
    description: 'Computes logical disjunction (a || b).',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: boolType, defaultValue: false, required: true },
      { id: 'b', name: 'b', direction: 'input', type: boolType, defaultValue: false, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: boolType }],
  },
  {
    operation: 'not',
    title: 'Logical NOT',
    category: 'logic',
    kind: 'operation',
    description: 'Inverts a boolean value (!a).',
    defaultInputs: [{ id: 'a', name: 'a', direction: 'input', type: boolType, defaultValue: false, required: true }],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: boolType }],
  },
  {
    operation: 'equals',
    title: 'Equals (==)',
    category: 'logic',
    kind: 'operation',
    description: 'Checks if two numbers are equal.',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: f32Type, defaultValue: 0, required: true },
      { id: 'b', name: 'b', direction: 'input', type: f32Type, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: boolType }],
  },
  {
    operation: 'not_equals',
    title: 'Not Equals (!=)',
    category: 'logic',
    kind: 'operation',
    description: 'Checks if two numbers are not equal.',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: f32Type, defaultValue: 0, required: true },
      { id: 'b', name: 'b', direction: 'input', type: f32Type, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: boolType }],
  },
  {
    operation: 'greater_than',
    title: 'Greater Than (>)',
    category: 'logic',
    kind: 'operation',
    description: 'Checks if a is strictly greater than b.',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: f32Type, defaultValue: 0, required: true },
      { id: 'b', name: 'b', direction: 'input', type: f32Type, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: boolType }],
  },
  {
    operation: 'less_than',
    title: 'Less Than (<)',
    category: 'logic',
    kind: 'operation',
    description: 'Checks if a is strictly less than b.',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: f32Type, defaultValue: 0, required: true },
      { id: 'b', name: 'b', direction: 'input', type: f32Type, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: boolType }],
  },
  {
    operation: 'greater_or_equal',
    title: 'Greater or Equal (>=)',
    category: 'logic',
    kind: 'operation',
    description: 'Checks if a is greater than or equal to b.',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: f32Type, defaultValue: 0, required: true },
      { id: 'b', name: 'b', direction: 'input', type: f32Type, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: boolType }],
  },
  {
    operation: 'less_or_equal',
    title: 'Less or Equal (<=)',
    category: 'logic',
    kind: 'operation',
    description: 'Checks if a is less than or equal to b.',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: f32Type, defaultValue: 0, required: true },
      { id: 'b', name: 'b', direction: 'input', type: f32Type, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: boolType }],
  },

  // Text & Strings
  {
    operation: 'concat',
    title: 'Concatenate Strings',
    category: 'text',
    kind: 'operation',
    description: 'Combines two strings into one (a + b).',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: stringType, defaultValue: '', required: true },
      { id: 'b', name: 'b', direction: 'input', type: stringType, defaultValue: '', required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: stringType }],
  },
  {
    operation: 'string_length',
    title: 'String Length',
    category: 'text',
    kind: 'operation',
    description: 'Returns the character length of a string.',
    defaultInputs: [
      { id: 'value', name: 'value', direction: 'input', type: stringType, defaultValue: '', required: true },
    ],
    defaultOutputs: [{ id: 'length', name: 'length', direction: 'output', type: typeInt32 }],
  },
  {
    operation: 'to_string_f32',
    title: 'To String (f32)',
    category: 'text',
    kind: 'operation',
    description: 'Formats a 32-bit float into a string.',
    defaultInputs: [{ id: 'value', name: 'value', direction: 'input', type: f32Type, defaultValue: 0, required: true }],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: stringType }],
  },
  {
    operation: 'to_string_i32',
    title: 'To String (i32)',
    category: 'text',
    kind: 'operation',
    description: 'Formats a 32-bit integer into a string.',
    defaultInputs: [
      { id: 'value', name: 'value', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: stringType }],
  },

  // Collections (Standard Library)
  {
    operation: 'vector_new',
    title: 'Vector.new',
    category: 'collection',
    kind: 'stdlib_call',
    description: 'Instantiates a new empty Vector<i32>.',
    defaultInputs: [],
    defaultOutputs: [{ id: 'vector', name: 'vector', direction: 'output', type: vectorI32Type }],
  },
  {
    operation: 'vector_push',
    title: 'Vector.push',
    category: 'collection',
    kind: 'stdlib_call',
    description: 'Appends an integer item to a Vector.',
    defaultInputs: [
      { id: 'vector', name: 'vector', direction: 'input', type: vectorI32Type, required: true },
      { id: 'item', name: 'item', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'vector', name: 'vector', direction: 'output', type: vectorI32Type }],
  },
  {
    operation: 'vector_get',
    title: 'Vector.get',
    category: 'collection',
    kind: 'stdlib_call',
    description: 'Retrieves an element at the given index as an Option<i32>.',
    defaultInputs: [
      { id: 'vector', name: 'vector', direction: 'input', type: vectorI32Type, required: true },
      { id: 'index', name: 'index', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: optionI32Type }],
  },
  {
    operation: 'vector_len',
    title: 'Vector.len',
    category: 'collection',
    kind: 'stdlib_call',
    description: 'Returns the number of elements inside the vector.',
    defaultInputs: [{ id: 'vector', name: 'vector', direction: 'input', type: vectorI32Type, required: true }],
    defaultOutputs: [{ id: 'len', name: 'len', direction: 'output', type: typeInt32 }],
  },
  {
    operation: 'option_some',
    title: 'Option.Some',
    category: 'collection',
    kind: 'stdlib_call',
    description: 'Wraps a value into an Option.Some container.',
    defaultInputs: [
      { id: 'value', name: 'value', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'option', name: 'option', direction: 'output', type: optionI32Type }],
  },
  {
    operation: 'option_none',
    title: 'Option.None',
    category: 'collection',
    kind: 'stdlib_call',
    description: 'Creates an empty Option container.',
    defaultInputs: [],
    defaultOutputs: [{ id: 'option', name: 'option', direction: 'output', type: optionI32Type }],
  },
  {
    operation: 'option_unwrap_or',
    title: 'Option.unwrapOr',
    category: 'collection',
    kind: 'stdlib_call',
    description: 'Unwraps the option value or returns the fallback.',
    defaultInputs: [
      { id: 'option', name: 'option', direction: 'input', type: optionI32Type, required: true },
      { id: 'fallback', name: 'fallback', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: typeInt32 }],
  },
  {
    operation: 'option_is_some',
    title: 'Option.isSome',
    category: 'collection',
    kind: 'stdlib_call',
    description: 'Checks if an Option contains a value.',
    defaultInputs: [{ id: 'option', name: 'option', direction: 'input', type: optionI32Type, required: true }],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: boolType }],
  },
  {
    operation: 'result_ok',
    title: 'Result.Ok',
    category: 'collection',
    kind: 'stdlib_call',
    description: 'Wraps a value in a successful Result.Ok container.',
    defaultInputs: [
      { id: 'value', name: 'value', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: resultI32StringType }],
  },
  {
    operation: 'result_err',
    title: 'Result.Err',
    category: 'collection',
    kind: 'stdlib_call',
    description: 'Wraps an error string in an unsuccessful Result.Err container.',
    defaultInputs: [
      { id: 'error', name: 'error', direction: 'input', type: stringType, defaultValue: 'Error', required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: resultI32StringType }],
  },
  {
    operation: 'result_is_ok',
    title: 'Result.isOk',
    category: 'collection',
    kind: 'stdlib_call',
    description: 'Returns true if Result is Ok.',
    defaultInputs: [{ id: 'result', name: 'result', direction: 'input', type: resultI32StringType, required: true }],
    defaultOutputs: [{ id: 'is_ok', name: 'is_ok', direction: 'output', type: boolType }],
  },
  {
    operation: 'map_new',
    title: 'Map.new',
    category: 'collection',
    kind: 'stdlib_call',
    description: 'Instantiates a new empty Map<string, i32>.',
    defaultInputs: [],
    defaultOutputs: [{ id: 'map', name: 'map', direction: 'output', type: mapStringI32Type }],
  },
  {
    operation: 'map_insert',
    title: 'Map.insert',
    category: 'collection',
    kind: 'stdlib_call',
    description: 'Inserts or updates a key-value entry in the Map.',
    defaultInputs: [
      { id: 'map', name: 'map', direction: 'input', type: mapStringI32Type, required: true },
      { id: 'key', name: 'key', direction: 'input', type: stringType, defaultValue: '', required: true },
      { id: 'value', name: 'value', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'map', name: 'map', direction: 'output', type: mapStringI32Type }],
  },
  {
    operation: 'map_get',
    title: 'Map.get',
    category: 'collection',
    kind: 'stdlib_call',
    description: 'Retrieves a value from the Map by key.',
    defaultInputs: [
      { id: 'map', name: 'map', direction: 'input', type: mapStringI32Type, required: true },
      { id: 'key', name: 'key', direction: 'input', type: stringType, defaultValue: '', required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: optionI32Type }],
  },

  // Control Flow
  {
    operation: 'branch_if',
    title: 'Branch (If/Else)',
    category: 'control',
    kind: 'operation',
    description: 'Selects thenValue when condition is true, otherwise elseValue.',
    defaultInputs: [
      { id: 'condition', name: 'condition', direction: 'input', type: boolType, defaultValue: false, required: true },
      { id: 'thenValue', name: 'thenValue', direction: 'input', type: f32Type, defaultValue: 0, required: true },
      { id: 'elseValue', name: 'elseValue', direction: 'input', type: f32Type, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: f32Type }],
  },

  // Host Capabilities
  {
    operation: 'clock_now',
    title: 'Host Clock Now',
    category: 'capability',
    kind: 'capability_call',
    description: 'Requests current epoch millisecond timestamp from host capability "clock.now".',
    defaultInputs: [],
    defaultOutputs: [{ id: 'timestamp', name: 'timestamp', direction: 'output', type: typeInt64 }],
    requiredCapabilities: ['clock.now'],
  },
  {
    operation: 'random_f64',
    title: 'Host Random Float',
    category: 'capability',
    kind: 'capability_call',
    description: 'Generates a random float from host capability "random.f64".',
    defaultInputs: [],
    defaultOutputs: [{ id: 'value', name: 'value', direction: 'output', type: f64Type }],
    requiredCapabilities: ['random.f64'],
  },
  {
    operation: 'log_debug',
    title: 'Host Log Debug',
    category: 'capability',
    kind: 'capability_call',
    description: 'Dispatches message to host capability "env.log".',
    defaultInputs: [
      { id: 'message', name: 'message', direction: 'input', type: stringType, defaultValue: '', required: true },
    ],
    defaultOutputs: [{ id: 'ack', name: 'ack', direction: 'output', type: unitType }],
    requiredCapabilities: ['env.log'],
  },

  // Multi-Output Operations (Records / Split Outputs)
  {
    operation: 'div_rem',
    title: 'Divide & Remainder',
    category: 'math',
    kind: 'operation',
    description: 'Computes quotient and remainder of division as a record with split output fields.',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 10, required: true },
      { id: 'b', name: 'b', direction: 'input', type: typeInt32, defaultValue: 3, required: true },
    ],
    defaultOutputs: [
      { id: 'quotient', name: 'quotient', direction: 'output', type: typeInt32 },
      { id: 'remainder', name: 'remainder', direction: 'output', type: typeInt32 },
    ],
    defaultProperties: { splitOutputs: true },
  },
  {
    operation: 'min_max',
    title: 'Min & Max',
    category: 'math',
    kind: 'operation',
    description: 'Computes both minimum and maximum of two values.',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
      { id: 'b', name: 'b', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
    ],
    defaultOutputs: [
      { id: 'min', name: 'min', direction: 'output', type: typeInt32 },
      { id: 'max', name: 'max', direction: 'output', type: typeInt32 },
    ],
    defaultProperties: { splitOutputs: true },
  },

  // Custom Flint Code
  {
    operation: 'flint_code',
    title: 'Custom Flint Code',
    category: 'custom',
    kind: 'custom',
    description: 'User-defined Flint function with configurable inputs and outputs.',
    defaultInputs: [
      { id: 'a', name: 'a', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
      { id: 'b', name: 'b', direction: 'input', type: typeInt32, defaultValue: 0, required: true },
    ],
    defaultOutputs: [{ id: 'result', name: 'result', direction: 'output', type: typeInt32 }],
    defaultProperties: {
      code: 'fn custom_fn(a: i32, b: i32) -> i32 {\n  return a + b;\n}',
      functionName: 'custom_fn',
    },
  },
] satisfies readonly FlintNodeDefinition[];

const DEFINITION_MAP = new Map<string, FlintNodeDefinition>(
  DEFINITIONS.map((definition) => [definition.operation, definition]),
);

/**
 * Retrieves a standard node definition by its unique operation identifier.
 */
export function getNodeDefinition(operation: string): FlintNodeDefinition | undefined {
  return DEFINITION_MAP.get(operation);
}

/**
 * Returns all registered standard node definitions.
 */
export function getAllNodeDefinitions(): readonly FlintNodeDefinition[] {
  return DEFINITIONS;
}

/**
 * Returns node definitions filtered by category.
 */
export function getNodeDefinitionsByCategory(category: FlintNodeCategory): readonly FlintNodeDefinition[] {
  return DEFINITIONS.filter((definition) => definition.category === category);
}

const DEFAULT_NODE_POSITION = { x: 0, y: 0 } as const;

function isFlintTypeName(value: unknown): value is FlintTypeName {
  return typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'type-name';
}

const PRIMITIVE_NAMES = new Set(['bool', 'bytes', 'f32', 'f64', 'i32', 'i64', 'string', 'u32', 'u64', 'unit']);

function isFlintPrimitiveType(value: unknown): value is Parameters<typeof createPrimitiveType>[0] {
  return typeof value === 'string' && PRIMITIVE_NAMES.has(value);
}

/**
 * Instantiates a FlintGraphNode from a catalog definition with given ID, position, and property overrides.
 */
export function createNodeFromDefinition(
  definition: FlintNodeDefinition,
  id: string,
  position: { readonly x: number; readonly y: number } = DEFAULT_NODE_POSITION,
  properties?: Readonly<Record<string, unknown>>,
): FlintGraphNode {
  const mergedProperties: Record<string, unknown> = {
    ...definition.defaultProperties,
    ...properties,
  };

  let typeOverride: FlintTypeName | undefined;
  if (isFlintTypeName(mergedProperties.type)) {
    typeOverride = mergedProperties.type;
  } else if (isFlintPrimitiveType(mergedProperties.typeName)) {
    typeOverride = createPrimitiveType(mergedProperties.typeName);
  }

  const inputs = definition.defaultInputs.map((port) =>
    definition.kind === 'output' && typeOverride ? { ...port, type: typeOverride } : { ...port },
  );

  const outputs = definition.defaultOutputs.map((port) =>
    definition.kind === 'input' && typeOverride ? { ...port, type: typeOverride } : { ...port },
  );

  const splitOutputs =
    mergedProperties.splitOutputs === undefined
      ? outputs.length > 1
        ? true
        : undefined
      : Boolean(mergedProperties.splitOutputs);

  return {
    id,
    title: definition.title,
    category: definition.category,
    kind: definition.kind,
    operation: definition.operation,
    inputs,
    outputs,
    position,
    properties: mergedProperties,
    splitOutputs,
  };
}

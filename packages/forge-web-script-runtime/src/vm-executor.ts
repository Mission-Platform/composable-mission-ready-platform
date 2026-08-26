import { ForgeWebScriptMemory } from './memory.js';
import { createForgeWebScriptTraceRecorder, summarizeForgeWebScriptVmValue } from './trace.js';
import { attachForgeWebScriptTrace, toForgeWebScriptHostError, ForgeWebScriptTrap } from './traps.js';
import { prepareForgeWebScriptVmWasm } from './vm-wasm.js';

import type {
  ForgeWebScriptVmAotArtifact,
  ForgeWebScriptVmCapabilityImport,
  ForgeWebScriptVmExecutionMode,
  ForgeWebScriptVmExecutionOptions,
  ForgeWebScriptVmExecutionResult,
  ForgeWebScriptVmExecutor,
  ForgeWebScriptVmFunction,
  ForgeWebScriptVmInstruction,
  ForgeWebScriptVmJitCache,
  ForgeWebScriptVmJitEntry,
  ForgeWebScriptVmModule,
  ForgeWebScriptVmPreparedExecutor,
  ForgeWebScriptVmPreparedExecutorOptions,
  ForgeWebScriptVmValue,
} from './vm.js';

const PAGE_SIZE = 65_536;
const DEFAULT_COMPILER_VERSION = '0.1.0';
const DEFAULT_JIT_THRESHOLD = 3;

/** Bit-exact ToInt32 used by 32-bit VM arithmetic (Wasm i32 semantics). */
function toInt32(value: number): number {
  // eslint-disable-next-line unicorn/prefer-math-trunc -- intentional ToInt32 wrap
  return value | 0;
}

export interface ForgeWebScriptVmExecutorOptions {
  readonly compilerVersion?: string;
  readonly jitThreshold?: number;
}

interface ExecutionState {
  readonly module: ForgeWebScriptVmModule;
  readonly options: ForgeWebScriptVmExecutionOptions;
  readonly memory: ForgeWebScriptMemory;
  steps: number;
  readonly trace?: ReturnType<typeof createForgeWebScriptTraceRecorder>;
}

type NumericType = Extract<ForgeWebScriptVmValue, { readonly kind: 'number' }>['type'];

function trap(message: string): ForgeWebScriptTrap {
  return new ForgeWebScriptTrap('GuestTrap', message);
}

function failInvalidModule(message: string): never {
  throw new ForgeWebScriptTrap('InvalidAbi', `Invalid VM module: ${message}`);
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Uint8Array) return [...value];
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function hashText(value: string): string {
  let hash = 2_166_136_261;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= byte;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function hashFunction(function_: ForgeWebScriptVmFunction): string {
  return hashText(JSON.stringify(canonicalize(function_)));
}

function aotHash(artifact: Omit<ForgeWebScriptVmAotArtifact, 'reproducibilityHash'>): string {
  return hashText(JSON.stringify(canonicalize({ ...artifact, reproducibilityHash: '' })));
}

function cloneValue(value: ForgeWebScriptVmValue): ForgeWebScriptVmValue {
  if (value.kind === 'aggregate') return { ...value, bytes: new Uint8Array(value.bytes) };
  return value;
}

function isValue(value: unknown): value is ForgeWebScriptVmValue {
  if (value === null || typeof value !== 'object' || typeof (value as { kind?: unknown }).kind !== 'string')
    return false;
  const candidate = value as ForgeWebScriptVmValue;
  if (candidate.kind === 'unit' || candidate.kind === 'bool' || candidate.kind === 'function') return true;
  if (candidate.kind === 'number') return typeof candidate.value === 'number' || typeof candidate.value === 'bigint';
  return candidate.kind === 'bytes' || candidate.kind === 'aggregate';
}

function valueTypeMatches(value: ForgeWebScriptVmValue, type: string): boolean {
  if (type === 'unit') return value.kind === 'unit';
  if (type === 'bool') return value.kind === 'bool';
  if (type === 'string' || type === 'bytes') return value.kind === 'bytes';
  if (value.kind === 'aggregate') return value.layout === type;
  if (value.kind === 'function') return value.functionName === type;
  return value.kind === 'number' && value.type === type;
}

export function validateForgeWebScriptVmModule(module: ForgeWebScriptVmModule): void {
  if (module.format !== 'forge-web-script-vm-module' || module.version !== '1.0')
    failInvalidModule('unsupported format or version');
  if (module.memory.pageSize !== PAGE_SIZE || module.memory.addressType !== 'u32')
    failInvalidModule('unsupported memory layout');
  if (
    module.memory.allocatorExport !== 'fws_alloc' ||
    module.memory.deallocatorExport !== 'fws_dealloc' ||
    module.memory.reallocatorExport !== 'fws_realloc'
  )
    failInvalidModule('allocator exports do not match the v1.2 ABI');

  const functions = new Set<string>();
  if (module.constants.some((constant) => !isValue(constant))) failInvalidModule('constants must be valid VM values');
  for (const function_ of module.functions) {
    if (functions.has(function_.name)) failInvalidModule(`duplicate function '${function_.name}'`);
    functions.add(function_.name);
    if (!Number.isSafeInteger(function_.registers) || function_.registers < function_.parameters.length)
      failInvalidModule(`invalid register count for '${function_.name}'`);
    for (const instruction of function_.code) {
      const registers = instructionRegisters(instruction);
      if (registers.some((register) => register < 0 || register >= function_.registers))
        failInvalidModule(`instruction register is outside '${function_.name}'`);
      if (
        (instruction.opcode === 'branch' && (instruction.ifTrue < 0 || instruction.ifFalse < 0)) ||
        (instruction.opcode === 'jump' && instruction.target < 0)
      )
        failInvalidModule(`negative control-flow target in '${function_.name}'`);
      if (
        instruction.opcode === 'branch' &&
        (instruction.ifTrue >= function_.code.length || instruction.ifFalse >= function_.code.length)
      )
        failInvalidModule(`branch target is outside '${function_.name}'`);
      if (instruction.opcode === 'jump' && instruction.target >= function_.code.length)
        failInvalidModule(`jump target is outside '${function_.name}'`);
      if (
        instruction.opcode === 'const' &&
        (instruction.constant < 0 || instruction.constant >= module.constants.length)
      )
        failInvalidModule(`constant index is outside '${function_.name}'`);
      if (
        (instruction.opcode === 'bytes-from-memory' || instruction.opcode === 'aggregate-from-memory') &&
        instruction.ownership !== undefined &&
        instruction.ownership !== 'borrowed' &&
        instruction.ownership !== 'owned' &&
        instruction.ownership !== 'shared'
      )
        failInvalidModule(`invalid memory value ownership in '${function_.name}'`);
      if (instruction.opcode === 'aggregate-from-memory' && instruction.layout.length === 0)
        failInvalidModule(`aggregate memory layout is empty in '${function_.name}'`);
    }
  }
  const imports = new Set<string>();
  for (const imported of module.capabilityImports) {
    if (imports.has(imported.name)) failInvalidModule(`duplicate capability import '${imported.name}'`);
    imports.add(imported.name);
  }
}

function instructionRegisters(instruction: ForgeWebScriptVmInstruction): readonly number[] {
  switch (instruction.opcode) {
    case 'const':
    case 'jump':
    case 'trap': {
      return instruction.opcode === 'const' && instruction.destination !== undefined ? [instruction.destination] : [];
    }
    case 'move': {
      return [instruction.destination, instruction.source];
    }
    case 'load': {
      return [instruction.destination];
    }
    case 'store': {
      return [instruction.source];
    }
    case 'alloc': {
      return [instruction.destination, instruction.size];
    }
    case 'bytes-from-memory':
    case 'aggregate-from-memory': {
      return [instruction.destination, instruction.pointer, instruction.length];
    }
    case 'write-bytes': {
      return [instruction.pointer, instruction.source];
    }
    case 'len': {
      return [instruction.destination, instruction.source];
    }
    case 'byte-at': {
      return [instruction.destination, instruction.source, instruction.index];
    }
    case 'unary': {
      return [instruction.destination, instruction.operand];
    }
    case 'binary': {
      return [instruction.destination, instruction.left, instruction.right];
    }
    case 'call':
    case 'call-capability': {
      return [instruction.destination, ...instruction.arguments].filter(
        (register): register is number => register !== undefined,
      );
    }
    case 'branch': {
      return [instruction.condition];
    }
    case 'return': {
      return instruction.source === undefined ? [] : [instruction.source];
    }
  }
}

function valueBytes(value: ForgeWebScriptVmValue, memory: ForgeWebScriptMemory): Uint8Array {
  if (value.kind === 'aggregate') return value.bytes;
  if (value.kind === 'bytes') return memory.readBytes(value.pointer, value.length);
  throw trap('Expected a bytes or aggregate VM value with a byte payload.');
}

function pointer(value: ForgeWebScriptVmValue): number {
  const numeric = asNumber(value);
  const result = Number(numeric.value);
  if (!Number.isSafeInteger(result) || result < 0) throw trap('Expected a non-negative integer memory pointer.');
  return result;
}

function asNumber(value: ForgeWebScriptVmValue): Extract<ForgeWebScriptVmValue, { readonly kind: 'number' }> {
  if (value.kind !== 'number') throw trap('Expected a numeric VM value.');
  return value;
}

function normalizeNumber(type: NumericType, value: number | bigint): number | bigint {
  if (type === 'f32') return Math.fround(Number(value));
  if (type === 'f64') return Number(value);
  if (type === 'i64' || type === 'u64') {
    const bits = type === 'i64' ? 64n : 64n;
    const unsigned = BigInt.asUintN(Number(bits), BigInt(value));
    return type === 'i64' ? BigInt.asIntN(64, unsigned) : unsigned;
  }
  const integer = BigInt(value);
  if (type === 'i32') return Number(BigInt.asIntN(32, integer));
  return Number(BigInt.asUintN(32, integer));
}

function numericValue(type: NumericType, value: number | bigint): ForgeWebScriptVmValue {
  return { kind: 'number', type, value: normalizeNumber(type, value) };
}

function compareValues(left: ForgeWebScriptVmValue, right: ForgeWebScriptVmValue): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === 'number' && right.kind === 'number') return left.type === right.type && left.value === right.value;
  if (left.kind === 'bool' && right.kind === 'bool') return left.value === right.value;
  if (left.kind === 'function' && right.kind === 'function') return left.functionName === right.functionName;
  if (left.kind === 'unit' && right.kind === 'unit') return true;
  if (left.kind === 'bytes' && right.kind === 'bytes')
    return left.pointer === right.pointer && left.length === right.length;
  if (left.kind === 'aggregate' && right.kind === 'aggregate')
    return left.layout === right.layout && left.bytes.every((byte, index) => byte === right.bytes[index]);
  return false;
}

function binary(operation: string, left: ForgeWebScriptVmValue, right: ForgeWebScriptVmValue): ForgeWebScriptVmValue {
  if (operation === '==' || operation === '===') return { kind: 'bool', value: compareValues(left, right) };
  if (operation === '!=' || operation === '!==') return { kind: 'bool', value: !compareValues(left, right) };
  if (left.kind === 'bool' && right.kind === 'bool') {
    if (operation === '&&') return { kind: 'bool', value: left.value && right.value };
    if (operation === '||') return { kind: 'bool', value: left.value || right.value };
  }
  const leftNumber = asNumber(left);
  const rightNumber = asNumber(right);
  if (leftNumber.type !== rightNumber.type) throw trap('Numeric VM values must have matching types.');
  const type = leftNumber.type;
  const l = leftNumber.value;
  const r = rightNumber.value;
  if (['<', '<=', '>', '>='].includes(operation)) {
    const value = operation === '<' ? l < r : operation === '<=' ? l <= r : operation === '>' ? l > r : l >= r;
    return { kind: 'bool', value };
  }
  if (typeof l === 'bigint' || typeof r === 'bigint') {
    const leftBig = BigInt(l);
    const rightBig = BigInt(r);
    if ((operation === '/' || operation === '%') && rightBig === 0n) throw trap('Division by zero.');
    const value =
      operation === '+'
        ? leftBig + rightBig
        : operation === '-'
          ? leftBig - rightBig
          : operation === '*'
            ? leftBig * rightBig
            : operation === '/'
              ? leftBig / rightBig
              : operation === '%'
                ? leftBig % rightBig
                : operation === '&'
                  ? leftBig & rightBig
                  : operation === '|'
                    ? leftBig | rightBig
                    : operation === '^'
                      ? leftBig ^ rightBig
                      : operation === '<<'
                        ? leftBig << rightBig
                        : operation === '>>'
                          ? leftBig >> rightBig
                          : undefined;
    if (value === undefined) throw trap(`Unsupported numeric operation '${operation}'.`);
    return numericValue(type, value);
  }
  if ((operation === '/' || operation === '%') && r === 0) throw trap('Division by zero.');
  // Keep 32-bit integer ops bit-exact (Math.imul / ToInt32) so bootstrap hashes match the seed.
  if (type === 'i32' || type === 'u32') {
    const left32 = toInt32(Number(l));
    const right32 = toInt32(Number(r));
    const value =
      operation === '+'
        ? toInt32(left32 + right32)
        : operation === '-'
          ? toInt32(left32 - right32)
          : operation === '*'
            ? Math.imul(left32, right32)
            : operation === '/'
              ? toInt32(left32 / right32)
              : operation === '%'
                ? left32 % right32
                : operation === '&'
                  ? left32 & right32
                  : operation === '|'
                    ? left32 | right32
                    : operation === '^'
                      ? left32 ^ right32
                      : operation === '<<'
                        ? left32 << right32
                        : operation === '>>'
                          ? left32 >> right32
                          : undefined;
    if (value === undefined) throw trap(`Unsupported numeric operation '${operation}'.`);
    return numericValue(type, type === 'u32' ? value >>> 0 : value);
  }
  const value =
    operation === '+'
      ? l + r
      : operation === '-'
        ? l - r
        : operation === '*'
          ? l * r
          : operation === '/'
            ? l / r
            : operation === '%'
              ? l % r
              : operation === '&'
                ? l & r
                : operation === '|'
                  ? l | r
                  : operation === '^'
                    ? l ^ r
                    : operation === '<<'
                      ? l << r
                      : operation === '>>'
                        ? l >> r
                        : undefined;
  if (value === undefined) throw trap(`Unsupported numeric operation '${operation}'.`);
  return numericValue(type, value);
}

function readNumber(memory: ForgeWebScriptMemory, address: number, type: NumericType): ForgeWebScriptVmValue {
  const bytes = memory.readBytes(address, type === 'f32' || type === 'i32' || type === 'u32' ? 4 : 8);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const value =
    type === 'f32'
      ? view.getFloat32(0, true)
      : type === 'f64'
        ? view.getFloat64(0, true)
        : type === 'i32'
          ? view.getInt32(0, true)
          : type === 'u32'
            ? view.getUint32(0, true)
            : type === 'i64'
              ? view.getBigInt64(0, true)
              : view.getBigUint64(0, true);
  return numericValue(type, value);
}

function writeNumber(
  memory: ForgeWebScriptMemory,
  address: number,
  value: Extract<ForgeWebScriptVmValue, { readonly kind: 'number' }>,
): void {
  const size = value.type === 'f32' || value.type === 'i32' || value.type === 'u32' ? 4 : 8;
  memory.checkRange(address, size);
  const bytes = new ArrayBuffer(size);
  const view = new DataView(bytes);
  switch (value.type) {
    case 'f32': {
      view.setFloat32(0, Number(value.value), true);
      break;
    }
    case 'f64': {
      view.setFloat64(0, Number(value.value), true);
      break;
    }
    case 'i32': {
      view.setInt32(0, Number(value.value), true);
      break;
    }
    case 'u32': {
      view.setUint32(0, Number(value.value), true);
      break;
    }
    case 'i64': {
      view.setBigInt64(0, BigInt(value.value), true);
      break;
    }
    default: {
      view.setBigUint64(0, BigInt(value.value), true);
    }
  }
  memory.writeBytes(address, new Uint8Array(bytes));
}

function findCapability(module: ForgeWebScriptVmModule, name: string): ForgeWebScriptVmCapabilityImport {
  const imported = module.capabilityImports.find((candidate) => candidate.name === name);
  if (imported === undefined)
    throw new ForgeWebScriptTrap('CapabilityDenied', `Capability '${name}' is not declared.`, name);
  return imported;
}

function sourceFor(function_: ForgeWebScriptVmFunction, instruction: number) {
  return function_.debugSpans.find((span) => span.instruction === instruction);
}

function observe(callback: () => void): void {
  try {
    callback();
  } catch {
    // Observability must never alter guest behavior.
  }
}

function executeFunction(
  function_: ForgeWebScriptVmFunction,
  arguments_: readonly ForgeWebScriptVmValue[],
  state: ExecutionState,
  executeNamed: (
    name: string,
    arguments_: readonly ForgeWebScriptVmValue[],
    state: ExecutionState,
  ) => ForgeWebScriptVmValue,
): ForgeWebScriptVmValue {
  if (arguments_.length !== function_.parameters.length)
    throw trap(`Function '${function_.name}' received an invalid argument count.`);
  for (const [index, argument] of arguments_.entries())
    if (!valueTypeMatches(argument, function_.parameters[index]))
      throw trap(`Function '${function_.name}' received an argument with an invalid type.`);
  const registers = Array.from({ length: function_.registers }, () => ({ kind: 'unit' }) as ForgeWebScriptVmValue);
  for (const [index, argument] of arguments_.entries()) registers[index] = cloneValue(argument);
  let instructionPointer = 0;
  while (instructionPointer < function_.code.length) {
    state.steps += 1;
    observe(() =>
      state.trace?.recordInstruction(
        function_.name,
        instructionPointer,
        state.steps,
        sourceFor(function_, instructionPointer),
      ),
    );
    if (state.options.maxSteps !== undefined && state.steps > state.options.maxSteps) {
      observe(() => state.trace?.recordResource('steps', state.steps, 'limit-exceeded'));
      throw trap('VM execution exceeded the step limit.');
    }
    const instruction = function_.code[instructionPointer];
    switch (instruction.opcode) {
      case 'const': {
        registers[instruction.destination ?? 0] = cloneValue(state.module.constants[instruction.constant]);
        instructionPointer += 1;
        break;
      }
      case 'move': {
        registers[instruction.destination] = cloneValue(registers[instruction.source]);
        instructionPointer += 1;
        break;
      }
      case 'load': {
        if (instruction.type !== 'number') throw trap(`Loading VM value kind '${instruction.type}' is not supported.`);
        registers[instruction.destination] = readNumber(
          state.memory,
          instruction.address,
          instruction.numberType ?? 'i32',
        );
        instructionPointer += 1;
        break;
      }
      case 'store': {
        const value = registers[instruction.source];
        if (value.kind === 'number') writeNumber(state.memory, instruction.address, value);
        else if (value.kind === 'bool') {
          state.memory.checkRange(instruction.address, 4);
          const view = new DataView(new ArrayBuffer(4));
          view.setInt32(0, value.value ? 1 : 0, true);
          state.memory.writeBytes(instruction.address, new Uint8Array(view.buffer));
        } else throw trap('Only numeric and boolean VM values can be stored in linear memory.');
        instructionPointer += 1;
        break;
      }
      case 'alloc': {
        const size = asNumber(registers[instruction.size]);
        const numericSize = Number(size.value);
        if (!Number.isSafeInteger(numericSize) || numericSize < 0)
          throw trap('Memory allocation size must be a non-negative integer.');
        const allocated = state.memory.allocate(numericSize);
        registers[instruction.destination] = numericValue('u32', Number(allocated));
        instructionPointer += 1;
        break;
      }
      case 'bytes-from-memory': {
        const memoryPointer = pointer(registers[instruction.pointer]);
        const memoryLength = pointer(registers[instruction.length]);
        state.memory.checkRange(memoryPointer, memoryLength);
        registers[instruction.destination] = {
          kind: 'bytes',
          pointer: memoryPointer,
          length: memoryLength,
          ownership: instruction.ownership ?? 'borrowed',
        };
        instructionPointer += 1;
        break;
      }
      case 'aggregate-from-memory': {
        const memoryPointer = pointer(registers[instruction.pointer]);
        const memoryLength = pointer(registers[instruction.length]);
        registers[instruction.destination] = {
          kind: 'aggregate',
          layout: instruction.layout,
          bytes: state.memory.readBytes(memoryPointer, memoryLength),
          ownership: instruction.ownership ?? 'owned',
        };
        instructionPointer += 1;
        break;
      }
      case 'write-bytes': {
        const memoryPointer = pointer(registers[instruction.pointer]);
        const bytes = valueBytes(registers[instruction.source], state.memory);
        state.memory.writeBytes(memoryPointer, bytes);
        instructionPointer += 1;
        break;
      }
      case 'len': {
        const bytes = valueBytes(registers[instruction.source], state.memory);
        registers[instruction.destination] = numericValue('i32', bytes.length);
        instructionPointer += 1;
        break;
      }
      case 'byte-at': {
        const bytes = valueBytes(registers[instruction.source], state.memory);
        const indexValue = asNumber(registers[instruction.index]);
        const index = Number(indexValue.value);
        if (!Number.isInteger(index) || index < 0 || index >= bytes.length)
          throw trap(`byte-at index ${String(index)} is outside the aggregate payload.`);
        registers[instruction.destination] = numericValue('i32', bytes[index]!);
        instructionPointer += 1;
        break;
      }
      case 'unary': {
        const operand = registers[instruction.operand];
        if (instruction.operation === 'not') {
          registers[instruction.destination] =
            operand.kind === 'bool'
              ? { kind: 'bool', value: !operand.value }
              : binary('==', operand, { kind: 'number', type: 'i32', value: 0 });
        } else {
          const numeric = asNumber(operand);
          registers[instruction.destination] = numericValue(
            numeric.type,
            typeof numeric.value === 'bigint' ? -numeric.value : -numeric.value,
          );
        }
        instructionPointer += 1;
        break;
      }
      case 'binary': {
        registers[instruction.destination] = binary(
          instruction.operation,
          registers[instruction.left],
          registers[instruction.right],
        );
        instructionPointer += 1;
        break;
      }
      case 'call': {
        const argumentsForCall = instruction.arguments.map((register) => registers[register]);
        observe(() => state.trace?.recordCall(instruction.functionName, state.steps));
        const result = executeNamed(instruction.functionName, argumentsForCall, state);
        if (instruction.destination !== undefined) registers[instruction.destination] = result;
        instructionPointer += 1;
        break;
      }
      case 'call-capability': {
        const imported = findCapability(state.module, instruction.importName);
        const capability = state.options.capabilities?.[imported.name];
        if (capability === undefined) {
          observe(() => state.trace?.recordCapability(imported.capability, 'denied', state.steps));
          throw new ForgeWebScriptTrap(
            'CapabilityDenied',
            `Capability '${imported.capability}' is unavailable.`,
            imported.capability,
          );
        }
        const capabilityArguments = instruction.arguments.map((register) => registers[register]);
        if (capabilityArguments.length !== imported.parameters.length)
          throw new ForgeWebScriptTrap(
            'HostError',
            `Capability '${imported.capability}' received an invalid argument count.`,
            imported.capability,
          );
        try {
          observe(() =>
            state.trace?.recordCapability(
              imported.capability,
              'allowed',
              state.steps,
              capabilityArguments
                .map((value) => summarizeForgeWebScriptVmValue(value, state.options.trace?.redact))
                .join(','),
            ),
          );
          const result = capability(...capabilityArguments);
          if (!isValue(result)) throw new Error('Capability returned an invalid VM value.');
          if (instruction.destination !== undefined) registers[instruction.destination] = cloneValue(result);
        } catch (error) {
          observe(() => state.trace?.recordCapability(imported.capability, 'failed', state.steps));
          throw toForgeWebScriptHostError(error, imported.capability);
        }
        instructionPointer += 1;
        break;
      }
      case 'branch': {
        {
          const condition = registers[instruction.condition];
          if (condition.kind !== 'bool') throw trap('Branch conditions must be boolean VM values.');
          instructionPointer = condition.value ? instruction.ifTrue : instruction.ifFalse;
        }
        break;
      }
      case 'jump': {
        instructionPointer = instruction.target;
        break;
      }
      case 'return': {
        return instruction.source === undefined ? { kind: 'unit' } : cloneValue(registers[instruction.source]);
      }
      case 'trap': {
        throw trap(`${instruction.code}: ${instruction.message}`);
      }
    }
  }
  throw trap(`Function '${function_.name}' reached the end without returning.`);
}

function createMemory(input: Uint8Array | undefined, trace?: ExecutionState['trace']): ForgeWebScriptMemory {
  const initialPages = Math.max(1, Math.ceil((input?.byteLength ?? PAGE_SIZE) / PAGE_SIZE));
  const memory = new ForgeWebScriptMemory(undefined, { initialPages, trace });
  if (input !== undefined) memory.writeBytes(0, input);
  return memory;
}

export function createForgeWebScriptVmExecutor(
  executorOptions: ForgeWebScriptVmExecutorOptions = {},
): ForgeWebScriptVmExecutor {
  const compilerVersion = executorOptions.compilerVersion ?? DEFAULT_COMPILER_VERSION;
  const jitThreshold = Math.max(1, Math.trunc(executorOptions.jitThreshold ?? DEFAULT_JIT_THRESHOLD));
  const counts = new Map<string, number>();
  const entries: Record<string, ForgeWebScriptVmJitEntry> = {};
  const validatedJitCaches = new WeakMap<ForgeWebScriptVmJitCache, WeakSet<ForgeWebScriptVmModule>>();
  const wasmFallbacks = new WeakMap<ForgeWebScriptVmModule, Set<Exclude<ForgeWebScriptVmExecutionMode, 'interpret'>>>();
  const preparedByModule = new WeakMap<
    ForgeWebScriptVmModule,
    Map<
      Exclude<ForgeWebScriptVmExecutionMode, 'interpret'>,
      { capabilities?: ForgeWebScriptVmExecutionOptions['capabilities']; prepared: ForgeWebScriptVmPreparedExecutor }
    >
  >();
  const prepare = (
    module: ForgeWebScriptVmModule,
    mode: Exclude<ForgeWebScriptVmExecutionMode, 'interpret'>,
    options: Omit<ForgeWebScriptVmPreparedExecutorOptions, 'mode'> = {},
  ): ForgeWebScriptVmPreparedExecutor => {
    if (mode === 'aot' && options.aotArtifact !== undefined) validateAotArtifact(options.aotArtifact, compilerVersion);
    let cached = preparedByModule.get(module);
    if (cached === undefined) {
      cached = new Map();
      preparedByModule.set(module, cached);
    }
    const existing = cached.get(mode);
    if (existing !== undefined && existing.capabilities === options.capabilities) return existing.prepared;
    const prepared = prepareForgeWebScriptVmWasm(module, {
      compilerVersion,
      mode,
      capabilities: options.capabilities,
    });
    if (mode === 'jit') {
      for (const function_ of module.functions) {
        if (entries[function_.name] === undefined)
          entries[function_.name] = {
            functionName: function_.name,
            sourceHash: module.sourceHash,
            codeHash: hashFunction(function_),
            mode: 'jit',
          };
      }
    }
    cached.set(mode, { capabilities: options.capabilities, prepared });
    return prepared;
  };
  const execute: ForgeWebScriptVmExecutor['execute'] = (module, functionName, arguments_, options) => {
    if (options.jitCache !== undefined) {
      let modules = validatedJitCaches.get(options.jitCache);
      if (modules === undefined) {
        modules = new WeakSet();
        validatedJitCaches.set(options.jitCache, modules);
      }
      if (!modules.has(module)) {
        validateJitCache(options.jitCache, module, compilerVersion);
        modules.add(module);
      }
    }
    if (options.mode === 'aot') {
      let fallback = wasmFallbacks.get(module)?.has('aot') ?? false;
      if (!fallback) {
        try {
          const prepared = prepare(module, 'aot', { capabilities: options.capabilities });
          return prepared.execute(functionName, arguments_, {
            memory: options.memory,
            maxSteps: options.maxSteps,
            trace: options.trace,
          });
        } catch (error) {
          if (
            !(error instanceof ForgeWebScriptTrap) ||
            error.code !== 'InvalidAbi' ||
            !error.message.startsWith('VM WASM lowering failed:')
          )
            throw error;
          fallback = true;
          const modes = wasmFallbacks.get(module) ?? new Set();
          modes.add('aot');
          wasmFallbacks.set(module, modes);
        }
      }
      if (fallback) {
        // Continue through the validated interpreter path for unsupported lowering profiles.
      }
    }
    if (options.mode === 'jit') {
      const count = (counts.get(functionName) ?? 0) + 1;
      counts.set(functionName, count);
      if (count >= jitThreshold) {
        let fallback = wasmFallbacks.get(module)?.has('jit') ?? false;
        if (!fallback) {
          try {
            const prepared = prepare(module, 'jit', { capabilities: options.capabilities });
            return prepared.execute(functionName, arguments_, {
              memory: options.memory,
              maxSteps: options.maxSteps,
              trace: options.trace,
            });
          } catch (error) {
            if (
              !(error instanceof ForgeWebScriptTrap) ||
              error.code !== 'InvalidAbi' ||
              !error.message.startsWith('VM WASM lowering failed:')
            )
              throw error;
            fallback = true;
            const modes = wasmFallbacks.get(module) ?? new Set();
            modes.add('jit');
            wasmFallbacks.set(module, modes);
          }
        }
        if (fallback) {
          // Continue through the validated interpreter path for unsupported lowering profiles.
        }
      }
    }
    validateForgeWebScriptVmModule(module);
    const functionByName = new Map(module.functions.map((function_) => [function_.name, function_]));
    const entry = functionByName.get(functionName);
    if (entry === undefined) throw trap(`Function '${functionName}' does not exist.`);
    const trace =
      options.trace === undefined ? undefined : createForgeWebScriptTraceRecorder(options.trace, functionName);
    const memory = createMemory(options.memory, trace);
    const state: ExecutionState = { module, options, memory, steps: 0, trace };
    const executeNamed = (
      name: string,
      nestedArguments: readonly ForgeWebScriptVmValue[],
      nestedState: ExecutionState,
    ): ForgeWebScriptVmValue => {
      const nested = functionByName.get(name);
      if (nested === undefined) throw trap(`Function '${name}' does not exist.`);
      return executeFunction(nested, nestedArguments, nestedState, executeNamed);
    };
    try {
      const value = executeFunction(entry, arguments_, state, executeNamed);
      const outputMemory = new Uint8Array(memory.bytes);
      return {
        value,
        memory: outputMemory,
        steps: state.steps,
        mode: options.mode,
        ...(trace === undefined
          ? {}
          : { trace: trace.finish({ steps: state.steps, memory: outputMemory, termination: 'returned' }) }),
      };
    } catch (error) {
      const outputMemory = new Uint8Array(memory.bytes);
      if (trace !== undefined) {
        const trapError = error instanceof ForgeWebScriptTrap ? error : undefined;
        observe(() =>
          trace.recordTrap(
            trapError?.code ?? 'GuestTrap',
            trapError?.message ?? String(error),
            state.steps,
            trapError?.capability,
          ),
        );
        const report = trace.finish({
          steps: state.steps,
          memory: outputMemory,
          termination: trapError?.message.includes('step limit') ? 'step-limit' : 'trapped',
          ...(trapError === undefined
            ? { trap: { code: 'GuestTrap', message: String(error) } }
            : {
                trap: {
                  code: trapError.code,
                  message: trapError.message,
                  ...(trapError.capability === undefined ? {} : { capability: trapError.capability }),
                },
              }),
        });
        attachForgeWebScriptTrace(error, report);
      }
      throw error;
    }
  };
  return {
    execute,
    prepare,
    getJitCache: () => ({ compilerVersion, entries: { ...entries } }),
  };
}

export function createForgeWebScriptVmAotArtifact(
  module: ForgeWebScriptVmModule,
  compilerVersion: string,
): ForgeWebScriptVmAotArtifact {
  validateForgeWebScriptVmModule(module);
  const artifact = {
    format: 'forge-web-script-vm-aot' as const,
    moduleVersion: '1.0' as const,
    sourceHash: module.sourceHash,
    compilerVersion,
    module,
    functions: module.functions,
    reproducibilityHash: '',
  };
  return { ...artifact, reproducibilityHash: aotHash(artifact) };
}

export function executeForgeWebScriptVm(
  module: ForgeWebScriptVmModule,
  functionName: string,
  arguments_: readonly ForgeWebScriptVmValue[],
  options: ForgeWebScriptVmExecutionOptions,
): ForgeWebScriptVmExecutionResult {
  return createForgeWebScriptVmExecutor().execute(module, functionName, arguments_, options);
}

const validatedAotArtifacts = new WeakSet<ForgeWebScriptVmAotArtifact>();
const aotExecutors = new WeakMap<ForgeWebScriptVmAotArtifact, ForgeWebScriptVmExecutor>();

function validateAotArtifact(artifact: ForgeWebScriptVmAotArtifact, expectedCompilerVersion?: string): void {
  if (
    validatedAotArtifacts.has(artifact) &&
    (expectedCompilerVersion === undefined || artifact.compilerVersion === expectedCompilerVersion)
  )
    return;
  if (artifact.format !== 'forge-web-script-vm-aot' || artifact.moduleVersion !== '1.0')
    throw new ForgeWebScriptTrap('InvalidAbi', 'AOT artifact format or version is unsupported.');
  if (artifact.module.sourceHash !== artifact.sourceHash)
    throw new ForgeWebScriptTrap('InvalidAbi', 'AOT artifact source hash does not match its module.');
  if (expectedCompilerVersion !== undefined && artifact.compilerVersion !== expectedCompilerVersion)
    throw new ForgeWebScriptTrap('InvalidAbi', 'AOT artifact compiler version does not match the prepared executor.');
  if (artifact.reproducibilityHash !== aotHash(artifact))
    throw new ForgeWebScriptTrap('InvalidAbi', 'AOT artifact reproducibility hash does not match its contents.');
  validatedAotArtifacts.add(artifact);
}

export function executeForgeWebScriptVmAotArtifact(
  artifact: ForgeWebScriptVmAotArtifact,
  functionName: string,
  arguments_: readonly ForgeWebScriptVmValue[],
  options: Omit<ForgeWebScriptVmExecutionOptions, 'mode'> = {},
): ForgeWebScriptVmExecutionResult {
  validateAotArtifact(artifact);
  let executor = aotExecutors.get(artifact);
  if (executor === undefined) {
    executor = createForgeWebScriptVmExecutor({ compilerVersion: artifact.compilerVersion });
    aotExecutors.set(artifact, executor);
  }
  return executor.execute(artifact.module, functionName, arguments_, { ...options, mode: 'aot' });
}

export function runForgeWebScriptVmBootstrap(
  module: ForgeWebScriptVmModule,
  functionName: string,
  arguments_: readonly ForgeWebScriptVmValue[],
  mode: ForgeWebScriptVmExecutionMode = 'interpret',
  options: Omit<ForgeWebScriptVmExecutionOptions, 'mode'> = {},
): ForgeWebScriptVmExecutionResult {
  return createForgeWebScriptVmExecutor().execute(module, functionName, arguments_, { ...options, mode });
}

function validateJitCache(
  jitCache: ForgeWebScriptVmJitCache,
  module: ForgeWebScriptVmModule,
  executorCompilerVersion: string,
): void {
  if (jitCache.compilerVersion !== executorCompilerVersion) {
    throw new ForgeWebScriptTrap(
      'InvalidAbi',
      `JIT cache version mismatch: expected ${executorCompilerVersion}, got ${jitCache.compilerVersion}`,
    );
  }
  for (const [name, entry] of Object.entries<ForgeWebScriptVmJitEntry>(jitCache.entries)) {
    if (entry.functionName !== name) {
      throw new ForgeWebScriptTrap('InvalidAbi', `JIT cache entry mismatch: ${name} !== ${entry.functionName}`);
    }
    if (entry.sourceHash !== module.sourceHash) {
      throw new ForgeWebScriptTrap(
        'InvalidAbi',
        `JIT cache source hash mismatch: ${entry.sourceHash} !== ${module.sourceHash}`,
      );
    }
  }
}

import { createForgeWebScriptTraceRecorder, summarizeForgeWebScriptVmValue } from './trace.js';
import { attachForgeWebScriptTrace, toForgeWebScriptHostError, ForgeWebScriptTrap } from './traps.js';
import { validateForgeWebScriptVmModule } from './vm-executor.js';
import {
  FORGE_WEB_SCRIPT_VM_DEFAULT_MAX_MEMORY_PAGES,
  FORGE_WEB_SCRIPT_VM_WASM_ABI_VERSION,
  FORGE_WEB_SCRIPT_VM_WASM_LOWERING_VERSION,
} from './vm.js';

import type { ForgeWebScriptTraceOptions } from './trace.js';
import type {
  ForgeWebScriptVmCapabilityImport,
  ForgeWebScriptVmExecutionOptions,
  ForgeWebScriptVmExecutionResult,
  ForgeWebScriptVmFunction,
  ForgeWebScriptVmInstruction,
  ForgeWebScriptVmModule,
  ForgeWebScriptVmPreparedExecutor,
  ForgeWebScriptVmPreparedExecutorOptions,
  ForgeWebScriptVmValue,
  ForgeWebScriptVmWasmArtifact,
} from './vm.js';

const PAGE_SIZE = 65_536;
const STATIC_DATA_START = 1024;
const RUNTIME_IMPORT_MODULE = 'fws.runtime';
const CAPABILITY_IMPORT_MODULE = 'fws.capability';
const STEP_IMPORT = 'fws_step';
const COMPARE_IMPORT = 'fws_compare_bytes';
const BYTE_AT_IMPORT = 'fws_byte_at';
const TRAP_IMPORT = 'fws_trap';
const encoder = new TextEncoder();

type NumericType = 'f32' | 'f64' | 'i32' | 'i64' | 'u32' | 'u64';
type WasmValueType = 'i32' | 'i64' | 'f32' | 'f64';
type VmRep =
  | { readonly kind: 'unit' }
  | { readonly kind: 'bool' }
  | { readonly kind: 'number'; readonly type: NumericType }
  | { readonly kind: 'bytes' }
  | { readonly kind: 'aggregate'; readonly layout: string };
type LocalReference = readonly number[];
type FunctionInfo = {
  readonly function: ForgeWebScriptVmFunction;
  readonly reps: readonly VmRep[];
  readonly locals: readonly LocalReference[];
  readonly result: VmRep;
  readonly typeIndex: number;
};

function unsignedLeb(value: number): number[] {
  const result: number[] = [];
  let remaining = value >>> 0;
  do {
    const byte = remaining & 0x7f;
    remaining >>>= 7;
    result.push(remaining === 0 ? byte : byte | 0x80);
  } while (remaining !== 0);
  return result;
}

function signedLeb(value: number | bigint): number[] {
  const result: number[] = [];
  let remaining = BigInt(value);
  let more = true;
  while (more) {
    const byte = Number(remaining & 0x7fn);
    remaining >>= 7n;
    more = !((remaining === 0n && (byte & 0x40) === 0) || (remaining === -1n && (byte & 0x40) !== 0));
    result.push(more ? byte | 0x80 : byte);
  }
  return result;
}

function integerImmediate(type: NumericType, value: number | bigint): number | bigint {
  if (type === 'u32') {
    const unsigned = BigInt(value) & 0xff_ff_ff_ffn;
    return unsigned >= 0x80_00_00_00n ? unsigned - 0x1_00_00_00_00n : unsigned;
  }
  if (type === 'u64') {
    const unsigned = BigInt(value) & 0xff_ff_ff_ff_ff_ff_ff_ffn;
    return unsigned >= 0x80_00_00_00_00_00_00_00n ? unsigned - 0x1_00_00_00_00_00_00_00_00n : unsigned;
  }
  return value;
}

function bytes(value: readonly number[]): number[] {
  return [...value];
}

function vector(value: readonly number[]): number[] {
  return [...unsignedLeb(value.length), ...value];
}

function wasmString(value: string): number[] {
  const encoded = encoder.encode(value);
  return [...unsignedLeb(encoded.length), ...encoded];
}

function section(id: number, contents: readonly number[]): number[] {
  return [id, ...unsignedLeb(contents.length), ...contents];
}

function fail(message: string): never {
  throw new ForgeWebScriptTrap('InvalidAbi', `VM WASM lowering failed: ${message}`);
}

function typeForValue(type: string): VmRep {
  if (type === 'unit') return { kind: 'unit' };
  if (type === 'bool') return { kind: 'bool' };
  if (type === 'bytes' || type === 'string') return { kind: 'bytes' };
  if (['f32', 'f64', 'i32', 'i64', 'u32', 'u64'].includes(type)) return { kind: 'number', type: type as NumericType };
  return { kind: 'aggregate', layout: type };
}

function sameRep(left: VmRep, right: VmRep): boolean {
  return (
    left.kind === right.kind &&
    (left.kind !== 'number' || right.kind !== 'number' || left.type === right.type) &&
    (left.kind !== 'aggregate' || right.kind !== 'aggregate' || left.layout === right.layout)
  );
}

function flatTypes(rep: VmRep): readonly WasmValueType[] {
  if (rep.kind === 'unit') return [];
  if (rep.kind === 'bool' || rep.kind === 'bytes' || rep.kind === 'aggregate')
    return rep.kind === 'bool' ? ['i32'] : ['i32', 'i32'];
  return [
    rep.type === 'f32' ? 'f32' : rep.type === 'f64' ? 'f64' : rep.type === 'i64' || rep.type === 'u64' ? 'i64' : 'i32',
  ];
}

function wasmTypeCode(type: WasmValueType): number {
  return type === 'i32' ? 0x7f : type === 'i64' ? 0x7e : type === 'f32' ? 0x7d : 0x7c;
}

function typeSignature(parameters: readonly VmRep[], result: VmRep): number[] {
  const parameterTypes = parameters.flatMap((parameter) => flatTypes(parameter).map((type) => wasmTypeCode(type)));
  const resultTypes = flatTypes(result).map((type) => wasmTypeCode(type));
  return [0x60, ...vector(parameterTypes), ...vector(resultTypes)];
}

function repFromConstant(value: ForgeWebScriptVmValue): VmRep {
  if (value.kind === 'number') return { kind: 'number', type: value.type };
  if (value.kind === 'aggregate') return { kind: 'aggregate', layout: value.layout };
  if (value.kind === 'bytes') return { kind: 'bytes' };
  if (value.kind === 'bool') return { kind: 'bool' };
  return { kind: value.kind } as VmRep;
}

function resultRep(type: string): VmRep {
  return typeForValue(type);
}

function instructionRep(
  instruction: ForgeWebScriptVmInstruction,
  module: ForgeWebScriptVmModule,
  functions: ReadonlyMap<string, ForgeWebScriptVmFunction>,
): VmRep | undefined {
  switch (instruction.opcode) {
    case 'const': {
      return repFromConstant(module.constants[instruction.constant]!);
    }
    case 'load': {
      if (instruction.type !== 'number') fail(`load of '${instruction.type}' is not a numeric v1 operation`);
      return { kind: 'number', type: instruction.numberType ?? 'i32' };
    }
    case 'len':
    case 'byte-at': {
      return { kind: 'number', type: 'i32' };
    }
    case 'unary': {
      return instruction.operation === 'not' ? { kind: 'bool' } : undefined;
    }
    case 'binary': {
      return ['==', '===', '!=', '!==', '<', '<=', '>', '>=', '&&', '||'].includes(instruction.operation)
        ? { kind: 'bool' }
        : undefined;
    }
    case 'call': {
      const target = functions.get(instruction.functionName);
      if (target === undefined) fail(`call target '${instruction.functionName}' does not exist`);
      return resultRep(target.result);
    }
    case 'call-capability': {
      const imported = module.capabilityImports.find((candidate) => candidate.name === instruction.importName);
      if (imported === undefined) fail(`capability '${instruction.importName}' is not declared`);
      return resultRep(imported.result);
    }
    default: {
      return undefined;
    }
  }
}

function inferRegisters(function_: ForgeWebScriptVmFunction, module: ForgeWebScriptVmModule): readonly VmRep[] {
  const functions = new Map(module.functions.map((candidate) => [candidate.name, candidate]));
  const inferred: Array<VmRep | undefined> = Array.from({ length: function_.registers });
  for (const [index, parameter] of function_.parameters.entries()) inferred[index] = typeForValue(parameter);
  const set = (index: number, value: VmRep | undefined): void => {
    if (value === undefined || value.kind === 'unit') return;
    const current = inferred[index];
    if (current !== undefined && !sameRep(current, value))
      fail(`register ${index} has incompatible inferred types in '${function_.name}'`);
    inferred[index] = value;
  };
  for (let pass = 0; pass < function_.code.length + 2; pass += 1) {
    for (const instruction of function_.code) {
      if (
        instruction.opcode === 'alloc' ||
        instruction.opcode === 'bytes-from-memory' ||
        instruction.opcode === 'aggregate-from-memory' ||
        instruction.opcode === 'write-bytes'
      )
        fail(`unsupported opcode '${instruction.opcode}'`);
      switch (instruction.opcode) {
        case 'const': {
          set(instruction.destination ?? 0, instructionRep(instruction, module, functions));
          break;
        }
        case 'move': {
          set(instruction.destination, inferred[instruction.source]);
          break;
        }
        case 'unary': {
          set(
            instruction.destination,
            instruction.operation === 'not' ? { kind: 'bool' } : inferred[instruction.operand],
          );
          break;
        }
        case 'binary': {
          set(instruction.destination, instructionRep(instruction, module, functions) ?? inferred[instruction.left]);
          break;
        }
        case 'call':
        case 'call-capability': {
          if (instruction.destination !== undefined)
            set(instruction.destination, instructionRep(instruction, module, functions));

          break;
        }
        case 'load':
        case 'len':
        case 'byte-at': {
          {
            set(instruction.destination, instructionRep(instruction, module, functions));
            // No default
          }
          break;
        }
      }
    }
  }
  const result = resultRep(function_.result);
  const returnInstruction = function_.code.toReversed().find((instruction) => instruction.opcode === 'return');
  if (returnInstruction?.opcode === 'return' && returnInstruction.source !== undefined)
    set(returnInstruction.source, result);
  for (const [index, rep] of inferred.entries()) if (rep === undefined) inferred[index] = { kind: 'unit' };
  return inferred as readonly VmRep[];
}

function localDeclarations(
  function_: ForgeWebScriptVmFunction,
  reps: readonly VmRep[],
): { readonly locals: readonly LocalReference[]; readonly declarations: number[] } {
  const locals: LocalReference[] = [];
  let next = function_.parameters.flatMap((parameter) => flatTypes(typeForValue(parameter))).length;
  const declarations: number[] = [];
  for (const [index, rep] of reps.entries()) {
    const width = flatTypes(rep).length;
    if (index < function_.parameters.length) {
      const first = function_.parameters
        .slice(0, index)
        .flatMap((parameter) => flatTypes(typeForValue(parameter))).length;
      locals.push(Array.from({ length: width }, (_, offset) => first + offset));
    } else {
      const references = Array.from({ length: width }, (_, offset) => next + offset);
      locals.push(references);
      for (const type of flatTypes(rep)) declarations.push(wasmTypeCode(type));
      next += width;
    }
  }
  const ip = next;
  locals.push([ip]);
  declarations.push(wasmTypeCode('i32'));
  return { locals, declarations: [...unsignedLeb(declarations.length), ...declarations.flatMap((type) => [1, type])] };
}

function localGet(reference: LocalReference, index = 0): number[] {
  return reference[index] === undefined ? [] : [0x20, ...unsignedLeb(reference[index]!)];
}

function localSet(reference: LocalReference, value: readonly number[], index = 0): number[] {
  return reference[index] === undefined ? [] : [...value, 0x21, ...unsignedLeb(reference[index]!)];
}

function emitConst(
  rep: VmRep,
  value: ForgeWebScriptVmValue,
  constantIndex: number,
  dataOffsets: ReadonlyMap<number, number>,
): number[] {
  if (rep.kind === 'unit') return [];
  if (rep.kind === 'bool') return [0x41, ...signedLeb(value.kind === 'bool' && value.value ? 1 : 0)];
  if (rep.kind === 'number') {
    const number = value.kind === 'number' ? value.value : 0;
    if (rep.type === 'f32') {
      const buffer = new ArrayBuffer(4);
      new DataView(buffer).setFloat32(0, Number(number), true);
      return [0x43, ...bytes([...new Uint8Array(buffer)])];
    }
    if (rep.type === 'f64') {
      const buffer = new ArrayBuffer(8);
      new DataView(buffer).setFloat64(0, Number(number), true);
      return [0x44, ...bytes([...new Uint8Array(buffer)])];
    }
    return [
      rep.type === 'i64' || rep.type === 'u64' ? 0x42 : 0x41,
      ...signedLeb(integerImmediate(rep.type, number as number | bigint)),
    ];
  }
  const pointer = value.kind === 'bytes' ? value.pointer : (dataOffsets.get(constantIndex) ?? 0);
  const length = value.kind === 'bytes' ? value.length : value.kind === 'aggregate' ? value.bytes.byteLength : 0;
  return [0x41, ...signedLeb(pointer), 0x41, ...signedLeb(length)];
}

function memoryLoad(rep: VmRep, address: number): number[] {
  if (rep.kind !== 'number') fail('only numeric values can be loaded from memory');
  const opcode =
    rep.type === 'f32'
      ? 0x2a
      : rep.type === 'f64'
        ? 0x2b
        : rep.type === 'i64' || rep.type === 'u64'
          ? 0x29
          : rep.type === 'i32' || rep.type === 'u32'
            ? 0x28
            : 0x28;
  const alignment = rep.type === 'f32' || rep.type === 'i32' || rep.type === 'u32' ? 2 : 3;
  return [0x41, ...signedLeb(address), opcode, ...unsignedLeb(alignment), 0x00];
}

function memoryStore(rep: VmRep): number[] {
  if (rep.kind !== 'number' && rep.kind !== 'bool') fail('only numeric and boolean values can be stored in memory');
  const opcode =
    rep.kind === 'number' && rep.type === 'f32'
      ? 0x38
      : rep.kind === 'number' && rep.type === 'f64'
        ? 0x39
        : rep.kind === 'number' && (rep.type === 'i64' || rep.type === 'u64')
          ? 0x37
          : 0x36;
  const alignment =
    (rep.kind === 'number' && (rep.type === 'f32' || rep.type === 'i32' || rep.type === 'u32')) || rep.kind === 'bool'
      ? 2
      : 3;
  return [opcode, ...unsignedLeb(alignment), 0x00];
}

function numericBinary(type: NumericType, operation: string): number {
  const integer = type === 'i32' || type === 'u32';
  const wide = type === 'i64' || type === 'u64';
  const base = integer ? 0x6a : wide ? 0x7c : type === 'f32' ? 0x92 : 0xa0;
  const unsigned = type === 'u32' || type === 'u64';
  const offsets: Record<string, number> = {
    '+': 0,
    '-': 1,
    '*': 2,
    '/': unsigned ? 4 : 3,
    '%': unsigned ? 6 : 5,
    '&': 7,
    '|': 8,
    '^': 9,
    '<<': 10,
    '>>': unsigned ? 12 : 11,
  };
  const offset = offsets[operation];
  if (offset === undefined || (!integer && !wide && ['%', '&', '|', '^', '<<', '>>'].includes(operation)))
    fail(`unsupported '${operation}' for ${type}`);
  return base + offset;
}

function numericCompare(type: NumericType, operation: string): number {
  const offset: Record<string, number> = { '==': 0, '===': 0, '!=': 1, '!==': 1, '<': 2, '>': 4, '<=': 6, '>=': 8 };
  const value = offset[operation];
  if (value === undefined) fail(`unsupported comparison '${operation}'`);
  const floatOffset = value === 2 ? 2 : value === 4 ? 3 : value === 6 ? 4 : value === 8 ? 5 : value;
  if (type === 'f32') return 0x5b + floatOffset;
  if (type === 'f64') return 0x61 + floatOffset;
  const base = type === 'i64' || type === 'u64' ? 0x51 : 0x46;
  if (value < 2) return base + value;
  return base + value + (type === 'u32' || type === 'u64' ? 1 : 0);
}

function emitStep(): number[] {
  return [0x10, 0x00, 0x04, 0x40, 0x00, 0x0b];
}

function flattenReference(reference: LocalReference): readonly number[] {
  return [...reference];
}

function checkedRange(pointer: number, length: number, memory: WebAssembly.Memory, message: string): void {
  if (
    !Number.isSafeInteger(pointer) ||
    !Number.isSafeInteger(length) ||
    pointer < 0 ||
    length < 0 ||
    pointer + length > memory.buffer.byteLength
  )
    throw new ForgeWebScriptTrap('MemoryOutOfBounds', message);
}

function emitInstruction(
  instruction: ForgeWebScriptVmInstruction,
  function_: ForgeWebScriptVmFunction,
  info: FunctionInfo,
  module: ForgeWebScriptVmModule,
  functions: ReadonlyMap<string, FunctionInfo>,
  capabilityIndexes: ReadonlyMap<string, number>,
  dataOffsets: ReadonlyMap<number, number>,
  stepIndex: number,
  compareIndex: number,
  byteAtIndex: number,
  trapIndex: number,
  functionIndex: number,
): number[] {
  const result: number[] = [...emitStep()];
  const reference = (index: number): LocalReference => info.locals[index] ?? fail(`register ${index} is not available`);
  const rep = (index: number): VmRep => info.reps[index] ?? fail(`register ${index} is not available`);
  const set = (destination: number, value: readonly number[]): void => {
    result.push(...localSet(reference(destination), value));
  };
  const assign = (destination: number, width = 1): void => {
    for (let index = width - 1; index >= 0; index -= 1) result.push(...localSet(reference(destination), [], index));
  };
  switch (instruction.opcode) {
    case 'const': {
      set(
        instruction.destination ?? 0,
        emitConst(
          rep(instruction.destination ?? 0),
          module.constants[instruction.constant]!,
          instruction.constant,
          dataOffsets,
        ),
      );
      break;
    }
    case 'move': {
      const source = flattenReference(reference(instruction.source));
      for (let index = 0; index < source.length; index += 1)
        result.push(
          ...localSet(reference(instruction.destination), localGet(reference(instruction.source), index), index),
        );
      break;
    }
    case 'load': {
      set(instruction.destination, memoryLoad(rep(instruction.destination), instruction.address));
      break;
    }
    case 'store': {
      result.push(
        0x41,
        ...signedLeb(instruction.address),
        ...localGet(reference(instruction.source)),
        ...memoryStore(rep(instruction.source)),
      );
      break;
    }
    case 'alloc':
    case 'bytes-from-memory':
    case 'aggregate-from-memory':
    case 'write-bytes': {
      fail(`unsupported opcode '${instruction.opcode}'`);
      break;
    }
    case 'len': {
      if (flattenReference(reference(instruction.source)).length !== 2) fail('len requires a pointer-length value');
      set(instruction.destination, localGet(reference(instruction.source), 1));
      break;
    }
    case 'byte-at': {
      result.push(
        ...localGet(reference(instruction.source), 0),
        ...localGet(reference(instruction.source), 1),
        ...localGet(reference(instruction.index)),
        0x10,
        ...unsignedLeb(byteAtIndex),
      );
      assign(instruction.destination);
      break;
    }
    case 'unary': {
      {
        const operand = rep(instruction.operand);
        if (instruction.operation === 'not') {
          result.push(...localGet(reference(instruction.operand)));
          if (
            operand.kind === 'bool' ||
            (operand.kind === 'number' && (operand.type === 'i32' || operand.type === 'u32'))
          )
            result.push(0x45);
          else if (operand.kind === 'number' && (operand.type === 'i64' || operand.type === 'u64')) result.push(0x50);
          else if (operand.kind === 'number' && operand.type === 'f32') result.push(0x43, 0, 0, 0, 0, 0x5b);
          else if (operand.kind === 'number' && operand.type === 'f64') result.push(0x44, 0, 0, 0, 0, 0, 0, 0, 0, 0x61);
          else fail('not requires a boolean or numeric register');
        } else {
          if (operand.kind !== 'number') fail('neg requires a numeric register');
          if (operand.type === 'f32' || operand.type === 'f64') {
            result.push(...localGet(reference(instruction.operand)), operand.type === 'f32' ? 0x8c : 0x9a);
          } else {
            result.push(
              operand.type === 'i64' || operand.type === 'u64' ? 0x42 : 0x41,
              0,
              ...localGet(reference(instruction.operand)),
              operand.type === 'i64' || operand.type === 'u64' ? 0x7d : 0x6b,
            );
          }
        }
      }
      assign(instruction.destination);
      break;
    }
    case 'binary': {
      const leftRep = rep(instruction.left);
      const rightRep = rep(instruction.right);
      if (!sameRep(leftRep, rightRep)) fail('binary operands must have matching types');
      for (const value of reference(instruction.left)) result.push(...localGet([value]));
      for (const value of reference(instruction.right)) result.push(...localGet([value]));
      if (['==', '===', '!=', '!==', '<', '<=', '>', '>='].includes(instruction.operation)) {
        if (leftRep.kind === 'number') result.push(numericCompare(leftRep.type, instruction.operation));
        else if (leftRep.kind === 'bool')
          result.push(instruction.operation === '==' || instruction.operation === '===' ? 0x46 : 0x47);
        else if (leftRep.kind === 'bytes' && ['==', '===', '!=', '!=='].includes(instruction.operation))
          result.push(0x10, ...unsignedLeb(compareIndex));
        else if (leftRep.kind === 'aggregate' && ['==', '===', '!=', '!=='].includes(instruction.operation)) {
          result.push(0x10, ...unsignedLeb(compareIndex));
        } else fail('unsupported aggregate comparison');
        if (instruction.operation === '!=' || instruction.operation === '!==') result.push(0x45);
      } else if (leftRep.kind === 'bool' && (instruction.operation === '&&' || instruction.operation === '||'))
        result.push(instruction.operation === '&&' ? 0x71 : 0x72);
      else if (leftRep.kind === 'number') result.push(numericBinary(leftRep.type, instruction.operation));
      else fail(`unsupported binary operation '${instruction.operation}'`);
      assign(instruction.destination);
      break;
    }
    case 'call': {
      const target =
        functions.get(instruction.functionName) ?? fail(`call target '${instruction.functionName}' does not exist`);
      for (const argument of instruction.arguments)
        for (const value of reference(argument)) result.push(...localGet([value]));
      result.push(0x10, ...unsignedLeb(target.typeIndex));
      const targetResult = target.result;
      if (instruction.destination === undefined) for (const _ of flatTypes(targetResult)) result.push(0x1a);
      else {
        const values = flatTypes(targetResult);
        for (let index = values.length - 1; index >= 0; index -= 1)
          result.push(...localSet(reference(instruction.destination), [], index));
      }
      break;
    }
    case 'call-capability': {
      const importIndex =
        capabilityIndexes.get(instruction.importName) ?? fail(`capability '${instruction.importName}' is not declared`);
      for (const argument of instruction.arguments)
        for (const value of reference(argument)) result.push(...localGet([value]));
      result.push(0x10, ...unsignedLeb(importIndex));
      const imported = module.capabilityImports.find((candidate) => candidate.name === instruction.importName)!;
      if (instruction.destination === undefined)
        for (const _ of flatTypes(resultRep(imported.result))) result.push(0x1a);
      else
        for (let index = flatTypes(resultRep(imported.result)).length - 1; index >= 0; index -= 1)
          result.push(...localSet(reference(instruction.destination), [], index));
      break;
    }
    case 'branch': {
      result.push(
        ...localGet(reference(instruction.condition)),
        0x04,
        0x40,
        0x41,
        ...signedLeb(instruction.ifTrue),
        0x21,
        ...unsignedLeb(info.locals[function_.registers]![0]!),
        0x0c,
        ...unsignedLeb(stepIndex + 1),
        0x05,
        0x41,
        ...signedLeb(instruction.ifFalse),
        0x21,
        ...unsignedLeb(info.locals[function_.registers]![0]!),
        0x0c,
        ...unsignedLeb(stepIndex + 1),
        0x0b,
      );
      break;
    }
    case 'jump': {
      result.push(
        0x41,
        ...signedLeb(instruction.target),
        0x21,
        ...unsignedLeb(info.locals[function_.registers]![0]!),
        0x0c,
        ...unsignedLeb(stepIndex),
      );
      break;
    }
    case 'return': {
      if (instruction.source !== undefined)
        for (const value of reference(instruction.source)) result.push(...localGet([value]));
      result.push(0x0f);
      break;
    }
    case 'trap': {
      result.push(
        0x41,
        ...signedLeb(functionIndex),
        0x41,
        ...signedLeb(stepIndex),
        0x10,
        ...unsignedLeb(trapIndex),
        0x00,
      );
      break;
    }
    default: {
      fail('unsupported opcode');
    }
  }
  if (
    instruction.opcode !== 'branch' &&
    instruction.opcode !== 'jump' &&
    instruction.opcode !== 'return' &&
    instruction.opcode !== 'trap'
  )
    result.push(
      0x41,
      ...signedLeb(stepIndex + 1),
      0x21,
      ...unsignedLeb(info.locals[function_.registers]![0]!),
      0x0c,
      ...unsignedLeb(stepIndex),
    );
  return result;
}

function hashText(value: string): string {
  let hash = 2_166_136_261;
  for (const byte of encoder.encode(value)) {
    hash ^= byte;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function artifactHash(artifact: ForgeWebScriptVmWasmArtifact): string {
  return hashText(JSON.stringify({ ...artifact, wasm: [...artifact.wasm], reproducibilityHash: '' }));
}

function buildModule(module: ForgeWebScriptVmModule, maximumPages: number): Uint8Array {
  const dataOffsets = new Map<number, number>();
  const dataSegments: Array<{ readonly offset: number; readonly bytes: Uint8Array }> = [];
  let dataEnd = STATIC_DATA_START;
  for (const [index, constant] of module.constants.entries()) {
    if (constant.kind !== 'aggregate') continue;
    dataOffsets.set(index, dataEnd);
    dataSegments.push({ offset: dataEnd, bytes: constant.bytes });
    dataEnd += constant.bytes.byteLength;
  }
  const infos = new Map<string, FunctionInfo>();
  const typeKeys = new Map<string, number>();
  const typeBodies: number[][] = [];
  const addType = (parameters: readonly VmRep[], result: VmRep): number => {
    const key = JSON.stringify([parameters, result]);
    const existing = typeKeys.get(key);
    if (existing !== undefined) return existing;
    const index = typeBodies.length;
    typeKeys.set(key, index);
    typeBodies.push(typeSignature(parameters, result));
    return index;
  };
  const stepType = addType([], { kind: 'number', type: 'i32' });
  const compareType = addType([{ kind: 'bytes' }, { kind: 'bytes' }], { kind: 'bool' });
  const byteAtType = addType([{ kind: 'bytes' }, { kind: 'number', type: 'i32' }], { kind: 'number', type: 'i32' });
  const trapType = addType(
    [
      { kind: 'number', type: 'i32' },
      { kind: 'number', type: 'i32' },
    ],
    { kind: 'unit' },
  );
  const capabilityIndexes = new Map<string, number>();
  const imports: Array<{ readonly module: string; readonly name: string; readonly typeIndex: number }> = [
    { module: RUNTIME_IMPORT_MODULE, name: STEP_IMPORT, typeIndex: stepType },
    { module: RUNTIME_IMPORT_MODULE, name: COMPARE_IMPORT, typeIndex: compareType },
  ];
  const byteAtIndex = imports.length;
  imports.push({ module: RUNTIME_IMPORT_MODULE, name: BYTE_AT_IMPORT, typeIndex: byteAtType });
  const trapIndex = imports.length;
  imports.push({ module: RUNTIME_IMPORT_MODULE, name: TRAP_IMPORT, typeIndex: trapType });
  for (const imported of module.capabilityImports) {
    const index = imports.length;
    capabilityIndexes.set(imported.name, index);
    imports.push({
      module: CAPABILITY_IMPORT_MODULE,
      name: imported.name,
      typeIndex: addType(
        imported.parameters.map((parameter) => typeForValue(parameter)),
        resultRep(imported.result),
      ),
    });
  }
  for (const function_ of module.functions) {
    const reps = inferRegisters(function_, module);
    const declared = localDeclarations(function_, reps);
    infos.set(function_.name, {
      function: function_,
      reps,
      locals: declared.locals,
      result: resultRep(function_.result),
      typeIndex: addType(
        function_.parameters.map((parameter) => typeForValue(parameter)),
        resultRep(function_.result),
      ),
    });
  }
  const userFunctionIndexes = new Map<string, number>();
  for (const [index, function_] of module.functions.entries())
    userFunctionIndexes.set(function_.name, imports.length + index);
  for (const [name, info] of infos) infos.set(name, { ...info, typeIndex: userFunctionIndexes.get(name)! });
  const userInfos = new Map<string, FunctionInfo>();
  for (const function_ of module.functions) {
    const old = infos.get(function_.name)!;
    userInfos.set(function_.name, { ...old, typeIndex: userFunctionIndexes.get(function_.name)! });
  }
  const functionTypeIndexes = module.functions.map((function_) =>
    typeKeys.get(
      JSON.stringify([function_.parameters.map((parameter) => typeForValue(parameter)), resultRep(function_.result)]),
    )!,
  );
  const allocType = addType([{ kind: 'number', type: 'i32' }], { kind: 'number', type: 'i32' });
  const deallocType = addType(
    [
      { kind: 'number', type: 'i32' },
      { kind: 'number', type: 'i32' },
    ],
    { kind: 'unit' },
  );
  const reallocType = addType(
    [
      { kind: 'number', type: 'i32' },
      { kind: 'number', type: 'i32' },
      { kind: 'number', type: 'i32' },
    ],
    { kind: 'number', type: 'i32' },
  );
  const resetType = addType([], { kind: 'unit' });
  const allocIndex = imports.length + module.functions.length;
  const deallocIndex = allocIndex + 1;
  const reallocIndex = allocIndex + 2;
  const resetIndex = allocIndex + 3;
  const allFunctionTypes = [...functionTypeIndexes, allocType, deallocType, reallocType, resetType];
  const bodyFor = (body: readonly number[], declarations: readonly number[]): number[] => {
    const content = [...declarations, ...body, 0x0b];
    return [...unsignedLeb(content.length), ...content];
  };
  const codeBodies: number[][] = [];
  for (const [functionIndex, function_] of module.functions.entries()) {
    const info = userInfos.get(function_.name)!;
    const ip = info.locals[function_.registers]![0]!;
    const body: number[] = [0x41, ...signedLeb(0), 0x21, ...unsignedLeb(ip), 0x02, 0x40, 0x03, 0x40];
    for (let index = 0; index < function_.code.length; index += 1) {
      // The dispatcher blocks are emitted below; this loop only reserves the instruction count for the labels.
      void index;
    }
    const blockCount = function_.code.length;
    if (blockCount === 0) body.push(0x00);
    else {
      for (let index = 0; index < blockCount; index += 1) body.push(0x02, 0x40);
      body.push(
        0x20,
        ...unsignedLeb(ip),
        0x0e,
        ...unsignedLeb(blockCount),
        ...Array.from({ length: blockCount }, (_, index) => unsignedLeb(blockCount - index - 1)).flat(),
        ...unsignedLeb(blockCount + 1),
      );
      for (let index = blockCount - 1; index >= 0; index -= 1) {
        body.push(
          0x0b,
          ...emitInstruction(
            function_.code[index]!,
            function_,
            info,
            module,
            userInfos,
            capabilityIndexes,
            dataOffsets,
            index,
            1,
            byteAtIndex,
            trapIndex,
            functionIndex,
          ),
        );
      }
    }
    body.push(0x0b, 0x0b, 0x00);
    codeBodies.push(bodyFor(body, localDeclarations(function_, info.reps).declarations));
  }
  codeBodies.push(
    bodyFor([0x23, ...unsignedLeb(2), 0x23, ...unsignedLeb(2), 0x20, 0x00, 0x6a, 0x24, ...unsignedLeb(2)], [0]),
  );
  codeBodies.push(bodyFor([], [0]));
  codeBodies.push(
    bodyFor(
      [
        0x20,
        0x00,
        0x41,
        ...signedLeb(STATIC_DATA_START),
        0x49,
        0x04,
        0x40,
        0x00,
        0x0b,
        0x20,
        0x00,
        0x20,
        0x01,
        0x6a,
        0x21,
        0x03,
        0x20,
        0x03,
        0x20,
        0x00,
        0x49,
        0x04,
        0x40,
        0x00,
        0x0b,
        0x20,
        0x03,
        0x23,
        ...unsignedLeb(2),
        0x4b,
        0x04,
        0x40,
        0x00,
        0x0b,
        0x20,
        0x03,
        0x23,
        ...unsignedLeb(2),
        0x46,
        0x04,
        0x7f,
        0x20,
        0x00,
        0x20,
        0x02,
        0x6a,
        0x21,
        0x04,
        0x20,
        0x04,
        0x41,
        ...signedLeb(16),
        0x76,
        0x20,
        0x04,
        0x41,
        ...signedLeb(65_535),
        0x71,
        0x41,
        ...signedLeb(0),
        0x47,
        0x6a,
        0x21,
        0x05,
        0x20,
        0x05,
        0x3f,
        0x00,
        0x4b,
        0x04,
        0x40,
        0x20,
        0x05,
        0x3f,
        0x00,
        0x6b,
        0x40,
        0x00,
        0x41,
        ...signedLeb(-1),
        0x46,
        0x04,
        0x40,
        0x00,
        0x0b,
        0x0b,
        0x20,
        0x04,
        0x24,
        ...unsignedLeb(2),
        0x20,
        0x00,
        0x05,
        0x20,
        0x02,
        0x10,
        ...unsignedLeb(allocIndex),
        0x21,
        0x05,
        0x20,
        0x01,
        0x20,
        0x02,
        0x49,
        0x04,
        0x7f,
        0x20,
        0x01,
        0x05,
        0x20,
        0x02,
        0x0b,
        0x21,
        0x04,
        0x20,
        0x05,
        0x20,
        0x00,
        0x20,
        0x04,
        0xfc,
        0x0a,
        0x00,
        0x00,
        0x20,
        0x00,
        0x20,
        0x01,
        0x10,
        ...unsignedLeb(deallocIndex),
        0x20,
        0x05,
        0x0b,
      ],
      [5, 1, 0x7f, 1, 0x7f, 1, 0x7f, 1, 0x7f, 1, 0x7f],
    ),
  );
  codeBodies.push(bodyFor([0x41, ...signedLeb(STATIC_DATA_START), 0x24, ...unsignedLeb(2)], [0]));
  const output: number[] = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];
  output.push(...section(1, [...unsignedLeb(typeBodies.length), ...typeBodies.flat()]));
  output.push(
    ...section(2, [
      ...unsignedLeb(imports.length),
      ...imports.flatMap((imported) => [
        ...wasmString(imported.module),
        ...wasmString(imported.name),
        0x00,
        ...unsignedLeb(imported.typeIndex),
      ]),
    ]),
  );
  output.push(
    ...section(3, [...unsignedLeb(allFunctionTypes.length), ...allFunctionTypes.flatMap((type) => unsignedLeb(type))]),
  );
  const initialPages = Math.max(1, Math.ceil(dataEnd / PAGE_SIZE));
  if (!Number.isSafeInteger(maximumPages) || maximumPages < initialPages)
    throw new ForgeWebScriptTrap(
      'MemoryExhausted',
      `VM WASM maximum memory pages must be an integer of at least ${String(initialPages)}.`,
    );
  output.push(...section(5, [0x01, 0x01, ...unsignedLeb(initialPages), ...unsignedLeb(maximumPages)]));
  output.push(
    ...section(6, [
      0x03,
      0x7f,
      0x01,
      0x41,
      0x00,
      0x0b,
      0x7f,
      0x01,
      0x41,
      ...signedLeb(-1),
      0x0b,
      0x7f,
      0x01,
      0x41,
      ...signedLeb(STATIC_DATA_START),
      0x0b,
    ]),
  );
  const exports = [
    ...module.functions.map((_, index) => [
      ...wasmString(`fws_fn_${index}`),
      0x00,
      ...unsignedLeb(imports.length + index),
    ]),
    [...wasmString('fws_alloc'), 0x00, ...unsignedLeb(allocIndex)],
    [...wasmString('fws_dealloc'), 0x00, ...unsignedLeb(deallocIndex)],
    [...wasmString('fws_realloc'), 0x00, ...unsignedLeb(reallocIndex)],
    [...wasmString('fws_reset'), 0x00, ...unsignedLeb(resetIndex)],
    [...wasmString('memory'), 0x02, 0x00],
  ];
  output.push(...section(7, [unsignedLeb(exports.length), ...exports.flat()].flat()));
  output.push(...section(10, [...unsignedLeb(codeBodies.length), ...codeBodies.flat()]));
  if (dataSegments.length > 0) {
    const segments = dataSegments.flatMap((segment) => [
      0x00,
      0x41,
      ...signedLeb(segment.offset),
      0x0b,
      ...unsignedLeb(segment.bytes.byteLength),
      ...bytes([...segment.bytes]),
    ]);
    output.push(...section(11, [0x01, ...segments]));
  }
  return new Uint8Array(output);
}

export interface ForgeWebScriptVmWasmCompileOptions {
  readonly compilerVersion?: string;
  readonly maxMemoryPages?: number;
}

export function compileForgeWebScriptVmWasm(
  module: ForgeWebScriptVmModule,
  options: ForgeWebScriptVmWasmCompileOptions = {},
): ForgeWebScriptVmWasmArtifact {
  validateForgeWebScriptVmModule(module);
  const compilerVersion = options.compilerVersion ?? '0.1.0';
  const wasm = buildModule(module, options.maxMemoryPages ?? FORGE_WEB_SCRIPT_VM_DEFAULT_MAX_MEMORY_PAGES);
  const artifact = {
    format: 'forge-web-script-vm-wasm' as const,
    moduleVersion: '1.0' as const,
    sourceHash: module.sourceHash,
    compilerVersion,
    loweringVersion: FORGE_WEB_SCRIPT_VM_WASM_LOWERING_VERSION,
    abiVersion: FORGE_WEB_SCRIPT_VM_WASM_ABI_VERSION,
    loweringProfile: 'register-dispatch-v1' as const,
    module,
    functions: module.functions,
    wasm,
  };
  return { ...artifact, reproducibilityHash: artifactHash({ ...artifact, reproducibilityHash: '' }) };
}

function flatValue(
  value: ForgeWebScriptVmValue,
  memory: WebAssembly.Memory,
  allocate: (size: number) => number,
): readonly (number | bigint)[] {
  if (value.kind === 'unit') return [];
  if (value.kind === 'bool') return [value.value ? 1 : 0];
  if (value.kind === 'number') return [value.value];
  if (value.kind === 'bytes') {
    checkedRange(value.pointer, value.length, memory, 'VM WASM received an invalid bytes pointer-length value.');
    return [value.pointer, value.length];
  }
  if (value.kind === 'aggregate') {
    const pointer = allocate(value.bytes.byteLength);
    new Uint8Array(memory.buffer).set(value.bytes, pointer);
    return [pointer, value.bytes.byteLength];
  }
  throw new ForgeWebScriptTrap('InvalidAbi', 'Function values are not supported by the VM WASM backend.');
}

function decodeValue(
  rep: VmRep,
  values: readonly (number | bigint)[],
  memory: WebAssembly.Memory,
): ForgeWebScriptVmValue {
  if (rep.kind === 'unit') return { kind: 'unit' };
  if (rep.kind === 'bool') return { kind: 'bool', value: Number(values[0]) !== 0 };
  if (rep.kind === 'number') {
    const value = values[0] ?? 0;
    if (rep.type === 'f32') return { kind: 'number', type: rep.type, value: Math.fround(Number(value)) };
    if (rep.type === 'f64') return { kind: 'number', type: rep.type, value: Number(value) };
    if (rep.type === 'i64') return { kind: 'number', type: rep.type, value: BigInt.asIntN(64, BigInt(value)) };
    if (rep.type === 'u64') return { kind: 'number', type: rep.type, value: BigInt.asUintN(64, BigInt(value)) };
    const integer = BigInt(value);
    return {
      kind: 'number',
      type: rep.type,
      value: Number(rep.type === 'u32' ? BigInt.asUintN(32, integer) : BigInt.asIntN(32, integer)),
    };
  }
  const pointer = Number(values[0] ?? 0);
  const length = Number(values[1] ?? 0);
  checkedRange(pointer, length, memory, 'VM WASM returned an invalid pointer-length value.');
  if (rep.kind === 'bytes') return { kind: 'bytes', pointer, length, ownership: 'owned' };
  return {
    kind: 'aggregate',
    layout: rep.layout,
    bytes: new Uint8Array(memory.buffer).slice(pointer, pointer + length),
    ownership: 'owned',
  };
}

function importValue(
  value: ForgeWebScriptVmValue,
  rep: VmRep,
  memory: WebAssembly.Memory,
  allocate: (size: number) => number,
): readonly (number | bigint)[] {
  if (
    !sameRep(rep, repFromConstant(value)) &&
    !(rep.kind === 'bytes' && value.kind === 'bytes') &&
    !(rep.kind === 'aggregate' && value.kind === 'aggregate')
  )
    throw new ForgeWebScriptTrap('GuestTrap', 'VM WASM received an argument with an invalid type.');
  if (value.kind === 'aggregate' && rep.kind === 'aggregate') {
    const pointer = allocate(value.bytes.byteLength);
    new Uint8Array(memory.buffer).set(value.bytes, pointer);
    return [pointer, value.bytes.byteLength];
  }
  if (value.kind === 'bytes' && rep.kind === 'bytes') {
    checkedRange(value.pointer, value.length, memory, 'VM WASM received an invalid pointer-length value.');
  }
  return flatValue(value, memory, allocate);
}

export function prepareForgeWebScriptVmWasm(
  moduleOrArtifact: ForgeWebScriptVmModule | ForgeWebScriptVmWasmArtifact,
  options: ForgeWebScriptVmPreparedExecutorOptions = {},
): ForgeWebScriptVmPreparedExecutor {
  const mode = options.mode ?? 'jit';
  const maximumPages = options.maxMemoryPages ?? FORGE_WEB_SCRIPT_VM_DEFAULT_MAX_MEMORY_PAGES;
  const artifact =
    'wasm' in moduleOrArtifact
      ? options.maxMemoryPages === undefined
        ? moduleOrArtifact
        : compileForgeWebScriptVmWasm(moduleOrArtifact.module, {
            compilerVersion: options.compilerVersion,
            maxMemoryPages: maximumPages,
          })
      : compileForgeWebScriptVmWasm(moduleOrArtifact, {
          compilerVersion: options.compilerVersion,
          maxMemoryPages: maximumPages,
        });
  if (
    artifact.format !== 'forge-web-script-vm-wasm' ||
    artifact.moduleVersion !== '1.0' ||
    artifact.abiVersion !== FORGE_WEB_SCRIPT_VM_WASM_ABI_VERSION ||
    artifact.loweringVersion !== FORGE_WEB_SCRIPT_VM_WASM_LOWERING_VERSION
  )
    throw new ForgeWebScriptTrap('InvalidAbi', 'VM WASM artifact format or ABI version is unsupported.');
  if (artifact.reproducibilityHash !== artifactHash(artifact))
    throw new ForgeWebScriptTrap('InvalidAbi', 'VM WASM artifact reproducibility hash does not match its contents.');
  validateForgeWebScriptVmModule(artifact.module);
  const compiled = new WebAssembly.Module(artifact.wasm.buffer as ArrayBuffer);
  let instance: WebAssembly.Instance;
  let pendingTrap: ForgeWebScriptTrap | undefined;
  let closed = false;
  let steps = 0;
  let maxSteps: number | undefined;
  let memory: WebAssembly.Memory | undefined;
  let activeTrace: ReturnType<typeof createForgeWebScriptTraceRecorder> | undefined;
  let activeFunctionName = '';
  let activeRedact: ForgeWebScriptTraceOptions['redact'];
  let traceFinished = false;
  let executionInProgress = false;
  // eslint-disable-next-line unicorn/consistent-function-scoping -- Keep observability scoped to one VM execution.
  const observe = (callback: () => void): void => {
    try {
      callback();
    } catch {
      // Observability must never alter guest behavior.
    }
  };
  const functionExports = new Map(
    artifact.module.functions.map((function_, index) => [function_.name, `fws_fn_${index}`]),
  );
  const exports = (): Record<string, WebAssembly.ExportValue> =>
    instance.exports as Record<string, WebAssembly.ExportValue>;
  const allocate = (size: number): number => {
    const allocator = exports().fws_alloc as (size: number) => number;
    const pointer = allocator(size);
    observe(() => {
      activeTrace?.noteAllocation('allocate', size);
      activeTrace?.recordMemory('allocate', pointer, size, steps, 'owned');
    });
    return pointer;
  };
  const capabilityImport = (
    imported: ForgeWebScriptVmCapabilityImport,
  ): ((...values: readonly (number | bigint)[]) => unknown) => {
    return (...values) => {
      try {
        const capability = options.capabilities?.[imported.name];
        if (capability === undefined) {
          observe(() => activeTrace?.recordCapability(imported.capability, 'denied', steps));
          throw new ForgeWebScriptTrap(
            'CapabilityDenied',
            `Capability '${imported.capability}' is unavailable.`,
            imported.capability,
          );
        }
        const parameterReps = imported.parameters.map((parameter) => typeForValue(parameter));
        let offset = 0;
        const arguments_: ForgeWebScriptVmValue[] = [];
        for (const parameter of parameterReps) {
          const width = flatTypes(parameter).length;
          arguments_.push(decodeValue(parameter, values.slice(offset, offset + width), memory!));
          offset += width;
        }
        const result = capability(...arguments_);
        observe(() =>
          activeTrace?.recordCapability(
            imported.capability,
            'allowed',
            steps,
            arguments_.map((value) => summarizeForgeWebScriptVmValue(value, activeRedact)).join(','),
          ),
        );
        if (result === undefined || !['unit', 'bool', 'number', 'bytes', 'aggregate'].includes(result.kind))
          throw new Error('Capability returned an invalid VM value.');
        const resultRepValue = resultRep(imported.result);
        const flat =
          result.kind === 'bytes' || result.kind === 'aggregate'
            ? (() => {
                const source =
                  result.kind === 'bytes'
                    ? (() => {
                        checkedRange(
                          result.pointer,
                          result.length,
                          memory!,
                          'Capability returned an invalid bytes pointer-length value.',
                        );
                        return new Uint8Array(memory!.buffer).slice(result.pointer, result.pointer + result.length);
                      })()
                    : result.bytes;
                const pointer = allocate(source.byteLength);
                new Uint8Array(memory!.buffer).set(source, pointer);
                return [pointer, source.byteLength] as readonly (number | bigint)[];
              })()
            : flatValue(result, memory!, allocate);
        return flatTypes(resultRepValue).length > 1 ? flat : flat[0];
      } catch (error) {
        observe(() => activeTrace?.recordCapability(imported.capability, 'failed', steps));
        pendingTrap =
          error instanceof ForgeWebScriptTrap ? error : toForgeWebScriptHostError(error, imported.capability);
        throw new Error(pendingTrap.message);
      }
    };
  };
  const imports: WebAssembly.Imports = {
    [RUNTIME_IMPORT_MODULE]: {
      [STEP_IMPORT]: () => {
        steps += 1;
        observe(() => activeTrace?.recordInstruction(activeFunctionName, steps - 1, steps));
        return maxSteps !== undefined && steps > maxSteps ? 1 : 0;
      },
      [COMPARE_IMPORT]: (leftPointer: number, leftLength: number, rightPointer: number, rightLength: number) => {
        observe(() => activeTrace?.recordRangeCheck(leftPointer, leftLength, steps));
        checkedRange(
          leftPointer,
          leftLength,
          memory!,
          'VM WASM comparison received an invalid left pointer-length value.',
        );
        observe(() => activeTrace?.recordRangeCheck(rightPointer, rightLength, steps));
        checkedRange(
          rightPointer,
          rightLength,
          memory!,
          'VM WASM comparison received an invalid right pointer-length value.',
        );
        if (leftLength !== rightLength) return 0;
        const view = new Uint8Array(memory!.buffer);
        for (let index = 0; index < leftLength; index += 1)
          if (view[leftPointer + index] !== view[rightPointer + index]) return 0;
        return 1;
      },
      [BYTE_AT_IMPORT]: (pointer: number, length: number, index: number) => {
        observe(() => activeTrace?.recordRangeCheck(pointer, length, steps));
        checkedRange(pointer, length, memory!, 'VM WASM byte-at received an invalid pointer-length value.');
        if (!Number.isInteger(index) || index < 0 || index >= length) {
          pendingTrap = new ForgeWebScriptTrap(
            'GuestTrap',
            `byte-at index ${String(index)} is outside the aggregate payload.`,
          );
          throw new Error(pendingTrap.message);
        }
        return new Uint8Array(memory!.buffer)[pointer + index]!;
      },
      [TRAP_IMPORT]: (functionIndex: number, instructionIndex: number) => {
        const instruction = artifact.module.functions[functionIndex]?.code[instructionIndex];
        pendingTrap =
          instruction?.opcode === 'trap'
            ? new ForgeWebScriptTrap('GuestTrap', `${instruction.code}: ${instruction.message}`)
            : new ForgeWebScriptTrap('GuestTrap', 'VM WASM encountered an invalid trap instruction reference.');
        observe(() =>
          activeTrace?.recordTrap(pendingTrap?.code ?? 'GuestTrap', pendingTrap?.message ?? 'VM WASM trap', steps),
        );
        throw new Error(pendingTrap.message);
      },
    },
    [CAPABILITY_IMPORT_MODULE]: Object.fromEntries(
      artifact.module.capabilityImports.map((imported) => [imported.name, capabilityImport(imported)]),
    ),
  };
  instance = new WebAssembly.Instance(compiled, imports);
  memory = exports().memory as WebAssembly.Memory;
  const resetState = (): void => {
    (exports().fws_reset as () => void)();
    steps = 0;
    pendingTrap = undefined;
  };
  const reset = (): void => {
    if (executionInProgress)
      throw new ForgeWebScriptTrap('InvalidAbi', 'VM WASM prepared executor cannot reset during execution.');
    resetState();
  };
  const execute = (
    functionName: string,
    arguments_: readonly ForgeWebScriptVmValue[],
    executionOptions: Omit<ForgeWebScriptVmExecutionOptions, 'mode' | 'capabilities'> = {},
  ): ForgeWebScriptVmExecutionResult => {
    if (closed) throw new ForgeWebScriptTrap('InvalidAbi', 'VM WASM prepared executor is closed.');
    const function_ = artifact.module.functions.find((candidate) => candidate.name === functionName);
    if (function_ === undefined)
      throw new ForgeWebScriptTrap('GuestTrap', `Function '${functionName}' does not exist.`);
    if (arguments_.length !== function_.parameters.length)
      throw new ForgeWebScriptTrap('GuestTrap', `Function '${functionName}' received an invalid argument count.`);
    if (executionInProgress)
      throw new ForgeWebScriptTrap('InvalidAbi', 'VM WASM prepared executor does not support nested execution.');
    executionInProgress = true;
    try {
      resetState();
      maxSteps = executionOptions.maxSteps;
      if (executionOptions.maxMemoryPages !== undefined && executionOptions.maxMemoryPages < maximumPages)
        throw new ForgeWebScriptTrap(
          'InvalidAbi',
          'VM WASM prepared executor was compiled with a larger memory limit than this execution allows.',
        );
      activeFunctionName = functionName;
      activeTrace =
        executionOptions.trace === undefined
          ? undefined
          : createForgeWebScriptTraceRecorder(executionOptions.trace, functionName);
      activeRedact = executionOptions.trace?.redact;
      const requiredBytes = executionOptions.memory?.byteLength ?? 0;
      const requiredPages = Math.ceil(requiredBytes / PAGE_SIZE);
      if (requiredPages > memory!.buffer.byteLength / PAGE_SIZE) {
        try {
          memory!.grow(requiredPages - memory!.buffer.byteLength / PAGE_SIZE);
        } catch (error) {
          throw new ForgeWebScriptTrap(
            'MemoryExhausted',
            'VM WASM memory could not grow for this execution.',
            undefined,
            {
              cause: error,
            },
          );
        }
      }
      if (executionOptions.memory !== undefined) new Uint8Array(memory!.buffer).set(executionOptions.memory, 0);
      const arguments__ = arguments_.flatMap((argument, index) =>
        importValue(argument, typeForValue(function_.parameters[index]!), memory!, allocate),
      );
      const exportName = functionExports.get(functionName);
      if (exportName === undefined)
        throw new ForgeWebScriptTrap('GuestTrap', `Function '${functionName}' does not exist.`);
      const resultValues = (exports()[exportName] as (...values: readonly (number | bigint)[]) => unknown)(
        ...arguments__,
      );
      if (pendingTrap !== undefined) throw pendingTrap;
      const flatResult =
        flatTypes(resultRep(function_.result)).length === 0
          ? []
          : Array.isArray(resultValues)
            ? resultValues
            : [resultValues as number | bigint];
      const result = {
        value: decodeValue(resultRep(function_.result), flatResult, memory!),
        memory: new Uint8Array(memory!.buffer).slice(),
        steps,
        mode,
        ...(activeTrace === undefined
          ? {}
          : {
              trace: activeTrace.finish({
                steps,
                memory: new Uint8Array(memory!.buffer),
                termination: 'returned',
              }),
            }),
      };
      traceFinished = activeTrace !== undefined;
      return result;
    } catch (error) {
      if (pendingTrap === undefined && error instanceof ForgeWebScriptTrap) pendingTrap = error;
      if (pendingTrap === undefined)
        pendingTrap = new ForgeWebScriptTrap(
          'GuestTrap',
          error instanceof Error ? error.message : 'VM WASM execution trapped.',
          undefined,
          { cause: error },
        );
      throw pendingTrap ?? error;
    } finally {
      if (activeTrace !== undefined && !traceFinished) {
        const trapError = pendingTrap;
        const report = activeTrace.finish({
          steps,
          memory: new Uint8Array(memory!.buffer),
          termination: trapError?.message.includes('step limit') ? 'step-limit' : 'trapped',
          ...(trapError === undefined
            ? {}
            : {
                trap: {
                  code: trapError.code,
                  message: trapError.message,
                  ...(trapError.capability === undefined ? {} : { capability: trapError.capability }),
                },
              }),
        });
        if (trapError !== undefined) attachForgeWebScriptTrace(trapError, report);
      }
      try {
        (exports().fws_reset as () => void)();
      } finally {
        executionInProgress = false;
        maxSteps = undefined;
        activeTrace = undefined;
        activeFunctionName = '';
        activeRedact = undefined;
        traceFinished = false;
      }
    }
  };
  const close = (): void => {
    if (executionInProgress)
      throw new ForgeWebScriptTrap('InvalidAbi', 'VM WASM prepared executor cannot close during execution.');
    closed = true;
    resetState();
  };
  return {
    artifact,
    mode,
    instance,
    memory,
    execute,
    reset,
    close,
    metadata: {
      backend: 'wasm',
      mode,
      instancePolicy: 'reusable-with-reset',
      abiVersion: FORGE_WEB_SCRIPT_VM_WASM_ABI_VERSION,
      loweringVersion: FORGE_WEB_SCRIPT_VM_WASM_LOWERING_VERSION,
      compilerVersion: artifact.compilerVersion,
      sourceHash: artifact.sourceHash,
      reproducibilityHash: artifact.reproducibilityHash,
    },
  };
}

export const prepareForgeWebScriptVm = prepareForgeWebScriptVmWasm;

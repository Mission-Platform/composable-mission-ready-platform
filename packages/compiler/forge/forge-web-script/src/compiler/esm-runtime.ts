import type { ForgeWebScriptHostImport } from '../manifest.js';

/**
 * Synthesizes the runtime value marshaling JavaScript code for strings, arrays, and records.
 */
export function createValueAdapterSource(
  valueExports: Record<string, unknown>,
  recordLayouts: Record<string, unknown>,
  valueImports: readonly ForgeWebScriptHostImport[],
  hasStringValues: boolean,
): string {
  return `const valueExports = ${JSON.stringify(valueExports)};
function createValueRuntime() { return { wasmExports: undefined, activeAllocations: undefined }; }
function checkedBytes(memory, pointer, length) {
  if (!Number.isSafeInteger(pointer) || pointer < 0 || !Number.isSafeInteger(length) || length < 0) {
    throw new RangeError('Forge Web Script string range is not a non-negative safe integer pair.');
  }
  const buffer = memory.buffer;
  if (pointer > buffer.byteLength || length > buffer.byteLength - pointer) {
    throw new RangeError('Forge Web Script string range [' + pointer + ', ' + length + '] is outside linear memory.');
  }
  return new Uint8Array(buffer, pointer, length);
}
function arraySnapshot(value) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError('Forge Web Script Array<i32> argument must be ArrayLike<number>.');
  }
  const length = value.length;
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new RangeError('Forge Web Script Array<i32> length must be a non-negative safe integer.');
  }
  if (length > 0x3ffffffe || (length + 1) * 4 > 0xffffffff) {
    throw new RangeError('Forge Web Script Array<i32> is too large.');
  }
  const values = new Int32Array(length);
  for (let index = 0; index < length; index += 1) {
    const element = value[index];
    if (!Number.isInteger(element) || element < -0x80000000 || element > 0x7fffffff) {
      throw new TypeError('Forge Web Script Array<i32> element at index ' + index + ' must be a signed 32-bit integer.');
    }
    values[index] = element;
  }
  return values;
}
function allocateArray(wasmExports, value) {
  const values = value instanceof Int32Array ? value : arraySnapshot(value);
  if (values.length > 0x3ffffffe || (values.length + 1) * 4 > 0xffffffff) {
    throw new RangeError('Forge Web Script Array<i32> is too large.');
  }
  const byteLength = (values.length + 1) * 4;
  const pointer = wasmExports.fws_alloc(byteLength);
  return { pointer, length: byteLength, values };
}
function pair(runtime, value, message) {
  if (!Array.isArray(value) || value.length < 2) throw new TypeError(message);
  checkedBytes(runtime.wasmExports.memory, value[0], value[1]);
  return [value[0], value[1]];
}
function rangesOverlap(left, right) {
  if (left.length === 0 || right.length === 0) return left.pointer === right.pointer;
  return left.pointer < right.pointer + right.length && right.pointer < left.pointer + left.length;
}
function release(wasmExports, range, released) {
  const key = range.pointer + ':' + range.length;
  if (released.has(key)) return;
  released.add(key);
  wasmExports.fws_dealloc(range.pointer, range.length);
}
${
  hasStringValues
    ? `const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
`
    : ''
}${
    hasStringValues
      ? `function decodeString(runtime, memory, value) {
  const range = pair(runtime, value, 'Forge Web Script string result is not a pointer-length pair.');
  return { bytes: checkedBytes(memory, range[0], range[1]), range: { pointer: range[0], length: range[1] } };
}
`
      : ''
  }const recordLayouts = ${JSON.stringify(recordLayouts)};
${
  Object.keys(recordLayouts).length === 0
    ? ''
    : `function decodeRecord(wasmExports, pointer, name) {
  const layout = recordLayouts[name];
  if (layout === undefined) throw new TypeError('Unknown Forge Web Script record: ' + name);
  const memory = wasmExports.memory;
  const bytes = checkedBytes(memory, pointer, layout.size);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const result = {};
  for (const field of layout.fields) {
    if (field.type.startsWith('Array<')) {
      const arrayPointer = view.getUint32(field.offset, true);
      const arrayLength = new DataView(memory.buffer, arrayPointer, 4).getUint32(0, true);
      const arrayDataPointer = arrayPointer + 4;
      const arrayBytes = checkedBytes(memory, arrayDataPointer, arrayLength * 4);
      const arrayView = new DataView(arrayBytes.buffer, arrayBytes.byteOffset, arrayBytes.byteLength);
      result[field.name] = Array.from({ length: arrayLength }, (_, index) => arrayView.getUint32(index * 4, true));
      wasmExports.fws_dealloc(arrayPointer, arrayLength * 4 + 4);
    } else if (field.type === 'f64') result[field.name] = view.getFloat64(field.offset, true);
    else if (field.type === 'f32') result[field.name] = view.getFloat32(field.offset, true);
    else if (field.type === 'i64' || field.type === 'u64') result[field.name] = field.type === 'i64' ? view.getBigInt64(field.offset, true) : view.getBigUint64(field.offset, true);
    else result[field.name] = field.type === 'u32' || field.type === 'bool' ? view.getUint32(field.offset, true) : view.getInt32(field.offset, true);
  }
  return result;
}
function encodeRecord(wasmExports, value, name) {
  const layout = recordLayouts[name];
  if (value === null || typeof value !== 'object') throw new TypeError('Forge Web Script record argument must be an object.');
  if (layout === undefined) throw new TypeError('Unknown Forge Web Script record: ' + name);
  const pointer = wasmExports.fws_alloc(layout.size);
  const nested = [];
  const bytes = checkedBytes(wasmExports.memory, pointer, layout.size);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (const field of layout.fields) {
    const fieldValue = value[field.name];
    if (field.type.startsWith('Array<')) {
      const array = fieldValue instanceof Uint32Array ? fieldValue : Uint32Array.from(fieldValue);
      const arrayPointer = wasmExports.fws_alloc((array.length + 1) * 4);
      nested.push({ pointer: arrayPointer, length: (array.length + 1) * 4 });
      const arrayView = new DataView(wasmExports.memory.buffer, arrayPointer, (array.length + 1) * 4);
      arrayView.setUint32(0, array.length, true);
      new Uint32Array(wasmExports.memory.buffer, arrayPointer + 4, array.length).set(array);
      view.setUint32(field.offset, arrayPointer, true);
    } else if (field.type === 'f64') view.setFloat64(field.offset, fieldValue, true);
    else if (field.type === 'f32') view.setFloat32(field.offset, fieldValue, true);
    else if (field.type === 'i64') view.setBigInt64(field.offset, BigInt(fieldValue), true);
    else if (field.type === 'u64') view.setBigUint64(field.offset, BigInt(fieldValue), true);
    else if (field.type === 'u32' || field.type === 'bool') view.setUint32(field.offset, fieldValue, true);
    else view.setInt32(field.offset, fieldValue, true);
  }
  return { pointer, length: layout.size, nested };
}
`
}function invokeValueExport(wasmExports, rawFunction, metadata, args, runtime) {
  const encoded = [];
  let total = 0;
  let stringCount = 0;
  for (let index = 0; index < metadata.parameters.length; index += 1) {
    if (metadata.parameters[index].type !== 'string') continue;
    stringCount += 1;
    if (typeof args[index] !== 'string') throw new TypeError('Forge Web Script string argument must be a JavaScript string.');
    const bytes = encoder.encode(args[index]);
    encoded.push(bytes);
    total += bytes.byteLength;
    if (!Number.isSafeInteger(total) || total > 0xffffffff) throw new RangeError('Forge Web Script string input is too large.');
  }
  // Guest allocations are bump-allocated. Reset before each independent value
  // call so temporary graph buffers from a previous call cannot exhaust the
  // Wasm page; result bytes remain valid until this invocation finishes.
  if (stringCount !== 0) wasmExports.fws_reset();
  const inputPointer = stringCount === 0 ? undefined : wasmExports.fws_alloc(total);
  let output;
  const owned = [];
  const previousOwned = runtime.activeAllocations;
  runtime.activeAllocations = owned;
  let operationError;
  try {
    const rawArgs = [];
    let encodedIndex = 0;
    let offset = 0;
    for (let index = 0; index < metadata.parameters.length; index += 1) {
      const parameter = metadata.parameters[index];
      if (parameter.type === 'bytes') {
        const value = args[index];
        if (!Array.isArray(value) || value.length < 2) throw new TypeError('Forge Web Script bytes value is not a pointer-length pair.');
        rawArgs.push(value[0], value[1]);
        continue;
      }
      if (parameter.reference === 'Array') {
        const array = allocateArray(wasmExports, args[index]);
        owned.push({ pointer: array.pointer, length: array.length });
        checkedBytes(wasmExports.memory, array.pointer, array.length);
        const view = new DataView(wasmExports.memory.buffer, array.pointer, array.length);
        view.setInt32(0, array.values.length, true);
        new Uint8Array(wasmExports.memory.buffer, array.pointer + 4, array.values.byteLength).set(
          new Uint8Array(array.values.buffer, array.values.byteOffset, array.values.byteLength),
        );
        rawArgs.push(array.pointer);
        continue;
      }
      if (parameter.reference !== undefined && recordLayouts[parameter.reference] !== undefined) {
        const record = encodeRecord(wasmExports, args[index], parameter.reference);
        owned.push(record);
        for (const nested of record.nested) owned.push(nested);
        rawArgs.push(record.pointer);
        continue;
      }
      if (parameter.type !== 'string') {
        rawArgs.push(args[index]);
        continue;
      }
      const bytes = encoded[encodedIndex++];
      checkedBytes(wasmExports.memory, inputPointer + offset, bytes.byteLength).set(bytes);
      rawArgs.push(inputPointer + offset, bytes.byteLength);
      offset += bytes.byteLength;
    }
    const result = rawFunction(...rawArgs);
    if (metadata.result === 'string') {
      const decoded = decodeString(runtime, wasmExports.memory, result);
      output = decoded.range;
      return decoder.decode(decoded.bytes);
    }
    if (metadata.resultReference !== undefined && recordLayouts[metadata.resultReference] !== undefined) {
      output = { pointer: result, length: recordLayouts[metadata.resultReference].size };
      return decodeRecord(wasmExports, result, metadata.resultReference);
    }
    return result;
  } catch (error) {
    operationError = error;
    throw error;
  } finally {
    const released = new Set();
    const input = inputPointer === undefined ? undefined : { pointer: inputPointer, length: total };
    const outputAliases = output !== undefined && (input !== undefined && rangesOverlap(output, input) || owned.some((range) => rangesOverlap(output, range)));
    try {
      if (output !== undefined && !outputAliases) release(wasmExports, output, released);
      for (const range of owned) release(wasmExports, range, released);
      if (input !== undefined) release(wasmExports, input, released);
    } catch (cleanupError) {
      if (operationError === undefined) throw cleanupError;
    } finally {
      runtime.activeAllocations = previousOwned;
    }
  }
}
function invokeCapability(hostFunction, metadata, args, runtime) {
  const hostArgs = [];
  let rawIndex = 0;
  for (const type of metadata.parameters) {
    if (type === 'string') {
      const value = pair(runtime, [args[rawIndex], args[rawIndex + 1]], 'Forge Web Script string import argument is not a pointer-length pair.');
      hostArgs.push(decoder.decode(checkedBytes(runtime.wasmExports.memory, value[0], value[1])));
      rawIndex += 2;
    } else if (type === 'bytes') {
      const value = pair(runtime, [args[rawIndex], args[rawIndex + 1]], 'Forge Web Script bytes import argument is not a pointer-length pair.');
      hostArgs.push(value);
      rawIndex += 2;
    } else {
      hostArgs.push(args[rawIndex]);
      rawIndex += 1;
    }
  }
  const result = hostFunction(...hostArgs);
  if (metadata.result === 'string') {
    if (typeof result !== 'string') throw new TypeError('Forge Web Script string capability result must be a JavaScript string.');
    const bytes = encoder.encode(result);
    const pointer = runtime.wasmExports.fws_alloc(bytes.byteLength);
    try {
      checkedBytes(runtime.wasmExports.memory, pointer, bytes.byteLength).set(bytes);
    } catch (error) {
      try { release(runtime.wasmExports, { pointer, length: bytes.byteLength }, new Set()); } catch {}
      throw error;
    }
    runtime.activeAllocations?.push({ pointer, length: bytes.byteLength });
    return [pointer, bytes.byteLength];
  }
  if (metadata.result === 'bytes') return pair(runtime, result, 'Forge Web Script bytes capability result is not a pointer-length pair.');
  return result;
}
function adaptCapabilityImports(imports, runtime) {
  const adapted = { ...imports };
  for (const metadata of ${JSON.stringify(
    valueImports.map(({ capability, alias, function: declaration }) => ({
      capability,
      alias,
      parameters: declaration.parameters.map(({ type }: { readonly type: string }) => type),
      result: declaration.result,
    })),
  )}) {
    const capability = adapted[metadata.capability];
    if (capability === undefined || typeof capability[metadata.alias] !== 'function') continue;
    adapted[metadata.capability] = {
      ...capability,
      [metadata.alias]: (...args) => invokeCapability(capability[metadata.alias], metadata, args, runtime),
    };
  }
  return adapted;
}
function initializeValueRuntime(runtime, wasmExports) {
  runtime.wasmExports = wasmExports;
}
function adaptValueExports(wasmExports, runtime) {
  return Object.fromEntries(Object.entries(wasmExports).map(([name, value]) => {
    const metadata = valueExports[name];
    if (metadata === undefined || typeof value !== 'function') return [name, value];
    return [name, (...args) => invokeValueExport(wasmExports, value, metadata, args, runtime)];
  }));
}`;
}

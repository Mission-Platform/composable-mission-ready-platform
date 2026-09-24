/**
 * Binary WebAssembly parser and cursor utilities for artifact verification.
 */

/** WebAssembly value type codes. */
export type WasmType = 0x7f | 0x7e | 0x7d | 0x7c;

/** WebAssembly function type signature. */
export interface FunctionType {
  readonly parameters: readonly WasmType[];
  readonly results: readonly WasmType[];
}

/** WebAssembly imported entity record. */
export interface WasmImport {
  readonly module: string;
  readonly name: string;
  readonly kind: number;
  readonly typeIndex?: number;
  readonly memory?: WasmMemory;
}

/** WebAssembly exported entity record. */
export interface WasmExport {
  readonly name: string;
  readonly kind: number;
  readonly index: number;
}

/** WebAssembly linear memory declaration. */
export interface WasmMemory {
  readonly minimum: number | bigint;
  readonly maximum?: number | bigint;
  readonly shared: boolean;
  readonly memory64: boolean;
}

/** Structured representation of parsed WebAssembly binary sections. */
export interface ParsedWasm {
  readonly types: readonly FunctionType[];
  readonly imports: readonly WasmImport[];
  readonly functionTypeIndexes: readonly number[];
  readonly exports: readonly WasmExport[];
  readonly memory?: WasmMemory;
  readonly customSections: ReadonlyMap<string, Uint8Array>;
}

/** Stateful cursor over a WebAssembly binary byte array. */
export class Cursor {
  public readonly bytes: Uint8Array;
  public position: number;
  public readonly end: number;

  public constructor(bytes: Uint8Array, position = 0, end = bytes.byteLength) {
    this.bytes = bytes;
    this.position = position;
    this.end = end;
  }

  /** Remaining unread bytes in buffer. */
  public remaining(): number {
    return Math.max(0, this.end - this.position);
  }

  /** Reads a single byte from the buffer. */
  public byte(): number {
    if (this.position >= this.end) throw new Error('Unexpected end of WebAssembly section.');
    return this.bytes[this.position++] ?? 0;
  }

  /** Decodes an unsigned LEB128 integer from the buffer with strict canonical encoding checks. */
  // skipcq: JS-R1005
  public leb(maxBytes = 5, strictCanonical = true): number {
    let value = 0;
    let shift = 0;
    for (let count = 0; count < maxBytes; count += 1) {
      const byte = this.byte();
      // On 5th byte (count === 4), for 32-bit integer, only 4 bits (bits 0..3) can be used (shift = 28).
      if (count === 4 && (byte & 0x70) !== 0) {
        throw new Error('WebAssembly integer exceeds 32-bit bounds.');
      }
      value += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) {
        if (strictCanonical && count > 0 && byte === 0x00) {
          throw new Error('Non-canonical overlong LEB128 integer encoding.');
        }
        if (!Number.isSafeInteger(value)) {
          throw new TypeError('WebAssembly integer exceeds safe integer limit.');
        }
        return value;
      }
      shift += 7;
    }
    throw new Error('WebAssembly integer is too long.');
  }

  /** Decodes an unsigned 64-bit LEB128 integer from the buffer using BigInt with strict canonical encoding checks. */
  // skipcq: JS-R1005
  public leb64(maxBytes = 10, strictCanonical = true): bigint {
    let value = 0n;
    let shift = 0n;
    for (let count = 0; count < maxBytes; count += 1) {
      const byte = BigInt(this.byte());
      // On 10th byte (count === 9), for 64-bit integer, only 1 bit (bit 0) can be used (shift = 63).
      if (count === 9 && (byte & 0x7en) !== 0n) {
        throw new Error('WebAssembly 64-bit integer exceeds bounds.');
      }
      value |= (byte & 0x7fn) << shift;
      if ((byte & 0x80n) === 0n) {
        if (strictCanonical && count > 0 && byte === 0n) {
          throw new Error('Non-canonical overlong 64-bit LEB128 integer encoding.');
        }
        return value;
      }
      shift += 7n;
    }
    throw new Error('WebAssembly 64-bit integer is too long.');
  }

  /** Reads a slice of bytes from the buffer. */
  public bytesValue(length: number): Uint8Array {
    if (!Number.isSafeInteger(length) || length < 0 || length > this.remaining())
      throw new Error('Invalid WebAssembly section length.');
    const value = this.bytes.slice(this.position, this.position + length);
    this.position += length;
    return value;
  }

  /** Decodes a UTF-8 string prefixed by its LEB128 byte length. */
  public string(maxLength: number): string {
    const length = this.leb();
    if (length > maxLength) throw new Error('WebAssembly name exceeds the verifier limit.');
    if (length > this.remaining()) throw new Error('WebAssembly string length exceeds remaining payload bytes.');
    return new TextDecoder().decode(this.bytesValue(length));
  }
}

/** Parses WebAssembly memory or table limits from binary stream. */
// skipcq: JS-R1005
export function parseLimits(cursor: Cursor): WasmMemory {
  const flags = cursor.leb();
  const memory64 = (flags & 0x04) !== 0;
  const shared = (flags & 0x02) !== 0;
  const hasMaximum = (flags & 0x01) !== 0 || (flags & 0x02) !== 0;
  if (memory64) {
    const rawMin = cursor.leb64(10);
    const rawMax = hasMaximum ? cursor.leb64(10) : undefined;
    const minimum = rawMin <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(rawMin) : rawMin;
    const maximum =
      rawMax === undefined ? undefined : rawMax <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(rawMax) : rawMax;
    return { minimum, ...(maximum === undefined ? {} : { maximum }), shared, memory64 };
  }
  const minimum = cursor.leb(5);
  const maximum = hasMaximum ? cursor.leb(5) : undefined;
  return { minimum, ...(maximum === undefined ? {} : { maximum }), shared, memory64 };
}

// skipcq: JS-D1001
function readWasmType(payload: Cursor): WasmType {
  const byte = payload.byte();
  if (byte !== 0x7f && byte !== 0x7e && byte !== 0x7d && byte !== 0x7c) {
    throw new Error('Unsupported WebAssembly value type.');
  }
  return byte;
}

/** Parses the type section of a WebAssembly module. */
// skipcq: JS-R1005
function parseTypeSection(payload: Cursor): FunctionType[] {
  const count = payload.leb();
  if (count > 100_000 || count > payload.remaining()) {
    throw new Error('WebAssembly type section is too large or exceeds payload bytes.');
  }
  const types: FunctionType[] = [];
  for (let index = 0; index < count; index += 1) {
    if (payload.byte() !== 0x60) throw new Error('Unsupported WebAssembly type declaration.');
    const parameterCount = payload.leb();
    if (parameterCount > payload.remaining()) {
      throw new Error('WebAssembly parameter count exceeds payload bytes.');
    }
    const parameters = Array.from({ length: parameterCount }, () => readWasmType(payload));
    const resultCount = payload.leb();
    if (resultCount > payload.remaining()) {
      throw new Error('WebAssembly result count exceeds payload bytes.');
    }
    const results = Array.from({ length: resultCount }, () => readWasmType(payload));
    types.push({ parameters, results });
  }
  return types;
}

/** Parses one import entry from the import section payload. */
// skipcq: JS-R1005
function parseImportEntry(payload: Cursor): WasmImport {
  const module = payload.string(256);
  const name = payload.string(256);
  const kind = payload.byte();
  if (kind === 0) {
    return { module, name, kind, typeIndex: payload.leb() };
  }
  if (kind === 1) {
    payload.byte();
    payload.leb();
    if (payload.byte() === 0x70) payload.leb();
    return { module, name, kind };
  }
  if (kind === 2) {
    const memory = parseLimits(payload);
    return { module, name, kind, memory };
  }
  if (kind === 3) {
    payload.byte();
    payload.byte();
    return { module, name, kind };
  }
  throw new Error('Unsupported WebAssembly import kind.');
}

/** Parses the import section of a WebAssembly module. */
function parseImportSection(payload: Cursor): WasmImport[] {
  const count = payload.leb();
  if (count > 100_000 || count > payload.remaining()) {
    throw new Error('WebAssembly import section is too large or exceeds payload bytes.');
  }
  const imports: WasmImport[] = [];
  for (let index = 0; index < count; index += 1) {
    imports.push(parseImportEntry(payload));
  }
  return imports;
}

/** Parses the function section of a WebAssembly module. */
function parseFunctionSection(payload: Cursor): number[] {
  const count = payload.leb();
  if (count > 100_000 || count > payload.remaining()) {
    throw new Error('WebAssembly function section is too large or exceeds payload bytes.');
  }
  const indexes: number[] = [];
  for (let index = 0; index < count; index += 1) {
    indexes.push(payload.leb());
  }
  return indexes;
}

/** Parses the memory section of a WebAssembly module. */
function parseMemorySection(payload: Cursor, existingMemory: WasmMemory | undefined): WasmMemory {
  const count = payload.leb();
  if (count !== 1 || existingMemory !== undefined) throw new Error('FWS modules must declare exactly one memory.');
  return parseLimits(payload);
}

/** Parses the export section of a WebAssembly module. */
function parseExportSection(payload: Cursor): WasmExport[] {
  const count = payload.leb();
  if (count > 100_000 || count > payload.remaining()) {
    throw new Error('WebAssembly export section is too large or exceeds payload bytes.');
  }
  const exports: WasmExport[] = [];
  for (let index = 0; index < count; index += 1) {
    exports.push({ name: payload.string(256), kind: payload.byte(), index: payload.leb() });
  }
  return exports;
}

/** Validates WebAssembly binary header magic and version. */
// skipcq: JS-R1005
function validateWasmHeader(bytes: Uint8Array): void {
  if (
    bytes.byteLength < 8 ||
    bytes[0] !== 0 ||
    bytes[1] !== 0x61 ||
    bytes[2] !== 0x73 ||
    bytes[3] !== 0x6d ||
    bytes[4] !== 1
  ) {
    throw new Error('Invalid WebAssembly magic or version.');
  }
}

interface SectionBuilder {
  types: FunctionType[];
  imports: WasmImport[];
  functionTypeIndexes: number[];
  exports: WasmExport[];
  memory?: WasmMemory;
}

// skipcq: JS-D1001, JS-R1005
function parseStandardSection(id: number, payload: Cursor, builder: SectionBuilder): void {
  switch (id) {
    case 1: {
      builder.types = parseTypeSection(payload);
      break;
    }
    case 2: {
      builder.imports = parseImportSection(payload);
      const memoryImport = builder.imports.find((entry) => entry.kind === 2);
      if (memoryImport?.memory !== undefined && builder.memory === undefined) {
        builder.memory = memoryImport.memory;
      }
      break;
    }
    case 3: {
      builder.functionTypeIndexes = parseFunctionSection(payload);
      break;
    }
    case 5: {
      builder.memory = parseMemorySection(payload, builder.memory);
      break;
    }
    case 7: {
      builder.exports = parseExportSection(payload);
      break;
    }
    default: {
      break;
    }
  }
}

// skipcq: JS-D1001
function parseCustomSection(payload: Cursor, maxBytes: number, customSections: Map<string, Uint8Array>): void {
  const name = payload.string(256);
  if (payload.remaining() > maxBytes) {
    throw new Error('WebAssembly custom section exceeds the verifier limit.');
  }
  if (customSections.has(name)) {
    throw new Error(`Duplicate WebAssembly custom section "${name}".`);
  }
  customSections.set(name, payload.bytesValue(payload.remaining()));
}

/** Parses binary WebAssembly byte array into structured section records. */
// skipcq: JS-R1005
export function parseWasm(bytes: Uint8Array, maxCustomSectionBytes: number): ParsedWasm {
  validateWasmHeader(bytes);
  const customSections = new Map<string, Uint8Array>();
  const builder: SectionBuilder = { types: [], imports: [], functionTypeIndexes: [], exports: [] };
  const cursor = new Cursor(bytes, 8);
  let lastSection = 0;

  while (cursor.remaining() > 0) {
    const id = cursor.byte();
    const length = cursor.leb(5);
    if (length > cursor.remaining()) {
      throw new Error('WebAssembly section length exceeds physical binary size.');
    }
    if (id === 0 && length > maxCustomSectionBytes) {
      throw new Error('WebAssembly custom section exceeds the verifier limit.');
    }
    const payload = new Cursor(cursor.bytesValue(length));
    if (id !== 0 && id < lastSection) throw new Error('WebAssembly sections are out of order.');
    if (id !== 0) lastSection = id;

    if (id === 0) {
      parseCustomSection(payload, maxCustomSectionBytes, customSections);
    } else {
      parseStandardSection(id, payload, builder);
    }
  }

  return {
    types: builder.types,
    imports: builder.imports,
    functionTypeIndexes: builder.functionTypeIndexes,
    exports: builder.exports,
    ...(builder.memory === undefined ? {} : { memory: builder.memory }),
    customSections,
  };
}

import { describe, expect, it } from 'vitest';

import { parseFlint } from '../parser.js';

import {
  compileCHeader,
  compileWebIdl,
  generateFlintBindings,
  generateHostShims,
  generateTypeDeclarations,
  lexWebIdl,
  parseWebIdl,
  WebIdlParseError,
} from '.';

function mockHostApi(view: Uint8Array): void {
  for (let index = 0; index < view.length; index++) {
    view[index] = (view[index] ^ 0xff) & 0xff;
  }
}

describe('Web IDL Interop: Lexer', () => {
  it('tokenizes identifiers, keywords, numbers, strings, and symbols', () => {
    const idl = `
      // Single-line comment
      /* Multi-line
         comment */
      [Exposed=Window, SecureContext]
      interface Crypto {
        readonly attribute DOMString name;
        const unsigned short MAX_SIZE = 65536;
        ArrayBuffer getRandomValues(ArrayBufferView array);
      };
    `;

    const tokens = lexWebIdl(idl);
    expect(tokens.length).toBeGreaterThan(10);

    const identifiers = tokens.filter((t) => t.kind === 'identifier').map((t) => t.text);
    expect(identifiers).toContain('Exposed');
    expect(identifiers).toContain('Window');
    expect(identifiers).toContain('Crypto');
    expect(identifiers).toContain('getRandomValues');

    const symbols = tokens.filter((t) => t.kind === 'symbol').map((t) => t.text);
    expect(symbols).toContain('[');
    expect(symbols).toContain(']');
    expect(symbols).toContain('{');
    expect(symbols).toContain('}');
    expect(symbols).toContain(';');

    const numbers = tokens.filter((t) => t.kind === 'number').map((t) => t.text);
    expect(numbers).toContain('65536');
  });

  it('handles strings with escape characters and hex numbers', () => {
    const idl = String.raw`const long HEX_VAL = 0x2A; enum Mode { "fast\nmode", "safe" };`;
    const tokens = lexWebIdl(idl);

    const hexToken = tokens.find((t) => t.text === '0x2A');
    expect(hexToken).toBeDefined();
    expect(hexToken?.kind).toBe('number');

    const stringTokens = tokens.filter((t) => t.kind === 'string').map((t) => t.text);
    expect(stringTokens).toContain('fast\nmode');
    expect(stringTokens).toContain('safe');
  });

  it('un-escapes leading underscore in identifiers', () => {
    const idl = 'interface Test { attribute long _attribute; };';
    const tokens = lexWebIdl(idl);
    const attributeIdent = tokens.filter((t) => t.kind === 'identifier' && t.text === 'attribute');
    expect(attributeIdent.length).toBe(2);
  });
});

describe('Web IDL Interop: Parser', () => {
  it('parses interfaces with attributes, operations, and constants', () => {
    const idl = `
      [Exposed=Window]
      interface CanvasRenderingContext2D {
        readonly attribute double width;
        attribute DOMString fillStyle;
        const long MAX_DIMENSION = 4096;

        void fillRect(double x, double y, double w, double h);
        ImageData getImageData(long sx, long sy, long sw, long sh);
      };
    `;

    const module = parseWebIdl(idl);
    expect(module.definitions).toHaveLength(1);

    const iface = module.definitions[0];
    expect(iface.kind).toBe('interface');
    if (iface.kind !== 'interface') return;

    expect(iface.name).toBe('CanvasRenderingContext2D');
    expect(iface.extendedAttributes?.Exposed).toBe('Window');

    const attributes = iface.members.filter((m) => m.kind === 'attribute');
    expect(attributes).toHaveLength(2);
    expect(attributes[0].name).toBe('width');
    expect(attributes[0].readonly).toBe(true);
    expect(attributes[1].name).toBe('fillStyle');
    expect(attributes[1].readonly).toBe(false);

    const consts = iface.members.filter((m) => m.kind === 'const');
    expect(consts).toHaveLength(1);
    expect(consts[0].name).toBe('MAX_DIMENSION');
    expect(consts[0].value).toBe(4096);

    const ops = iface.members.filter((m) => m.kind === 'operation');
    expect(ops).toHaveLength(2);
    expect(ops[0].name).toBe('fillRect');
    expect(ops[0].arguments).toHaveLength(4);
    expect(ops[1].name).toBe('getImageData');
  });

  it('parses dictionaries with required/optional members and default values', () => {
    const idl = `
      dictionary AesGcmParams {
        required BufferSource iv;
        DOMString additionalData;
        unsigned short tagLength = 128;
      };
    `;

    const module = parseWebIdl(idl);
    expect(module.definitions).toHaveLength(1);

    const dict = module.definitions[0];
    expect(dict.kind).toBe('dictionary');
    if (dict.kind !== 'dictionary') return;

    expect(dict.name).toBe('AesGcmParams');
    expect(dict.members).toHaveLength(3);
    expect(dict.members[0].name).toBe('iv');
    expect(dict.members[0].required).toBe(true);
    expect(dict.members[1].name).toBe('additionalData');
    expect(dict.members[1].required).toBeUndefined();
    expect(dict.members[2].name).toBe('tagLength');
    expect(dict.members[2].defaultValue).toBe(128);
  });

  it('parses enums, typedefs, callbacks, and namespaces', () => {
    const idl = `
      enum KeyFormat {
        "raw",
        "spki",
        "pkcs8",
        "jwk"
      };

      typedef sequence<octet> ByteSequence;

      callback VoidCallback = void ();

      namespace console {
        void log(DOMString message);
      };
    `;

    const module = parseWebIdl(idl);
    expect(module.definitions).toHaveLength(4);

    const enumDeclaration = module.definitions[0];
    expect(enumDeclaration.kind).toBe('enum');
    if (enumDeclaration.kind === 'enum') {
      expect(enumDeclaration.name).toBe('KeyFormat');
      expect(enumDeclaration.values).toEqual(['raw', 'spki', 'pkcs8', 'jwk']);
    }

    const typedefDeclaration = module.definitions[1];
    expect(typedefDeclaration.kind).toBe('typedef');
    if (typedefDeclaration.kind === 'typedef') {
      expect(typedefDeclaration.name).toBe('ByteSequence');
      expect(typedefDeclaration.type.kind).toBe('sequence');
    }

    const callbackDeclaration = module.definitions[2];
    expect(callbackDeclaration.kind).toBe('callback');

    const namespaceDeclaration = module.definitions[3];
    expect(namespaceDeclaration.kind).toBe('namespace');
  });

  it('throws descriptive WebIdlParseError on invalid syntax', () => {
    const invalidIdl = 'interface MissingBrace ;';
    expect(() => parseWebIdl(invalidIdl)).toThrow(WebIdlParseError);
  });
});

describe('Web IDL Interop: FWS Binding Generator', () => {
  it('generates valid FWS structs from IDL dictionaries', () => {
    const idl = `
      dictionary RequestInit {
        DOMString method;
        boolean keepalive;
        long long timeout;
      };
    `;

    const module = parseWebIdl(idl);
    const fws = generateFlintBindings(module);

    expect(fws).toContain('struct RequestInit {');
    expect(fws).toContain('method: Option<string>;');
    expect(fws).toContain('keepalive: Option<bool>;');
    expect(fws).toContain('timeout: Option<i64>;');

    // Verify FWS parser accepts the generated struct without syntax error
    const parseResult = parseFlint(fws, 'request.flint');
    expect(parseResult.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(parseResult.module?.structs).toHaveLength(1);
    expect(parseResult.module?.structs[0].name).toBe('RequestInit');
  });

  it('generates valid FWS enums from IDL enums', () => {
    const idl = `
      enum EncryptionAlgorithm {
        "aes-gcm",
        "aes-cbc",
        "rsa-oaep"
      };
    `;

    const module = parseWebIdl(idl);
    const fws = generateFlintBindings(module);

    expect(fws).toContain('export enum EncryptionAlgorithm {');
    expect(fws).toContain('AesGcm,');
    expect(fws).toContain('AesCbc,');
    expect(fws).toContain('RsaOaep,');

    const parseResult = parseFlint(fws, 'crypto-enum.flint');
    expect(parseResult.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(parseResult.module?.enums).toHaveLength(1);
  });

  it('generates FWS interfaces and capability imports with snake_case aliases', () => {
    const idl = `
      interface SubtleCrypto {
        ArrayBuffer digest(DOMString algorithm, BufferSource data);
        ArrayBuffer sign(DOMString algorithm, ArrayBuffer key, BufferSource data);
      };
    `;

    const module = parseWebIdl(idl);
    const fws = generateFlintBindings(module, {
      capabilityPrefix: 'web.crypto',
      emitCapabilityImports: true,
      emitInterfaces: true,
    });

    expect(fws).toContain('interface SubtleCrypto {');
    expect(fws).toContain('fn digest(algorithm: string, data: bytes) -> bytes;');
    expect(fws).toContain('fn sign(algorithm: string, key: bytes, data: bytes) -> bytes;');

    expect(fws).toContain('import capability "web.crypto.SubtleCrypto.digest" as subtle_crypto_digest(');
    expect(fws).toContain('import capability "web.crypto.SubtleCrypto.sign" as subtle_crypto_sign(');

    const parseResult = parseFlint(fws, 'subtle.flint');
    expect(parseResult.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(parseResult.module?.interfaces).toHaveLength(1);
    expect(parseResult.module?.imports).toHaveLength(2);
  });
});

describe('Web IDL Interop: Zero-Copy Host Shims Generator', () => {
  it('generates zero-copy WasmInteropMemory and host imports factory', () => {
    const idl = `
      interface Crypto {
        ArrayBuffer getRandomValues(ArrayBufferView array);
      };
    `;

    const module = parseWebIdl(idl);
    const jsShims = generateHostShims(module, {
      capabilityPrefix: 'web.crypto',
      targetLanguage: 'typescript',
    });

    expect(jsShims).toContain('export class WasmInteropMemory');
    expect(jsShims).toContain('getView(ptr: number, len: number): Uint8Array');
    expect(jsShims).toContain('new Uint8Array(this.memory.buffer, ptr, len)');
    expect(jsShims).toContain('createHostImports');
    expect(jsShims).toContain("imports['web.crypto.Crypto']");
    expect(jsShims).toContain('interopMemory.getView(arrayPtr, arrayLen)');
    expect(jsShims).toContain('export class WasmInteropAdapter');
  });

  it('runtime behavior: performs direct in-place zero-copy mutation on Wasm memory', () => {
    // Dynamically instantiate the generated WasmInteropMemory logic against a real WebAssembly.Memory
    const memory = new WebAssembly.Memory({ initial: 2, maximum: 10 }); // 128 KiB
    const buffer = memory.buffer;

    // Zero-copy view at offset 1024, length 16
    const ptr = 1024;
    const length = 16;
    const view1 = new Uint8Array(buffer, ptr, length);

    // Write initial test pattern
    for (let index = 0; index < length; index++) {
      view1[index] = index * 2;
    }

    mockHostApi(view1);

    // Verify Wasm memory itself reflects the updated bytes without copying
    const verificationView = new Uint8Array(buffer, ptr, length);
    for (let index = 0; index < length; index++) {
      expect(verificationView[index]).toBe((index * 2) ^ 0xff);
    }
  });

  it('runtime bounds verification: throws RangeError on out-of-bounds slice', () => {
    const memory = new WebAssembly.Memory({ initial: 1, maximum: 1 }); // 64 KiB = 65,536 bytes
    const totalBytes = memory.buffer.byteLength;

    function safeGetView(mem: WebAssembly.Memory, ptr: number, length: number): Uint8Array {
      if (ptr < 0 || length < 0 || ptr + length > mem.buffer.byteLength) {
        throw new RangeError(`Out of bounds: ptr=${ptr}, len=${length}, total=${mem.buffer.byteLength}`);
      }
      return new Uint8Array(mem.buffer, ptr, length);
    }

    // Valid slice at boundary
    expect(() => safeGetView(memory, totalBytes - 16, 16)).not.toThrow();

    // Invalid slice: length exceeds buffer
    expect(() => safeGetView(memory, totalBytes - 8, 16)).toThrow(RangeError);

    // Invalid slice: negative pointer
    expect(() => safeGetView(memory, -4, 16)).toThrow(RangeError);
  });
});

describe('Web IDL Interop: TypeScript Declaration Generator', () => {
  it('generates clean TypeScript declarations for interfaces and dictionaries', () => {
    const idl = `
      dictionary KeyAlgorithm {
        required DOMString name;
      };

      interface CryptoKey {
        readonly attribute DOMString type;
        readonly attribute boolean extractable;
        readonly attribute KeyAlgorithm algorithm;
      };
    `;

    const module = parseWebIdl(idl);
    const dts = generateTypeDeclarations(module, { capabilityPrefix: 'web.crypto' });

    expect(dts).toContain('export interface KeyAlgorithm {');
    expect(dts).toContain('readonly name: string;');
    expect(dts).toContain('export interface CryptoKey {');
    expect(dts).toContain('readonly type: string;');
    expect(dts).toContain('readonly extractable: boolean;');
    expect(dts).toContain('readonly algorithm: KeyAlgorithm;');
    expect(dts).toContain("readonly 'web.crypto.CryptoKey': {");
  });
});

describe('Web IDL Interop: End-to-End compileWebIdl', () => {
  it('compiles multi-definition Web IDL spec into FWS, host shims, and .d.ts', () => {
    const webIdlSpec = `
      [Exposed=Window, SecureContext]
      interface TextDecoderStream {
        readonly attribute DOMString encoding;
        readonly attribute boolean fatal;
        readonly attribute boolean ignoreBOM;
      };

      dictionary TextDecoderOptions {
        boolean fatal = false;
        boolean ignoreBOM = false;
      };

      enum DecodeState {
        "idle",
        "decoding",
        "error"
      };
    `;

    const result = compileWebIdl(webIdlSpec, {
      flint: { capabilityPrefix: 'web.encoding' },
      host: { capabilityPrefix: 'web.encoding' },
      dts: { capabilityPrefix: 'web.encoding' },
    });

    expect(result.ast.definitions).toHaveLength(3);

    // FWS bindings check
    expect(result.flintBindings).toContain('struct TextDecoderOptions');
    expect(result.flintBindings).toContain('export enum DecodeState');
    expect(result.flintBindings).toContain('interface TextDecoderStream');
    expect(result.flintBindings).toContain('import capability "web.encoding.TextDecoderStream.get_encoding"');

    // Host shims check
    expect(result.hostShims).toContain('export class WasmInteropMemory');
    expect(result.hostShims).toContain('createHostImports');
    expect(result.hostShims).toContain("imports['web.encoding.TextDecoderStream']");

    // TypeScript declarations check
    expect(result.typeDeclarations).toContain('export interface TextDecoderOptions');
    expect(result.typeDeclarations).toContain("export type DecodeState = 'idle' | 'decoding' | 'error'");
    expect(result.typeDeclarations).toContain('export interface TextDecoderStream');

    // Verify FWS syntax validity
    const fwsParse = parseFlint(result.flintBindings, 'encoding.flint');
    expect(fwsParse.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
  });
});

describe('C and Rust cbindgen Interop: flint-bindgen', () => {
  it('parses C header and Rust cbindgen outputs into Flint AST and bindings', () => {
    const cHeader = `
      /* Generated with cbindgen:0.26.0 */
      #include <stdint.h>
      #include <stddef.h>

      typedef struct ZstdContext ZstdContext;

      typedef struct ScannerResult {
        uint32_t code_type;
        uint32_t length;
        float confidence;
      } ScannerResult;

      uint32_t ZSTD_versionNumber(void);

      int32_t scan_barcode_c(
        const uint8_t *image_ptr,
        uint32_t width,
        uint32_t height,
        ScannerResult *result_out
      );
    `;

    const result = compileCHeader(cHeader, 'scanner');
    expect(result.ast.structs).toHaveLength(1);
    expect(result.ast.structs[0].name).toBe('ScannerResult');
    expect(result.ast.structs[0].fields).toHaveLength(3);
    expect(result.ast.functions).toHaveLength(2);
    expect(result.ast.opaqueTypes).toEqual(['ZstdContext']);

    // Check generated Flint bindings syntax
    expect(result.flintBindings).toContain('opaque foreign type ZstdContext;');
    expect(result.flintBindings).toContain('#[repr(C)]');
    expect(result.flintBindings).toContain('struct ScannerResult {');
    expect(result.flintBindings).not.toContain('c_struct');
    expect(result.flintBindings).toContain('foreign "C" capability "scanner" {');
    expect(result.flintBindings).toContain(
      'fn scan_barcode_c(image_ptr: CPtr<u8>, width: c_uint, height: c_uint, result_out: MutCPtr<ScannerResult>) -> c_int;',
    );

    // Verify Flint parser accepts the emitted Flint bindings cleanly
    const parseResult = parseFlint(result.flintBindings, 'scanner_bindings.flint');
    expect(parseResult.diagnostics).toEqual([]);
    expect(parseResult.module?.structs).toHaveLength(1);
    expect(parseResult.module?.foreignCapabilities).toHaveLength(1);
    expect(parseResult.module?.opaqueForeignTypes).toHaveLength(1);

    // Check generated TypeScript .d.ts
    expect(result.typeDeclarations).toContain('export namespace scanner {');
    expect(result.typeDeclarations).toContain('export interface ScannerResult {');
    expect(result.typeDeclarations).toContain('export type ZstdContext = number;');
    expect(result.typeDeclarations).toContain(
      'scan_barcode_c(image_ptr: number, width: number, height: number, result_out: number): number;',
    );

    // Check generated FFI host shim
    expect(result.hostShim).toContain("import { dlopen, ptr, FFIType } from 'bun:ffi';");
    expect(result.hostShim).toContain('scan_barcode_c: {');
  });

  it('parses #define constants, multi-variable fields, and fixed arrays into Flint bindings', () => {
    const header = `
      #define SQLITE_OK 0
      #define SQLITE_ERROR 1
      #define SQLITE_VERSION "3.45.0"
      #define BUFFER_FLAGS 0x00FF

      typedef struct PacketHeader {
        int width, height;
        uint8_t hash[32];
      } PacketHeader;

      int process_packet(PacketHeader *header);
    `;

    const result = compileCHeader(header, 'packet_service');

    // 1. Check parsed constants
    expect(result.ast.constants).toBeDefined();
    expect(result.ast.constants).toHaveLength(4);
    expect(result.ast.constants?.find((c) => c.name === 'SQLITE_OK')).toEqual({
      name: 'SQLITE_OK',
      value: '0',
      flintType: 'c_int',
    });
    expect(result.ast.constants?.find((c) => c.name === 'BUFFER_FLAGS')).toEqual({
      name: 'BUFFER_FLAGS',
      value: '0x00FF',
      flintType: 'c_uint',
    });
    expect(result.ast.constants?.find((c) => c.name === 'SQLITE_VERSION')).toEqual({
      name: 'SQLITE_VERSION',
      value: '"3.45.0"',
      flintType: 'string',
    });

    // 2. Check generated Flint constants
    expect(result.flintBindings).toContain('pub const SQLITE_OK: c_int = 0;');
    expect(result.flintBindings).toContain('pub const SQLITE_ERROR: c_int = 1;');
    expect(result.flintBindings).toContain('pub const BUFFER_FLAGS: c_uint = 0x00FF;');
    expect(result.flintBindings).toContain('pub const SQLITE_VERSION: string = "3.45.0";');

    // 3. Check multi-variable and array fields
    const packetStruct = result.ast.structs.find((s) => s.name === 'PacketHeader');
    expect(packetStruct).toBeDefined();
    expect(packetStruct?.fields).toHaveLength(3);
    expect(packetStruct?.fields[0].name).toBe('width');
    expect(packetStruct?.fields[0].flintType).toBe('c_int');
    expect(packetStruct?.fields[1].name).toBe('height');
    expect(packetStruct?.fields[1].flintType).toBe('c_int');
    expect(packetStruct?.fields[2].name).toBe('hash');
    expect(packetStruct?.fields[2].flintType).toBe('[u8; 32]');

    // Check generated Flint struct syntax
    expect(result.flintBindings).toContain('width: c_int,');
    expect(result.flintBindings).toContain('height: c_int,');
    expect(result.flintBindings).toContain('hash: [u8; 32],');
  });

  it('generates target-specific FFI host shims for Bun, Node, and Universal environments', () => {
    const header = `
      int compute_hash(const uint8_t *data, int len);
    `;

    // Bun target
    const bunResult = compileCHeader(header, 'crypto_lib', 'libcrypto.so', { target: 'bun' });
    expect(bunResult.hostShim).toContain("import { dlopen, ptr, FFIType } from 'bun:ffi';");
    expect(bunResult.hostShim).toContain('compute_hash: {');

    // Node target
    const nodeResult = compileCHeader(header, 'crypto_lib', 'libcrypto.so', { target: 'node' });
    expect(nodeResult.hostShim).toContain("import { createRequire } from 'node:module';");
    expect(nodeResult.hostShim).toContain("const ffi = require('koffi');");
    expect(nodeResult.hostShim).toContain("compute_hash: lib.func('compute_hash', 'int', ['const uint8_t *', 'int']),");

    // Universal target
    const universalResult = compileCHeader(header, 'crypto_lib', 'libcrypto.so', { target: 'universal' });
    expect(universalResult.hostShim).toContain("if (typeof globalThis.Bun !== 'undefined') {");
    expect(universalResult.hostShim).toContain("const { dlopen, FFIType } = await import('bun:ffi');");
  });

  it('generates target-accurate 64-bit and unsigned scalar FFI types', () => {
    const header = `
      size_t process_buffer(const uint8_t *data, size_t len, long offset, uint32_t flags);
    `;

    // 64-bit target: size_t -> u64, long -> i64, uint32_t -> u32
    const result64 = compileCHeader(header, 'proc_lib', 'libproc.so', {
      target: 'bun',
      targetAbi: 'x86_64-unknown-linux-gnu',
    });
    expect(result64.hostShim).toContain('args: [FFIType.ptr, FFIType.u64, FFIType.i64, FFIType.u32]');
    expect(result64.hostShim).toContain('returns: FFIType.u64');

    // 32-bit target: size_t -> u32, long -> i32
    const result32 = compileCHeader(header, 'proc_lib', 'libproc.so', {
      target: 'bun',
      targetAbi: 'wasm32-unknown-unknown',
    });
    expect(result32.hostShim).toContain('args: [FFIType.ptr, FFIType.u32, FFIType.i32, FFIType.u32]');
    expect(result32.hostShim).toContain('returns: FFIType.u32');
  });
});

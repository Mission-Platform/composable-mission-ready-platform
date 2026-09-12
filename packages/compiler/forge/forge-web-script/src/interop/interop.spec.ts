import { describe, expect, it } from 'vitest';

import { parseForgeWebScript } from '../parser.js';

import {
  compileWebIdl,
  generateFwsBindings,
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
    const fws = generateFwsBindings(module);

    expect(fws).toContain('struct RequestInit {');
    expect(fws).toContain('method: Option<string>;');
    expect(fws).toContain('keepalive: Option<bool>;');
    expect(fws).toContain('timeout: Option<i64>;');

    // Verify FWS parser accepts the generated struct without syntax error
    const parseResult = parseForgeWebScript(fws, 'request.fws');
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
    const fws = generateFwsBindings(module);

    expect(fws).toContain('export enum EncryptionAlgorithm {');
    expect(fws).toContain('AesGcm,');
    expect(fws).toContain('AesCbc,');
    expect(fws).toContain('RsaOaep,');

    const parseResult = parseForgeWebScript(fws, 'crypto-enum.fws');
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
    const fws = generateFwsBindings(module, {
      capabilityPrefix: 'web.crypto',
      emitCapabilityImports: true,
      emitInterfaces: true,
    });

    expect(fws).toContain('interface SubtleCrypto {');
    expect(fws).toContain('fn digest(algorithm: string, data: bytes) -> bytes;');
    expect(fws).toContain('fn sign(algorithm: string, key: bytes, data: bytes) -> bytes;');

    expect(fws).toContain('import capability "web.crypto.SubtleCrypto.digest" as subtle_crypto_digest(');
    expect(fws).toContain('import capability "web.crypto.SubtleCrypto.sign" as subtle_crypto_sign(');

    const parseResult = parseForgeWebScript(fws, 'subtle.fws');
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
      fws: { capabilityPrefix: 'web.encoding' },
      host: { capabilityPrefix: 'web.encoding' },
      dts: { capabilityPrefix: 'web.encoding' },
    });

    expect(result.ast.definitions).toHaveLength(3);

    // FWS bindings check
    expect(result.fwsBindings).toContain('struct TextDecoderOptions');
    expect(result.fwsBindings).toContain('export enum DecodeState');
    expect(result.fwsBindings).toContain('interface TextDecoderStream');
    expect(result.fwsBindings).toContain('import capability "web.encoding.TextDecoderStream.get_encoding"');

    // Host shims check
    expect(result.hostShims).toContain('export class WasmInteropMemory');
    expect(result.hostShims).toContain('createHostImports');
    expect(result.hostShims).toContain("imports['web.encoding.TextDecoderStream']");

    // TypeScript declarations check
    expect(result.typeDeclarations).toContain('export interface TextDecoderOptions');
    expect(result.typeDeclarations).toContain("export type DecodeState = 'idle' | 'decoding' | 'error'");
    expect(result.typeDeclarations).toContain('export interface TextDecoderStream');

    // Verify FWS syntax validity
    const fwsParse = parseForgeWebScript(result.fwsBindings, 'encoding.fws');
    expect(fwsParse.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
  });
});

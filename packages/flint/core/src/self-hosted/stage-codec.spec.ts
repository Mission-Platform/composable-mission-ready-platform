import { describe, expect, it } from 'vitest';

import { lexFlint } from '../lexer.ts';
import { parseFlint } from '../parser.ts';

import {
  decodeFlintSelfHostedModule,
  decodeFlintSelfHostedTokens,
  encodeFlintSelfHostedModule,
  encodeFlintSelfHostedTokens,
} from './stage-codec.ts';

const sampleSource = `export fn answer(value: i32) -> i32 {
  if value < 0 {
    return -value;
  }
  return value + 1;
}`;

describe('Forge Web Script self-hosted stage codecs', () => {
  it('round-trips tokens with a binary payload (not JSON)', () => {
    const { tokens } = lexFlint(sampleSource, 'main.flint');
    const encoded = encodeFlintSelfHostedTokens(tokens);
    expect(encoded[0]).toBe(0x46); // F
    expect(encoded[1]).toBe(0x57); // W
    expect(encoded[2]).toBe(0x53); // S
    expect(encoded[3]).toBe(0x54); // T
    expect(new TextDecoder().decode(encoded).includes('JSON')).toBe(false);
    expect(new TextDecoder().decode(encoded).includes('"kind"')).toBe(false);
    expect(decodeFlintSelfHostedTokens(encoded)).toEqual(tokens);
    expect(encodeFlintSelfHostedTokens(decodeFlintSelfHostedTokens(encoded))).toEqual(encoded);
  });

  it('round-trips a parsed module with deterministic binary framing', () => {
    const parsed = parseFlint(sampleSource, 'main.flint');
    expect(parsed.module).toBeDefined();
    const encoded = encodeFlintSelfHostedModule(parsed.module!);
    expect(encoded[0]).toBe(0x46);
    expect(encoded[1]).toBe(0x57);
    expect(encoded[2]).toBe(0x53);
    expect(encoded[3]).toBe(0x4d); // M
    expect(new TextDecoder().decode(encoded).includes('"functions"')).toBe(false);
    const decoded = decodeFlintSelfHostedModule(encoded);
    expect(decoded).toEqual(parsed.module);
    expect(encodeFlintSelfHostedModule(decoded)).toEqual(encoded);
  });

  it('rejects wrong token magic and truncated payloads', () => {
    const encoded = encodeFlintSelfHostedTokens(lexFlint('export fn f() -> i32 { return 1; }', 't.flint').tokens);
    const wrongMagic = new Uint8Array(encoded);
    wrongMagic[3] = 0x00;
    expect(() => decodeFlintSelfHostedTokens(wrongMagic)).toThrow('token payload magic');
    expect(() => decodeFlintSelfHostedTokens(encoded.slice(0, 8))).toThrow('truncated');
  });

  it('rejects wrong module magic and trailing bytes', () => {
    const module = parseFlint('export fn f() -> i32 { return 1; }', 't.flint').module!;
    const encoded = encodeFlintSelfHostedModule(module);
    const wrongMagic = new Uint8Array(encoded);
    wrongMagic[3] = 0x00;
    expect(() => decodeFlintSelfHostedModule(wrongMagic)).toThrow('module payload magic');
    const trailing = new Uint8Array(encoded.length + 1);
    trailing.set(encoded);
    expect(() => decodeFlintSelfHostedModule(trailing)).toThrow('trailing bytes');
  });

  it('rejects unordered token spans', () => {
    const tokens = lexFlint('export fn f() -> i32 { return 1; }', 't.flint').tokens;
    const disordered = [tokens[2]!, tokens[0]!, tokens[1]!, ...tokens.slice(3)];
    expect(() => encodeFlintSelfHostedTokens(disordered)).toThrow('token spans are not ordered');
  });

  it('rejects invalid UTF-8 in a token payload string field', () => {
    const tokens = lexFlint('export fn f() -> i32 { return 1; }', 't.flint').tokens;
    const encoded = encodeFlintSelfHostedTokens(tokens);
    // Corrupt a high byte inside the first string field after magic/version/count/kind.
    const corrupted = new Uint8Array(encoded);
    // Find a non-ascii-safe location past the header; force 0xff which is invalid in UTF-8 sequences alone.
    for (let index = 10; index < corrupted.length; index += 1) {
      if (corrupted[index] === 0x65 /* e from export-ish text */) {
        corrupted[index] = 0xff;
        break;
      }
    }
    expect(() => decodeFlintSelfHostedTokens(corrupted)).toThrow(/UTF-8|truncated|malformed|Invalid/i);
  });

  it('rejects empty module names', () => {
    const module = parseFlint('export fn f() -> i32 { return 1; }', 't.flint').module!;
    const encoded = encodeFlintSelfHostedModule({ ...module, name: '' });
    expect(() => decodeFlintSelfHostedModule(encoded)).toThrow('module name must not be empty');
  });
});

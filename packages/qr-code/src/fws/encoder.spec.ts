import { describe, expect, it } from 'vitest';

import { load, loadSync, manifest } from './qr-encoder.fws';

function unpack(
  encoded: { version: number; size: number; modules: number },
  memory: WebAssembly.Memory,
): { version: number; size: number; modules: string } {
  const words = Math.ceil((encoded.size * encoded.size) / 32);
  const view = new DataView(memory.buffer, encoded.modules, words * 4);
  let modules = '';
  for (let index = 0; index < encoded.size * encoded.size; index += 1)
    modules += ((view.getUint32(Math.floor(index / 32) * 4, true) >>> (index % 32)) & 1).toString();
  return { version: encoded.version, size: encoded.size, modules };
}

describe('QR encoder FWS graph', () => {
  it('publishes a manifest and a stable packed ABI', () => {
    const encoder = loadSync();
    expect(manifest).toBeDefined();
    expect(encoder.__test_tables(1)).toBe('1,10');
    expect(encoder.__test_interleave(1, '000'.repeat(16))).toHaveLength(78);
    const packed = unpack(encoder.encode_qr(1, 'HELLO WORLD'), encoder.memory);
    expect(packed.version).toBe(1);
    expect(packed.size).toBe(21);
    expect(packed.modules).toMatch(/^[01]+$/);
    expect(packed.modules).toHaveLength(packed.size * packed.size);
  });

  it('handles UTF-8 and deterministic output through both loaders', async () => {
    const syncEncoder = loadSync();
    const sync = syncEncoder.encode_qr(2, 'héllo — wörld 🚀');
    const asyncEncoder = await load();
    const asyncResult = asyncEncoder.encode_qr(2, 'héllo — wörld 🚀');
    expect(asyncResult.version).toBe(sync.version);
    expect(asyncResult.size).toBe(sync.size);
    expect(unpack(asyncResult, asyncEncoder.memory).modules).toBe(unpack(sync, syncEncoder.memory).modules);
    const empty = loadSync().encode_qr(2, '');
    expect(empty.version).toBe(1);
    expect(empty.size).toBe(21);
  });

  it('exposes Reed–Solomon field behavior and reports overflow', () => {
    const encoder = loadSync();
    expect(encoder.__test_gf256_mul(2, 2)).toBe(4);
    expect(encoder.__test_gf256_mul(0x80, 2)).toBe(0x1d);
    expect(encoder.__test_rs_remainder('032065', 7)).toHaveLength(21);
    expect(encoder.encode_qr(0, 'x'.repeat(8000))).toEqual({ version: 0, size: 0, modules: [] });
  });
});

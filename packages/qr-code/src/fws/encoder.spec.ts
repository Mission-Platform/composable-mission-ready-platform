import { describe, expect, it } from 'vitest';

import { load, loadSync, manifest } from './qr-encoder.fws';

function unpack(packed: string): { version: number; size: number; modules: string } {
  const [version, size, modules] = packed.split(',');
  return { version: Number(version), size: Number(size), modules };
}

describe('QR encoder FWS graph', () => {
  it('publishes a manifest and a stable packed ABI', () => {
    const encoder = loadSync();
    expect(manifest).toBeDefined();
    expect(encoder.__test_tables(1)).toBe('1,10');
    expect(encoder.__test_interleave(1, '000'.repeat(16))).toHaveLength(78);
    const packed = unpack(encoder.encode_qr(1, 'HELLO WORLD'));
    expect(packed.version).toBe(1);
    expect(packed.size).toBe(21);
    expect(packed.modules).toMatch(/^[01]+$/);
    expect(packed.modules).toHaveLength(packed.size * packed.size);
  });

  it('handles UTF-8 and deterministic output through both loaders', async () => {
    const sync = loadSync().encode_qr(2, 'héllo — wörld 🚀');
    const asyncEncoder = await load();
    expect(asyncEncoder.encode_qr(2, 'héllo — wörld 🚀')).toBe(sync);
    expect(loadSync().encode_qr(2, '')).toMatch(/^1,21,[01]+$/);
  });

  it('exposes Reed–Solomon field behavior and reports overflow', () => {
    const encoder = loadSync();
    expect(encoder.__test_gf256_mul(2, 2)).toBe(4);
    expect(encoder.__test_gf256_mul(0x80, 2)).toBe(0x1d);
    expect(encoder.__test_rs_remainder('032065', 7)).toHaveLength(21);
    expect(encoder.encode_qr(0, 'x'.repeat(8000))).toBe('');
  });
});

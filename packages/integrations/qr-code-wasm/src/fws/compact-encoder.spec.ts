import { describe, expect, it } from 'vitest';

import { load, loadSync, manifest } from './qr-compact-encoder.fws';

function unpack(packed: string): { width: number; height: number; modules: string } {
  const [width, height, modules] = packed.split(',');
  return { width: Number(width), height: Number(height), modules };
}

describe('compact QR encoder FWS graph', () => {
  it('publishes the compact ABI and Micro QR geometry', () => {
    const encoder = loadSync();
    expect(manifest).toBeDefined();
    const packed = unpack(encoder.encode_micro_qr(0, '01234'));
    expect(packed.width).toBe(11);
    expect(packed.height).toBe(11);
    expect(packed.modules).toHaveLength(121);
    expect(packed.modules).toMatch(/^[01]+$/);
    expect(packed.modules[0]).toBe('1');
    expect(packed.modules[12]).toBe('0');
    expect(packed.modules[36]).toBe('1');
  });

  it('emits a stable Micro QR content vector for M1 numeric payloads', () => {
    const packed = unpack(loadSync().encode_micro_qr(0, '1'));
    expect(packed).toEqual({
      width: 11,
      height: 11,
      modules:
        '1111111010110000010100101110100111011101010010111010011100000100001111111001100000000101110001000110101111110111111111011',
    });
  });

  it('selects supported Micro levels and rejects H/overflow', () => {
    const encoder = loadSync();
    expect(unpack(encoder.encode_micro_qr(1, 'HELLO123')).width).toBe(17);
    expect(encoder.encode_micro_qr(3, '1')).toBe('');
    expect(encoder.encode_micro_qr(0, '1'.repeat(60))).toBe('');
  });

  it('keeps Micro output deterministic across sync and async loaders', async () => {
    const text = 'héllo 🚀';
    const sync = loadSync().encode_micro_qr(1, text);
    const asyncEncoder = await load();
    expect(asyncEncoder.encode_micro_qr(1, text)).toBe(sync);
  });

  it('selects growing rectangular geometry and handles rMQR overflow', async () => {
    const encoder = loadSync();
    const small = unpack(encoder.encode_rmqr(1, '123456'));
    // Long byte payload forces the multi-block Reed–Solomon/interleave path (2 blocks for R59x17).
    const large = unpack(encoder.encode_rmqr(1, 'https://example.com/a/reasonably/long/path?with=query'));
    expect(small.width).toBe(27);
    expect(small.height).toBe(11);
    expect(small.width).toBeGreaterThan(small.height);
    expect(large.width * large.height).toBeGreaterThan(small.width * small.height);
    expect(encoder.encode_rmqr(3, 'x'.repeat(400))).toBe('');
    const asyncEncoder = await load();
    expect(asyncEncoder.encode_rmqr(1, 'rMQR 123')).toBe(encoder.encode_rmqr(1, 'rMQR 123'));
  });

  it('encodes a known rMQR content vector for numeric payload', () => {
    const encoder = loadSync();
    // Rust oracle: RUSTFLAGS="-L /opt/homebrew/lib" cargo run -q -p mission-platform-qr-code-encode --example dump -- rmqr 1 123456
    expect(encoder.encode_rmqr(1, '123456')).toBe(
      '27,11,111111101010101010101010111100000101110001001110000101101110100111111001000000011101110100010001000001000100101110100000010011111110011100000100110000100001110110111111101101010110100111111000000001101100011101010001110010111010010000110110101101000110001101001001010001111010101010101010101011111',
    );
  });

  it('encodes a known multi-block rMQR content vector for a long byte payload', () => {
    const encoder = loadSync();
    // Rust oracle: RUSTFLAGS="-L /opt/homebrew/lib" cargo run -q -p mission-platform-qr-code-encode --example dump -- rmqr 1 'https://example.com/a/reasonably/long/path?with=query'
    // This payload requires 2 Reed–Solomon blocks (R59x17) and previously trapped with
    // `RuntimeError: unreachable` due to bump-allocator exhaustion in the packed-bit emitter.
    const packed = unpack(encoder.encode_rmqr(1, 'https://example.com/a/reasonably/long/path?with=query'));
    expect(packed.width).toBe(59);
    expect(packed.height).toBe(17);
    expect(encoder.encode_rmqr(1, 'https://example.com/a/reasonably/long/path?with=query')).toBe(
      '59,17,1111111010101010101110101010101010101011101010101010101011110000010011010101010110110110100000000101110010111001101001101110100000000000111110011011010100011110100000000011001111011101001101000100010100000000110111100100101101101100010010111010101010111101010000000000001010111011001010010100011100000100101101010001111101101110001001000011101011111111101111111011001101011101101110110000001011011010001101110011100000000110011111010101111010001010110100011110001010100110110010010001101011111011011001000000101110110100000100000010111110110000101111010100010101001010000100100011101111001010010011011001110011110001101000010011011110000011011001101001011010100100010101111001000010001100000011100110111111101110000101111010000111011110010100111111100010101010101111101010100100010011110010011110101010110101011000111000010001110010100000101110111001011010110000001111100000111000101011000011000000110011011111000000100101110110111000010111000111101010101010101011101010101010101010111010101010101011111',
    );
  });
});

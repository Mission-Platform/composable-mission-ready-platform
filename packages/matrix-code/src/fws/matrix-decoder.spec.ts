import { describe, expect, it } from 'vitest';

import { load as loadEncoder, loadSync as loadEncoderSync } from './matrix-encoder.fws';
import { load, loadSync, manifest } from './matrix-decoder.fws';

function unpackPayload(payload: string): string | null {
  if (payload.length === 0 || payload.length % 3 !== 0) return null;
  const bytes = new Uint8Array(payload.length / 3);
  for (let index = 0; index < bytes.length; index += 1) {
    const value = Number.parseInt(payload.slice(index * 3, index * 3 + 3), 10);
    if (!Number.isInteger(value) || value < 0 || value > 255) return null;
    bytes[index] = value;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function modulesFromPacked(packed: string): { width: number; height: number; modules: number[] } {
  const parts = packed.split(',');
  const width = Number.parseInt(parts[0], 10);
  const height = Number.parseInt(parts[1], 10);
  const modules = Array.from(parts[2], bit => (bit === '1' ? 1 : 0));
  return { width, height, modules };
}

async function roundTrip(
  loadEnc: typeof loadEncoder | typeof loadEncoderSync,
  loadDec: typeof load | typeof loadSync,
  symbology: 0 | 1 | 2 | 3,
  text: string,
): Promise<string | null> {
  const encoder = await Promise.resolve(loadEnc());
  const packed = encoder.encode_matrix(symbology, text);
  expect(packed.length).toBeGreaterThan(0);
  const { width, height, modules } = modulesFromPacked(packed);
  const decoder = await Promise.resolve(loadDec());
  return unpackPayload(decoder.decode_matrix(symbology, width, height, modules, new Array(width * height).fill(0)));
}

describe('matrix-decoder.fws artifact', () => {
  it('exposes the numeric-array decode ABI and static linked graph metadata', async () => {
    const api = loadSync();
    expect(typeof api.decode_matrix).toBe('function');
    expect(manifest.linkMode).toBe('static');
    const linkedExportNames = manifest.linkedExports.map(({ name }) => name);
    // Names below only exist in bounded modules deep in the decoder graph
    // (core/galois/rs, the datamatrix placement-map dispatcher, and aztec),
    // so their presence proves the full split module graph linked statically.
    expect(linkedExportNames).toEqual(
      expect.arrayContaining([
        'decode_matrix',
        'decode_datamatrix',
        'decode_aztec',
        'rs_correct',
        'field_exp_table',
        'mapping_map',
        'square_map_a',
        'square_map_b',
        'rect_map',
      ]),
    );
    const asyncApi = await load();
    expect(typeof asyncApi.decode_matrix).toBe('function');
  });

  it('round-trips square Data Matrix through sync and async loaders', async () => {
    await expect(roundTrip(loadEncoderSync, loadSync, 0, 'Hello')).resolves.toBe('Hello');
    await expect(roundTrip(loadEncoder, load, 0, 'A')).resolves.toBe('A');
  });

  it('round-trips GS1 Data Matrix and drops FNC1 from the payload stream', async () => {
    await expect(roundTrip(loadEncoderSync, loadSync, 1, '0101234567890128')).resolves.toBe('0101234567890128');
  });

  it('round-trips rectangular Data Matrix symbols', async () => {
    await expect(roundTrip(loadEncoderSync, loadSync, 2, 'RECT')).resolves.toBe('RECT');
  });

  it('round-trips compact Aztec symbols', async () => {
    await expect(roundTrip(loadEncoderSync, loadSync, 3, 'Aztec')).resolves.toBe('Aztec');
    await expect(roundTrip(loadEncoder, load, 3, 'Hello')).resolves.toBe('Hello');
  });

  it('returns empty output for unsupported dimensions', () => {
    const api = loadSync();
    expect(api.decode_matrix(0, 3, 3, [1, 0, 1, 0, 1, 0, 1, 0, 1], new Array(9).fill(0))).toBe('');
    expect(api.decode_matrix(3, 10, 10, new Array(100).fill(0), new Array(100).fill(0))).toBe('');
  });
});

// QR Code decoder façade backed by the package-local Forge Web Script graph.
//
// The decoder recovers the format info, unmasks the data region, reads the
// codewords and Reed-Solomon-corrects up to the level's error capacity, so it
// tolerates a damaged matrix. The graph is loaded lazily on first use.

import {
  load as loadQrDecoder,
  loadSync as loadQrDecoderSync,
  type ForgeQrDecoderImports,
} from '../fws/qr-decoder.fws';

import type { QrMatrix } from '../types';

const textDecoder = new TextDecoder('utf-8', { fatal: true });

/** Adapt the FWS decoder's packed UTF-8 byte string to a JS string result. */
function decodeUtf8(value: string): string {
  if (value.length === 0 || value.length % 3 !== 0) return '';
  const bytes = new Uint8Array(value.length / 3);
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = Number.parseInt(value.slice(index * 3, index * 3 + 3), 10);
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) return '';
    bytes[index] = byte;
  }
  try {
    return `1${textDecoder.decode(bytes)}`;
  } catch {
    return '';
  }
}

const decoderImports: ForgeQrDecoderImports = {
  'qr.decode.utf8': { decode_utf8: decodeUtf8 },
};

/** Pack a {@link QrMatrix} into the decoder's `[size, ...modules]` buffer. */
function packMatrix(matrix: QrMatrix): Uint8Array {
  const { size, modules } = matrix;
  const packed = new Uint8Array(1 + size * size);
  packed[0] = size;
  let offset = 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      packed[offset++] = modules[y][x] ? 1 : 0;
    }
  }
  return packed;
}

/**
 * Decode a {@link QrMatrix} back into its original text, loading the package-
 * local FWS decoder synchronously on first use.
 *
 * The decoder recovers the format info, unmasks the data region, reads the
 * codewords, and Reed-Solomon-corrects up to the level's error capacity, so it
 * tolerates a damaged matrix. Only the byte-mode segment produced by `encodeQr`
 * is supported.
 *
 * @returns the decoded text, or `null` when the matrix cannot be decoded.
 */
export function decodeQr(matrix: QrMatrix): string | null {
  const result = loadQrDecoderSync(decoderImports).decode_qr(packMatrix(matrix));
  return result.startsWith('1') ? result.slice(1) : null;
}

/**
 * Decode a {@link QrMatrix} back into its original text, loading the package-
 * local FWS decoder asynchronously on first use.
 *
 * @returns the decoded text, or `null` when the matrix cannot be decoded.
 */
export async function decodeQrAsync(matrix: QrMatrix): Promise<string | null> {
  const decoder = await loadQrDecoder(decoderImports);
  const result = decoder.decode_qr(packMatrix(matrix));
  return result.startsWith('1') ? result.slice(1) : null;
}

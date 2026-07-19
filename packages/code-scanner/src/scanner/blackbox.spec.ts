// End-to-end smoke suite proving the JS façade reads the newly-wired symbologies
// (PDF417, GS1 DataBar, MaxiCode) through *both* public entry points — the
// synchronous file-upload path (`scanImageData`) and the asynchronous streaming
// path (`scanImageDataAsync`).
//
// The already-supported families (QR, Data Matrix, Aztec, 1D barcodes) are
// exercised exhaustively in `index.spec.ts` via the JS encoders; those formats
// have no JS encoder for the corpus symbologies added in the Rust pipeline, so
// here we feed a representative vendored ZXING corpus PNG for each new family
// straight through the façade. Decoding matches the native corpus harness
// (`crates/code-scan/tests/blackbox.rs`): the expected value is the sibling
// `.txt` sidecar with only its trailing CR/LF trimmed, and control characters in
// the payload (GS/RS/FS) are preserved for an exact comparison.
import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ImageLike, ScanFormat } from '../types';
import { scanImageData, scanImageDataAsync } from './index';

/** Absolute path of a vendored corpus image, relative to the package root. */
const CORPUS = resolve(process.cwd(), '../../crates/code-scan/tests/fixtures/zxing-blackbox');

/**
 * Undo one PNG scanline filter (per the PNG spec, §9.2) in place. `line` is the
 * current unfiltered-so-far scanline, `prev` the previous (already unfiltered)
 * scanline, and `bpp` the number of bytes per pixel.
 */
function unfilter(type: number, line: Uint8Array, prev: Uint8Array, bpp: number): void {
  for (let i = 0; i < line.length; i += 1) {
    const a = i >= bpp ? line[i - bpp] : 0;
    const b = prev[i];
    const c = i >= bpp ? prev[i - bpp] : 0;
    switch (type) {
      case 0:
        break;
      case 1:
        line[i] = (line[i] + a) & 0xff;
        break;
      case 2:
        line[i] = (line[i] + b) & 0xff;
        break;
      case 3:
        line[i] = (line[i] + ((a + b) >> 1)) & 0xff;
        break;
      case 4: {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        line[i] = (line[i] + pr) & 0xff;
        break;
      }
      default:
        throw new Error(`unsupported PNG filter ${type}`);
    }
  }
}

/**
 * Decode an 8-bit, non-interlaced PNG (greyscale, RGB or RGBA — the encodings
 * the chosen corpus fixtures use) into an {@link ImageLike} RGBA buffer. A
 * deliberately tiny, dependency-free reader for tests only; the production
 * pipeline never decodes PNGs.
 */
function loadPng(path: string): ImageLike {
  const bytes = readFileSync(path);
  let offset = 8; // skip the PNG signature
  let width = 0;
  let height = 0;
  let colorType = 0;
  let bitDepth = 0;
  const idat: Buffer[] = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const start = offset + 8;
    if (type === 'IHDR') {
      width = bytes.readUInt32BE(start);
      height = bytes.readUInt32BE(start + 4);
      bitDepth = bytes[start + 8];
      colorType = bytes[start + 9];
    } else if (type === 'IDAT') {
      idat.push(bytes.subarray(start, start + length));
    } else if (type === 'IEND') {
      break;
    }
    offset = start + length + 4; // + CRC
  }
  if (bitDepth !== 8) {
    throw new Error(`unsupported PNG bit depth ${bitDepth} in ${path}`);
  }
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 6 ? 4 : 0;
  if (channels === 0) {
    throw new Error(`unsupported PNG colour type ${colorType} in ${path}`);
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rgba = new Uint8ClampedArray(width * height * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = Uint8Array.prototype.slice.call(raw, y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    unfilter(filter, line, prev, channels);
    for (let x = 0; x < width; x += 1) {
      const src = x * channels;
      const dst = (y * width + x) * 4;
      const r = line[src];
      const g = channels >= 3 ? line[src + 1] : r;
      const b = channels >= 3 ? line[src + 2] : r;
      const a = channels === 4 ? line[src + 3] : 255;
      rgba[dst] = r;
      rgba[dst + 1] = g;
      rgba[dst + 2] = b;
      rgba[dst + 3] = a;
    }
    prev = line;
  }
  return { width, height, data: rgba };
}

/** Expected value for a corpus image: its `.txt` sidecar, trailing CR/LF trimmed. */
function expectedValue(pngRelative: string): string {
  const txt = readFileSync(resolve(CORPUS, pngRelative.replace(/\.png$/, '.txt')), 'utf8');
  return txt.replace(/[\r\n]+$/, '');
}

/** One representative corpus image per newly-wired symbology family. */
const CASES: ReadonlyArray<{ family: string; image: string; format: ScanFormat }> = [
  { family: 'PDF417', image: 'pdf417-3/01.png', format: 'pdf417' },
  { family: 'GS1 DataBar (RSS-14)', image: 'rss14-1/1.png', format: 'databar' },
  { family: 'MaxiCode', image: 'maxicode-1/1.png', format: 'maxicode' },
  // Step 7: real camera photos the single-unit grid decoder locates but cannot
  // read; the ZXing-style per-digit run-width reader now decodes them through the
  // façade. UPC-E in particular had no decode path at all before. UPC-A is
  // reported as its 12-digit form (leading-zero EAN-13 disambiguation).
  { family: 'UPC-E (camera)', image: 'upce-1/4.png', format: 'barcode' },
  { family: 'EAN-13 (camera)', image: 'ean13-3/01.png', format: 'barcode' },
];

describe('code-scanner façade — new symbologies (corpus smoke)', () => {
  for (const { family, image, format } of CASES) {
    const expected = expectedValue(image);

    it(`decodes ${family} through the upload path (scanImageData)`, () => {
      const result = scanImageData(loadPng(resolve(CORPUS, image)));
      expect(result).not.toBeNull();
      expect(result?.format).toBe(format);
      expect(result?.value).toBe(expected);
    });

    it(`decodes ${family} through the streaming path (scanImageDataAsync)`, async () => {
      const result = await scanImageDataAsync(loadPng(resolve(CORPUS, image)));
      expect(result).not.toBeNull();
      expect(result?.format).toBe(format);
      expect(result?.value).toBe(expected);
    });
  }
});

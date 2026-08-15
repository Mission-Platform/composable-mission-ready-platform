import { describe, expect, it, vi } from 'vitest';

import { type Barcode, type BarcodeSymbology, encodeBarcode, encodeBarcodeAsync } from '.';

// The wasm wrapper is imported in `src/test-setup.ts`; initialization is lazy
// and occurs on the first operation.

/** Every module bit must be 0 or 1, and the reported width must match. */
function assertShape(barcode: Barcode, symbology: BarcodeSymbology): void {
  expect(barcode.symbology).toBe(symbology);
  expect(barcode.width).toBe(barcode.modules.length);
  expect(barcode.modules.every((bit) => bit === 0 || bit === 1)).toBe(true);
}

describe('encodeBarcode', () => {
  it('encodes EAN-13 to a 95-module symbol and appends the check digit', () => {
    const withCheck = encodeBarcode('ean13', '5901234123457');
    const withoutCheck = encodeBarcode('ean13', '590123412345');
    assertShape(withCheck, 'ean13');
    expect(withCheck.width).toBe(95);
    expect(withCheck.modules).toEqual(withoutCheck.modules);
    // Starts and ends with the guard bar.
    expect(withCheck.modules[0]).toBe(1);
    expect(withCheck.modules.at(-1)).toBe(1);
  });

  it('encodes EAN-8 (67) and UPC-A (95) at their fixed widths', () => {
    expect(encodeBarcode('ean8', '9638507').width).toBe(67);
    expect(encodeBarcode('upca', '03600029145').width).toBe(95);
  });

  it('encodes Code 128 via the Code B and Code C paths', () => {
    assertShape(encodeBarcode('code128', 'ABC-123'), 'code128');
    // Even-length digit strings take the denser Code C path.
    expect(encodeBarcode('code128', '1234').width).toBe(57);
  });

  it('encodes Code 39, ITF, and Codabar', () => {
    assertShape(encodeBarcode('code39', 'HELLO-39'), 'code39');
    assertShape(encodeBarcode('itf', '123456'), 'itf');
    assertShape(encodeBarcode('codabar', '123-456'), 'codabar');
  });

  it('encodes the extended and additional symbologies', () => {
    assertShape(encodeBarcode('gs1-128', '0102345678901234'), 'gs1-128');
    assertShape(encodeBarcode('code39ext', 'Hello, World!'), 'code39ext');
    assertShape(encodeBarcode('code93', 'CODE93'), 'code93');
    assertShape(encodeBarcode('code93ext', 'Hello, World!'), 'code93ext');
    assertShape(encodeBarcode('msi', '1234567'), 'msi');
    assertShape(encodeBarcode('pharmacode', '1234'), 'pharmacode');
    // UPC-E is 51 modules; ITF-14 pads a GTIN-14 to a fixed even length.
    expect(encodeBarcode('upce', '0123456').width).toBe(51);
    assertShape(encodeBarcode('itf14', '1234567890123'), 'itf14');
  });

  it('throws a RangeError for invalid payloads', () => {
    expect(() => encodeBarcode('ean13', '5901234123450')).toThrow(RangeError);
    expect(() => encodeBarcode('ean13', '123')).toThrow(RangeError);
    expect(() => encodeBarcode('itf', '123')).toThrow(RangeError);
    expect(() => encodeBarcode('code128', '')).toThrow(RangeError);
  });

  it('returns a real Promise and rejects invalid payloads asynchronously', async () => {
    const pending = encodeBarcodeAsync('ean13', '5901234123450');
    expect(pending).toBeInstanceOf(Promise);
    await expect(pending).rejects.toThrow(RangeError);
  });

  it('normalizes initialization failures into Promise rejections', async () => {
    vi.resetModules();
    const failure = new Error('encoder initialization failed');
    const instance = vi.spyOn(WebAssembly, 'Instance').mockImplementation(
      class {
        constructor() {
          throw failure;
        }
      } as typeof WebAssembly.Instance,
    );

    const { encodeBarcodeAsync: freshEncodeBarcodeAsync } = await import('.');
    await expect(freshEncodeBarcodeAsync('code128', 'ASYNC-INIT')).rejects.toBe(failure);

    instance.mockRestore();
  });

  it('produces the same result asynchronously', async () => {
    const sync = encodeBarcode('code39', 'ASYNC');
    const async = await encodeBarcodeAsync('code39', 'ASYNC');
    expect(async.modules).toEqual(sync.modules);
  });
});

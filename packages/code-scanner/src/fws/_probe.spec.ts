import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { encodeEan13Fws, encodeUpcaFws, decodeEan13Fws, decodeBarcode } from '@mission-platform/barcode';
import { encodeMatrix } from '@mission-platform/matrix-code';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  createForgeWebScriptCompilerService,
  resolveForgeWebScriptModuleGraph,
} from '../../../forge-web-script/dist/index.js';

type RawString = readonly [pointer: number, length: number];

interface RenderedImage {
  readonly width: number;
  readonly height: number;
  readonly luma: number[];
}

interface Api {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly scan_and_decode: (...args: number[]) => RawString;
}

interface MatrixApi {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly decode_datamatrix: (...args: number[]) => RawString;
  readonly decode_aztec: (...args: number[]) => RawString;
}

interface ScannerProbeApi extends Api {
  readonly sc_binarize_luma: (...args: number[]) => number;
  readonly sc_dense_bounds: (...args: number[]) => void;
}

function wasmMemory(instance: WebAssembly.Instance): WebAssembly.Memory {
  return (instance.exports as unknown as { readonly memory: WebAssembly.Memory }).memory;
}

function allocateArray(api: Pick<Api, 'memory' | 'fws_alloc'>, values: readonly number[]): number {
  const pointer = api.fws_alloc((values.length + 1) * 4);
  const view = new DataView(api.memory.buffer, pointer, (values.length + 1) * 4);
  view.setInt32(0, values.length, true);
  for (let index = 0; index < values.length; index += 1) view.setInt32((index + 1) * 4, values[index], true);
  return pointer;
}

const scannerDirectory = resolve(import.meta.dirname);
const projectRoots = [
  scannerDirectory,
  resolve(scannerDirectory, '../../../qr-code/src/fws'),
  resolve(scannerDirectory, '../../../matrix-code/src/fws'),
  resolve(scannerDirectory, '../../../barcode/src/fws'),
];

function loadTree(directory: string, files: Record<string, string>): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fileName = join(directory, entry.name);
    if (entry.isDirectory()) loadTree(fileName, files);
    else if (entry.name.endsWith('.fws')) files[resolve(fileName)] = readFileSync(fileName, 'utf8');
  }
}

function writeArray(api: Api, values: readonly number[]): number {
  const pointer = api.fws_alloc((values.length + 1) * 4);
  const view = new DataView(api.memory.buffer, pointer, (values.length + 1) * 4);
  view.setInt32(0, values.length, true);
  for (let i = 0; i < values.length; i += 1) view.setInt32((i + 1) * 4, values[i], true);
  return pointer;
}

function readString(api: Api, value: RawString): string {
  return new TextDecoder().decode(new Uint8Array(api.memory.buffer, value[0], value[1]));
}

function readArrayN(api: Api, pointer: number, length: number): number[] {
  const view = new DataView(api.memory.buffer, pointer + 4, length * 4);
  return Array.from({ length }, (_, i) => view.getInt32(i * 4, true));
}

function scan(api: Api, image: RenderedImage): string {
  const capacity = image.width * image.height;
  return readString(
    api,
    api.scan_and_decode(
      image.width,
      image.height,
      writeArray(api, image.luma),
      writeArray(api, new Array<number>(capacity).fill(0)),
      writeArray(api, new Array<number>(capacity).fill(0)),
      writeArray(api, new Array<number>(capacity + 1).fill(0)),
      writeArray(api, new Array<number>(16).fill(0)),
    ),
  );
}

function renderMatrix(symbology: 'datamatrix' | 'aztec', value: string, scale = 8, quiet = 4): RenderedImage {
  const code = encodeMatrix(symbology, value);
  const side = code.width;
  const full = (side + quiet * 2) * scale;
  const luma = new Array<number>(full * full).fill(255);
  for (let my = 0; my < code.height; my += 1) {
    for (let mx = 0; mx < code.width; mx += 1) {
      if (code.modules[my * code.width + mx] !== 1) continue;
      for (let y = (my + quiet) * scale; y < (my + quiet + 1) * scale; y += 1)
        for (let x = (mx + quiet) * scale; x < (mx + quiet + 1) * scale; x += 1) luma[y * full + x] = 0;
    }
  }
  return { width: full, height: full, luma };
}

function renderBarcode(bits: string, scale = 3, quiet = 10, height = 60): RenderedImage {
  const width = (bits.length + quiet * 2) * scale;
  const luma = new Array<number>(width * height).fill(255);
  for (const [index, bit] of [...bits].entries()) {
    if (bit !== '1') continue;
    for (let y = 8; y < height - 8; y += 1)
      for (let x = (index + quiet) * scale; x < (index + quiet + 1) * scale; x += 1) luma[y * width + x] = 0;
  }
  return { width, height, luma };
}

function rotate90(image: RenderedImage): RenderedImage {
  const { width, height, luma } = image;
  const out = new Array<number>(width * height).fill(255);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) out[x * height + (height - 1 - y)] = luma[y * width + x];
  return { width: height, height: width, luma: out };
}

describe('probe scanner formats', () => {
  let api: Api;
  beforeAll(async () => {
    const files: Record<string, string> = {};
    for (const root of projectRoots) loadTree(root, files);
    const entry = resolve(scannerDirectory, 'scanner.fws');
    const resolver = {
      resolve(source: string, importer: string): string | undefined {
        const target = resolve(dirname(importer), source);
        return files[target] === undefined ? undefined : target;
      },
      load(fileName: string): string {
        return files[fileName] ?? '';
      },
    };
    const linkConfiguration = {
      projectRoots,
      defaultLinkMode: 'static' as const,
      crossProjectLinkMode: 'static' as const,
      linkProfile: 'static' as const,
    };
    const graph = await resolveForgeWebScriptModuleGraph([entry], resolver, linkConfiguration);
    const service = createForgeWebScriptCompilerService();
    try {
      const artifact = service.compileGraph({
        graph: graph.graph,
        entryFileName: entry,
        compilerVersion: '0.1.0',
        linkConfiguration,
      });
      const errors = artifact.diagnostics.filter(({ severity }) => severity === 'error');
      expect(errors, errors.map(({ message }) => message).join('\n')).toHaveLength(0);
      let instance: WebAssembly.Instance | undefined;
      const td = new TextDecoder('utf-8', { fatal: true });
      const imports = {
        'qr.decode.utf8': {
          decode_utf8(pointer: number, length: number): RawString {
            if (instance === undefined) return [0, 0];
            const encoded = new TextDecoder().decode(
              new Uint8Array(wasmMemory(instance).buffer, pointer, length),
            );
            const bytes = new Uint8Array(encoded.length / 3);
            for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number(encoded.slice(i * 3, i * 3 + 3));
            try {
              const s = `1${td.decode(bytes)}`;
              const ex = instance.exports as unknown as Api;
              const enc = new TextEncoder().encode(s);
              const ptr = ex.fws_alloc(enc.byteLength);
              new Uint8Array(ex.memory.buffer, ptr, enc.byteLength).set(enc);
              return [ptr, enc.byteLength];
            } catch {
              return [0, 0];
            }
          },
          matrix_decode_utf8(pointer: number, length: number): RawString {
            if (instance === undefined) return [0, 0];
            const encoded = new TextDecoder().decode(
              new Uint8Array(wasmMemory(instance).buffer, pointer, length),
            );
            const bytes = new Uint8Array(encoded.length / 3);
            for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number(encoded.slice(i * 3, i * 3 + 3));
            try {
              const s = `1${td.decode(bytes)}`;
              const ex = instance.exports as unknown as Api;
              const enc = new TextEncoder().encode(s);
              const ptr = ex.fws_alloc(enc.byteLength);
              new Uint8Array(ex.memory.buffer, ptr, enc.byteLength).set(enc);
              return [ptr, enc.byteLength];
            } catch {
              return [0, 0];
            }
          },
        },
      };
      instance = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!), imports);
      api = instance.exports as unknown as Api;
    } finally {
      service.dispose();
    }
  }, 900_000);

  it('probes matrix decoder in isolation', async () => {
    const files: Record<string, string> = {};
    for (const root of projectRoots) loadTree(root, files);
    const entry = resolve(scannerDirectory, '../../../matrix-code/src/fws/matrix-decoder-datamatrix.fws');
    const resolver = {
      resolve(source: string, importer: string): string | undefined {
        const target = resolve(dirname(importer), source);
        return files[target] === undefined ? undefined : target;
      },
      load(fileName: string): string {
        return files[fileName] ?? '';
      },
    };
    const graph = await resolveForgeWebScriptModuleGraph([entry], resolver, { projectRoots });
    const service = createForgeWebScriptCompilerService();
    try {
      const artifact = service.compileGraph({ graph: graph.graph, entryFileName: entry, compilerVersion: '0.1.0' });
      const errors = artifact.diagnostics.filter(({ severity }) => severity === 'error');
      console.log('matrix decoder compile errors:', errors.map((e) => e.message).join(' | ') || 'none');
      if (errors.length > 0) return;
      const inst = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!), {});
      const mex = inst.exports as unknown as MatrixApi;
      console.log(
        'matrix exports:',
        Object.keys(mex).filter((k) => k.startsWith('decode')),
      );
      const code = encodeMatrix('datamatrix', 'DM-HELLO');
      const wa = allocateArray.bind(undefined, mex);
      const raw = mex.decode_datamatrix(
        0,
        code.width,
        code.height,
        wa(code.modules),
        wa(new Array(code.modules.length).fill(0)),
      );
      const s = new TextDecoder().decode(new Uint8Array(mex.memory.buffer, raw[0], raw[1]));
      expect(raw[1]).toBeGreaterThanOrEqual(0);
      console.log('DM decode clean modules ->', JSON.stringify(s), 'w', code.width, 'h', code.height);
    } finally {
      service.dispose();
    }
  }, 30_000);

  it('probes aztec decoder in isolation', async () => {
    const files: Record<string, string> = {};
    for (const root of projectRoots) loadTree(root, files);
    const entry = resolve(scannerDirectory, '../../../matrix-code/src/fws/matrix-decoder-aztec.fws');
    const resolver = {
      resolve(source: string, importer: string): string | undefined {
        const target = resolve(dirname(importer), source);
        return files[target] === undefined ? undefined : target;
      },
      load(fileName: string): string {
        return files[fileName] ?? '';
      },
    };
    const graph = await resolveForgeWebScriptModuleGraph([entry], resolver, { projectRoots });
    const service = createForgeWebScriptCompilerService();
    try {
      const artifact = service.compileGraph({ graph: graph.graph, entryFileName: entry, compilerVersion: '0.1.0' });
      const errors = artifact.diagnostics.filter(({ severity }) => severity === 'error');
      console.log('aztec decoder compile errors:', errors.map((e) => e.message).join(' | ') || 'none');
      if (errors.length > 0) return;
      const inst = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!), {});
      const mex = inst.exports as unknown as MatrixApi;
      console.log(
        'aztec exports:',
        Object.keys(mex).filter((k) => k.startsWith('decode')),
      );
      const code = encodeMatrix('aztec', 'AZTEC42');
      const wa = allocateArray.bind(undefined, mex);
      const raw = mex.decode_aztec(
        code.width,
        code.height,
        wa(code.modules),
        wa(new Array(code.modules.length).fill(0)),
      );
      const s = new TextDecoder().decode(new Uint8Array(mex.memory.buffer, raw[0], raw[1]));
      expect(raw[1]).toBeGreaterThanOrEqual(0);
      console.log('Aztec decode clean modules ->', JSON.stringify(s), 'w', code.width, 'h', code.height);
    } finally {
      service.dispose();
    }
  }, 30_000);

  it('samples DM grid vs truth', () => {
    const code = encodeMatrix('datamatrix', 'DM-HELLO');
    const scale = 8;
    const quiet = 4;
    const side = code.width;
    const full = (side + quiet * 2) * scale;
    const luma = new Array<number>(full * full).fill(255);
    for (let my = 0; my < code.height; my += 1)
      for (let mx = 0; mx < code.width; mx += 1) {
        if (code.modules[my * code.width + mx] !== 1) continue;
        for (let y = (my + quiet) * scale; y < (my + quiet + 1) * scale; y += 1)
          for (let x = (mx + quiet) * scale; x < (mx + quiet + 1) * scale; x += 1) luma[y * full + x] = 0;
      }
    const a = api as ScannerProbeApi;
    const bits = a.sc_binarize_luma(full, full, writeArray(api, luma));
    const metaP = writeArray(api, new Array(4).fill(0));
    a.sc_dense_bounds(bits, full, full, metaP);
    const mv = new DataView(api.memory.buffer, metaP + 4, 16);
    const bounds = [mv.getInt32(0, true), mv.getInt32(4, true), mv.getInt32(8, true), mv.getInt32(12, true)];
    console.log('DM dense bounds:', bounds, 'expected [32,32,', 32 + side * scale, ',', 32 + side * scale, ']');
    const origin = quiet * scale;
    const modP = writeArray(api, new Array(side * side).fill(0));
    a.sc_sample_square_grid(bits, full, full, origin * 256, origin * 256, scale * 256, side, modP);
    const sampled = readArrayN(api, modP, side * side);
    expect(sampled).toHaveLength(side * side);
    let mism = 0;
    for (let i = 0; i < side * side; i += 1) if (sampled[i] !== code.modules[i]) mism += 1;
    console.log('DM sample mismatches (fixed origin/module):', mism, '/', side * side);
    const topRow = [];
    const rightCol = [];
    const leftCol = [];
    const bottomRow = [];
    for (let j = 0; j < side; j += 1) topRow.push(code.modules[0 * side + j]);
    for (let i = 0; i < side; i += 1) rightCol.push(code.modules[i * side + (side - 1)]);
    for (let i = 0; i < side; i += 1) leftCol.push(code.modules[i * side + 0]);
    for (let j = 0; j < side; j += 1) bottomRow.push(code.modules[(side - 1) * side + j]);
    console.log('DM topRow   :', topRow.join(''));
    console.log('DM rightCol :', rightCol.join(''));
    console.log('DM leftCol  :', leftCol.join(''));
    console.log('DM bottomRow:', bottomRow.join(''));

    const az = encodeMatrix('aztec', 'AZTEC42');
    console.log('AZTEC grid', az.width, 'x', az.height);
    for (let r = 0; r < az.height; r += 1) {
      let row = '';
      for (let cc = 0; cc < az.width; cc += 1) row += az.modules[r * az.width + cc] ? '#' : '.';
      console.log('AZ', r.toString().padStart(2, '0'), row);
    }
  });

  it('probes formats', () => {
    const dm = renderMatrix('datamatrix', 'DM-HELLO');
    expect(dm.luma).toHaveLength(dm.width * dm.height);
    console.log('DataMatrix:', JSON.stringify(scan(api, dm)));
    console.log('DataMatrix scale6:', JSON.stringify(scan(api, renderMatrix('datamatrix', 'DM-HELLO', 6))));
    console.log('DataMatrix rot90:', JSON.stringify(scan(api, rotate90(dm))));

    const az = renderMatrix('aztec', 'AZTEC42');
    console.log('Aztec:', JSON.stringify(scan(api, az)));
    console.log('Aztec scale6:', JSON.stringify(scan(api, renderMatrix('aztec', 'AZTEC42', 6))));

    const ean13 = encodeEan13Fws('123456789012');
    expect(ean13).toHaveLength(95);
    console.log('EAN13 bits len', ean13.length);
    // decoder in isolation with clean bits
    console.log('decodeEan13Fws clean:', JSON.stringify(decodeEan13Fws(ean13)));
    console.log('decodeBarcode ean13 clean:', JSON.stringify(decodeBarcode('ean13', ean13)));
    try {
      console.log('EAN13 scan:', JSON.stringify(scan(api, renderBarcode(ean13))));
    } catch (error) {
      console.log('EAN13 scan THREW:', (error as Error).message);
    }
    try {
      const ean13zero = encodeEan13Fws('012345678905');
      console.log('EAN13 zero-prefixed scan:', JSON.stringify(scan(api, renderBarcode(ean13zero))));
    } catch (error) {
      console.log('EAN13 zero scan THREW:', (error as Error).message);
    }
    try {
      const upca = encodeUpcaFws('03600029145');
      console.log('UPCA bits len', upca.length);
      console.log('UPCA scan:', JSON.stringify(scan(api, renderBarcode(upca))));
    } catch (error) {
      console.log('UPCA scan THREW:', (error as Error).message);
    }
  }, 120_000);
});

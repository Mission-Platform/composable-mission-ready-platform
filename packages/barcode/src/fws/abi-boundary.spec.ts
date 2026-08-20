import { describe, expect, it } from 'vitest';

import { load as loadBarcode, loadSync as loadBarcodeSync, manifest as barcodeManifest } from './barcode.fws';
import { load as loadCodabar, loadSync as loadCodabarSync, manifest as codabarManifest } from './codabar.fws';
import { load as loadCode128, loadSync as loadCode128Sync, manifest as code128Manifest } from './code128.fws';
import { load as loadCode39, loadSync as loadCode39Sync, manifest as code39Manifest } from './code39.fws';
import { load as loadCode93, loadSync as loadCode93Sync, manifest as code93Manifest } from './code93.fws';
import { load as loadDataBar, loadSync as loadDataBarSync, manifest as dataBarManifest } from './databar.fws';
import { load as loadItf, loadSync as loadItfSync, manifest as itfManifest } from './itf.fws';
import { load as loadMsi, loadSync as loadMsiSync, manifest as msiManifest } from './msi.fws';
import {
  load as loadPharmacode,
  loadSync as loadPharmacodeSync,
  manifest as pharmacodeManifest,
} from './pharmacode.fws';

interface AbiManifest {
  readonly exports: readonly { readonly name: string }[];
  readonly memory: {
    readonly allocatorExport: string;
    readonly deallocatorExport: string;
    readonly reallocatorExport: string;
  };
}

interface LoadedExports {
  readonly [name: string]: unknown;
}

interface BarcodeGraph {
  readonly name: string;
  readonly manifest: Readonly<Record<string, unknown>>;
  readonly load: () => Promise<LoadedExports>;
  readonly loadSync: () => LoadedExports;
}

const runtimeExportNames = ['memory', 'fws_alloc', 'fws_dealloc', 'fws_realloc', 'fws_reset'] as const;

const barcodeGraphs: readonly BarcodeGraph[] = [
  { name: 'barcode', manifest: barcodeManifest, load: loadBarcode, loadSync: loadBarcodeSync },
  { name: 'code128', manifest: code128Manifest, load: loadCode128, loadSync: loadCode128Sync },
  { name: 'code39', manifest: code39Manifest, load: loadCode39, loadSync: loadCode39Sync },
  { name: 'code93', manifest: code93Manifest, load: loadCode93, loadSync: loadCode93Sync },
  { name: 'codabar', manifest: codabarManifest, load: loadCodabar, loadSync: loadCodabarSync },
  { name: 'databar', manifest: dataBarManifest, load: loadDataBar, loadSync: loadDataBarSync },
  { name: 'itf', manifest: itfManifest, load: loadItf, loadSync: loadItfSync },
  { name: 'msi', manifest: msiManifest, load: loadMsi, loadSync: loadMsiSync },
  { name: 'pharmacode', manifest: pharmacodeManifest, load: loadPharmacode, loadSync: loadPharmacodeSync },
];

function manifestFor(graph: BarcodeGraph): AbiManifest {
  return graph.manifest as unknown as AbiManifest;
}

function expectedExportNames(graph: BarcodeGraph): string[] {
  const manifest = manifestFor(graph);
  return [...runtimeExportNames, ...manifest.exports.map(({ name }) => name)].toSorted();
}

function expectAbiBoundary(graph: BarcodeGraph, loaded: LoadedExports): void {
  const manifest = manifestFor(graph);

  expect(Object.keys(loaded).toSorted(), `${graph.name} Wasm exports`).toEqual(expectedExportNames(graph));
  expect(loaded.memory).toBeInstanceOf(WebAssembly.Memory);
  expect(loaded[manifest.memory.allocatorExport]).toEqual(expect.any(Function));
  expect(loaded[manifest.memory.deallocatorExport]).toEqual(expect.any(Function));
  expect(loaded[manifest.memory.reallocatorExport]).toEqual(expect.any(Function));
  expect(loaded.fws_reset).toEqual(expect.any(Function));

  for (const declaration of manifest.exports) {
    expect(loaded[declaration.name], `${graph.name}.${declaration.name}`).toEqual(expect.any(Function));
  }
}

describe('barcode FWS ABI boundaries', () => {
  it('exposes only declared functions and runtime support through synchronous loaders', () => {
    for (const graph of barcodeGraphs) {
      expectAbiBoundary(graph, graph.loadSync());
    }
  });

  it('preserves the same declared boundary through asynchronous loaders', async () => {
    const loadedGraphs = await Promise.all(barcodeGraphs.map(async (graph) => [graph, await graph.load()] as const));

    for (const [graph, loaded] of loadedGraphs) {
      expectAbiBoundary(graph, loaded);
    }
  });
});

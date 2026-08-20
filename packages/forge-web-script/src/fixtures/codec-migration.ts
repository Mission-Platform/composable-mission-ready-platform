import type { ForgeWebScriptConformanceFixture } from './bootstrap.ts';

/**
 * A deliberately small migration boundary for codec-shaped workloads. The
 * host owns the actual codec implementation; the Forge Web Script module only
 * forwards its UTF-8 input and returns the owned byte buffer.
 */
export const codecMigrationFixture: ForgeWebScriptConformanceFixture = {
  name: 'barcode codec capability boundary',
  valid: true,
  requestedCapabilities: ['codec.barcode.encode'],
  source: `import capability "codec.barcode.encode" as encode(payload: string) -> bytes;

export fn encode_payload(payload: string) -> bytes {
    return encode(payload);
}`,
};

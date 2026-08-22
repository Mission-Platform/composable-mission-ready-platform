import { describe, expect, it } from 'vitest';

import { FORGE_BRIDGE_PROTOCOL_VERSION, isForgeBridgeResponse } from './protocol.js';

describe('Forge bridge protocol', () => {
  it('recognizes versioned per-file responses', () => {
    expect(
      isForgeBridgeResponse({
        protocolVersion: FORGE_BRIDGE_PROTOCOL_VERSION,
        ok: false,
        results: [{ path: 'Checkout.tsx', status: 'rejected', error: 'exists' }],
      }),
    ).toBe(true);
  });

  it('rejects unknown protocol versions and malformed file results', () => {
    expect(isForgeBridgeResponse({ protocolVersion: 2, ok: true, results: [] })).toBe(false);
    expect(isForgeBridgeResponse({ protocolVersion: 1, ok: true, results: [{ path: 'x', status: 'failed' }] })).toBe(
      false,
    );
  });
});

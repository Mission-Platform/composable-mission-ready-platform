import { describe, expect, it, vi } from 'vitest';

import worker from '.';

// The worker is a thin entrypoint: it delegates every request to the
// Cloudflare `ASSETS` binding. The test stubs that binding and asserts the
// delegation contract (same request in, same response out).
describe('@mission-platform/forge-spa', () => {
  it('delegates the request to the ASSETS binding and returns its response', async () => {
    const request = new Request('https://example.com/app');
    const assetResponse = new Response('asset-body');
    const assets = { fetch: vi.fn(async () => assetResponse) };
    const logSpy = vi.spyOn(console, 'log');

    const environment = { ASSETS: assets } as unknown as Parameters<typeof worker.fetch>[1];
    const result = await worker.fetch(request, environment);

    expect(assets.fetch).toHaveBeenCalledTimes(1);
    expect(assets.fetch).toHaveBeenCalledWith(request);
    expect(result).toBe(assetResponse);
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

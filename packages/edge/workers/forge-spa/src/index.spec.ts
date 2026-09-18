/* eslint-disable @typescript-eslint/prefer-satisfies */
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

  it('applies defensive security headers to successful asset responses', async () => {
    const request = new Request('https://example.com/app');
    const assetResponse = new Response('asset-body', { status: 200 });
    const assets = { fetch: vi.fn(async () => assetResponse) };
    const environment = { ASSETS: assets } as unknown as Parameters<typeof worker.fetch>[1];

    const result = await worker.fetch(request, environment);

    expect(result.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(result.headers.get('x-content-type-options')).toBe('nosniff');
    expect(result.headers.get('x-frame-options')).toBe('DENY');
    expect(result.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(result.headers.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains; preload');
  });

  it('applies defensive security headers to error responses from the asset binding', async () => {
    const request = new Request('https://example.com/missing.js');
    const notFoundResponse = new Response('Not found', { status: 404 });
    const assets = { fetch: vi.fn(async () => notFoundResponse) };
    const environment = { ASSETS: assets } as unknown as Parameters<typeof worker.fetch>[1];

    const result = await worker.fetch(request, environment);

    expect(result.status).toBe(404);
    expect(result.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(result.headers.get('x-content-type-options')).toBe('nosniff');
    expect(result.headers.get('x-frame-options')).toBe('DENY');
  });
});

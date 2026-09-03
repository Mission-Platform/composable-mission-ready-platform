import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runProbe } from './probes';

vi.mock('cloudflare:workers', () => ({ env: {} }));
vi.mock('cloudflare:sockets', () => ({ connect: vi.fn() }));

describe('runProbe destination and response bounds', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fails closed for private destinations without making a request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const sample = await runProbe({ id: 'private', name: 'Private', type: 'http', url: 'https://127.0.0.1/health' });

    expect(sample.state).toBe('down');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects redirects to destinations outside the policy', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/health' } }));
    const sample = await runProbe({
      id: 'redirect',
      name: 'Redirect',
      type: 'http',
      url: 'https://example.com/health',
    });

    expect(sample.state).toBe('down');
    expect(sample.error).toContain('redirect destination is not allowed');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects responses exceeding the probe body limit before reading them', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200, headers: { 'content-length': String(256 * 1024 + 1) } }),
    );
    const sample = await runProbe({ id: 'large', name: 'Large', type: 'http', url: 'https://example.com/health' });

    expect(sample.state).toBe('down');
    expect(sample.error).toContain('probe response is too large');
  });
});

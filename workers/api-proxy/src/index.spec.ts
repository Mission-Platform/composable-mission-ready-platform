import { afterEach, describe, expect, it, vi } from 'vitest';

import worker from '.';

// The worker proxies incoming requests to a fixed upstream host. The tests
// stub the global `fetch` to capture the forwarded request and assert the
// hostname rewrite, method/header forwarding, and the error → 500 contract.
const executionContext = {} as ExecutionContext;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('@mission-platform/api-proxy', () => {
  it('rewrites the hostname to the upstream and forwards method and headers', async () => {
    const upstream = new Response('upstream-body', { status: 200 });
    const fetchMock = vi.fn(async () => upstream);
    vi.stubGlobal('fetch', fetchMock);

    const request = new Request('https://origin.test/users/123?q=1', {
      method: 'POST',
      headers: { 'x-test': '1' },
    });
    const result = await worker.fetch(request, {}, executionContext);

    expect(result).toBe(upstream);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const forwarded = fetchMock.mock.calls[0]?.[0] as Request;
    const forwardedUrl = new URL(forwarded.url);
    expect(forwardedUrl.hostname).toBe('api.example.com');
    expect(forwardedUrl.pathname).toBe('/users/123');
    expect(forwardedUrl.search).toBe('?q=1');
    expect(forwarded.method).toBe('POST');
    expect(forwarded.headers.get('x-test')).toBe('1');
  });

  it('returns a 500 with the error message when the upstream fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('upstream unreachable');
      }),
    );

    const result = await worker.fetch(new Request('https://origin.test/'), {}, executionContext);

    expect(result.status).toBe(500);
    expect(await result.text()).toContain('upstream unreachable');
  });
});

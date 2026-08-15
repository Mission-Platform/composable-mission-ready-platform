import { afterEach, describe, expect, it, vi } from 'vitest';

import worker from '.';

const executionContext = {} as ExecutionContext;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('@mission-platform/api-proxy', () => {
  it('forwards an allowed route with sanitized headers and query string', async () => {
    const upstream = new Response('upstream-body', { status: 200 });
    const fetchMock = vi.fn(async () => upstream);
    vi.stubGlobal('fetch', fetchMock);

    const request = new Request('https://origin.test/users/123?q=1', {
      headers: {
        authorization: 'Bearer secret',
        cookie: 'session=secret',
        host: 'origin.test',
        'x-test': '1',
      },
    });
    const result = await worker.fetch(request, {}, executionContext);

    expect(result).toBe(upstream);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const forwarded = fetchMock.mock.calls[0]?.[0] as Request;
    const forwardedUrl = new URL(forwarded.url);
    expect(forwardedUrl.origin).toBe('https://api.example.com');
    expect(forwardedUrl.pathname).toBe('/users/123');
    expect(forwardedUrl.search).toBe('?q=1');
    expect(forwarded.method).toBe('GET');
    expect(forwarded.headers.get('x-test')).toBe('1');
    expect(forwarded.headers.get('authorization')).toBeNull();
    expect(forwarded.headers.get('cookie')).toBeNull();
    expect(forwarded.headers.get('host')).toBeNull();
  });

  it('rejects disallowed methods and paths without contacting upstream', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const disallowedMethod = await worker.fetch(
      new Request('https://origin.test/users/123', { method: 'POST' }),
      {},
      executionContext,
    );
    const disallowedPath = await worker.fetch(new Request('https://origin.test/admin'), {}, executionContext);

    expect(disallowedMethod.status).toBe(404);
    expect(disallowedPath.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects encoded path traversal', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await worker.fetch(new Request('https://origin.test/users/%2e%2e/admin'), {}, executionContext);

    expect(result.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('follows redirects that stay on the fixed upstream origin', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(undefined, { status: 302, headers: { Location: '/users/456' } }))
      .mockResolvedValueOnce(new Response('redirected-body', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await worker.fetch(new Request('https://origin.test/users/123'), {}, executionContext);

    expect(result.status).toBe(200);
    expect(await result.text()).toBe('redirected-body');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL((fetchMock.mock.calls[1]?.[0] as Request).url).href).toBe('https://api.example.com/users/456');
  });

  it('rejects redirects to another origin without following them', async () => {
    const fetchMock = vi.fn(
      async () => new Response(undefined, { status: 302, headers: { Location: 'https://evil.test/' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await worker.fetch(new Request('https://origin.test/users/123'), {}, executionContext);

    expect(result.status).toBe(502);
    expect(await result.text()).toBe('Bad gateway');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns an opaque 502 when the upstream fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('upstream unreachable');
      }),
    );

    const result = await worker.fetch(new Request('https://origin.test/users/123'), {}, executionContext);

    expect(result.status).toBe(502);
    expect(await result.text()).toBe('Bad gateway');
  });
});

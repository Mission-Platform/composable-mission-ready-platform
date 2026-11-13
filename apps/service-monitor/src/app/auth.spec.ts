import { describe, expect, it } from 'vitest';

import {
  authorizeMonitorRequest,
  createSignedSessionToken,
  handleMonitorSession,
  verifySignedSessionToken,
} from './auth';

function request(authorization?: string, cookie?: string): Request {
  return new Request('https://monitor.example.test/api/monitors', {
    headers: {
      ...(authorization ? { authorization } : {}),
      ...(cookie ? { cookie } : {}),
    },
  });
}

describe('authorizeMonitorRequest', () => {
  it('rejects requests when the Worker secret is not configured', async () => {
    const response = await authorizeMonitorRequest(request('Bearer configured-token'));

    expect(response?.status).toBe(401);
  });

  it('rejects missing, malformed, and incorrect credentials', async () => {
    expect((await authorizeMonitorRequest(request(), 'configured-token'))?.status).toBe(401);
    expect((await authorizeMonitorRequest(request('Basic configured-token'), 'configured-token'))?.status).toBe(401);
    expect((await authorizeMonitorRequest(request('Bearer wrong-token'), 'configured-token'))?.status).toBe(401);
  });

  it('accepts a bearer token with surrounding whitespace', async () => {
    expect(await authorizeMonitorRequest(request('  Bearer   configured-token  '), ' configured-token ')).toBeNull();
  });

  it('returns a bearer challenge for rejected requests', async () => {
    const response = await authorizeMonitorRequest(request(), 'configured-token');

    expect(response?.headers.get('www-authenticate')).toBe('Bearer');
    expect(response?.headers.get('cache-control')).toBe('no-store');
  });

  it('accepts an HttpOnly session cookie without exposing the configured secret to the browser', async () => {
    const login = await handleMonitorSession(
      new Request('https://monitor.example.test/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ token: 'configured-token' }),
        headers: { 'content-type': 'application/json' },
      }),
      'configured-token',
    );
    const setCookie = login.headers.get('set-cookie');
    const cookie = setCookie?.split(';', 1)[0];
    const sessionToken = cookie?.split('=')[1];

    expect(login.status).toBe(200);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).not.toContain('configured-token');
    expect(sessionToken).toContain('.');
    expect(await authorizeMonitorRequest(request(undefined, cookie), 'configured-token')).toBeNull();
  });

  it('rejects tampered session token payload or signature', async () => {
    const validToken = await createSignedSessionToken('configured-token', 3600);
    const [payloadB64, signatureB64] = validToken.split('.');

    // Tampered payload
    const tamperedPayload = Buffer.from(JSON.stringify({ exp: Date.now() + 100000, nonce: 'tampered' })).toString(
      'base64url',
    );
    const tamperedToken = `${tamperedPayload}.${signatureB64}`;
    expect(await verifySignedSessionToken('configured-token', tamperedToken)).toBe(false);
    expect(
      (await authorizeMonitorRequest(request(undefined, `monitor_session=${tamperedToken}`), 'configured-token'))
        ?.status,
    ).toBe(401);

    // Tampered signature
    const badSignatureToken = `${payloadB64}.invalidsignature`;
    expect(await verifySignedSessionToken('configured-token', badSignatureToken)).toBe(false);
    expect(
      (await authorizeMonitorRequest(request(undefined, `monitor_session=${badSignatureToken}`), 'configured-token'))
        ?.status,
    ).toBe(401);

    // Wrong secret verification
    expect(await verifySignedSessionToken('different-secret', validToken)).toBe(false);
    expect(
      (await authorizeMonitorRequest(request(undefined, `monitor_session=${validToken}`), 'different-secret'))?.status,
    ).toBe(401);
  });

  it('rejects expired session tokens', async () => {
    // Generate token with negative maxAge (expired in the past)
    const expiredToken = await createSignedSessionToken('configured-token', -60);
    expect(await verifySignedSessionToken('configured-token', expiredToken)).toBe(false);
    expect(
      (await authorizeMonitorRequest(request(undefined, `monitor_session=${expiredToken}`), 'configured-token'))
        ?.status,
    ).toBe(401);
  });

  it('rejects malformed cookie values', async () => {
    expect(await verifySignedSessionToken('configured-token', 'not-a-token')).toBe(false);
    expect(await verifySignedSessionToken('configured-token', '')).toBe(false);
    expect(await verifySignedSessionToken('configured-token', 'foo.bar.baz')).toBe(false);
    expect(
      (await authorizeMonitorRequest(request(undefined, 'monitor_session=not-a-token'), 'configured-token'))?.status,
    ).toBe(401);
  });

  it('reports browser session state and rejects invalid session credentials', async () => {
    const invalid = await handleMonitorSession(
      new Request('https://monitor.example.test/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ token: 'wrong-token' }),
        headers: { 'content-type': 'application/json' },
      }),
      'configured-token',
    );
    const status = await handleMonitorSession(request(), 'configured-token');

    expect(invalid.status).toBe(401);
    expect(await status.json()).toEqual({ authenticated: false });
  });

  it('rejects oversized chunked login bodies before buffering the full payload', async () => {
    const response = await handleMonitorSession(
      new Request('https://monitor.example.test/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ token: 'x'.repeat(9_000) }),
        headers: { 'content-type': 'application/json' },
      }),
      'configured-token',
    );

    expect(response.status).toBe(413);
  });

  it('clears session on DELETE request with Max-Age=0', async () => {
    const login = await handleMonitorSession(
      new Request('https://monitor.example.test/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ token: 'configured-token' }),
        headers: { 'content-type': 'application/json' },
      }),
      'configured-token',
    );
    const setCookie = login.headers.get('set-cookie');
    const cookie = setCookie?.split(';', 1)[0];

    expect(await authorizeMonitorRequest(request(undefined, cookie), 'configured-token')).toBeNull();

    const logout = await handleMonitorSession(
      new Request('https://monitor.example.test/api/auth/session', {
        method: 'DELETE',
        headers: { cookie: cookie ?? '' },
      }),
      'configured-token',
    );

    expect(logout.status).toBe(200);
    const logoutCookie = logout.headers.get('set-cookie');
    expect(logoutCookie).toContain('Max-Age=0');
  });
});

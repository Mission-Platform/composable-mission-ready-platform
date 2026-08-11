import { describe, expect, it } from 'vitest';

import { authorizeMonitorRequest, handleMonitorSession } from './auth';

function request(authorization?: string, cookie?: string): Request {
  return new Request('https://monitor.example.test/api/monitors', {
    headers: {
      ...(authorization ? { authorization } : {}),
      ...(cookie ? { cookie } : {}),
    },
  });
}

describe('authorizeMonitorRequest', () => {
  it('rejects requests when the Worker secret is not configured', () => {
    const response = authorizeMonitorRequest(request('Bearer configured-token'));

    expect(response?.status).toBe(401);
  });

  it('rejects missing, malformed, and incorrect credentials', () => {
    expect(authorizeMonitorRequest(request(), 'configured-token')?.status).toBe(401);
    expect(authorizeMonitorRequest(request('Basic configured-token'), 'configured-token')?.status).toBe(401);
    expect(authorizeMonitorRequest(request('Bearer wrong-token'), 'configured-token')?.status).toBe(401);
  });

  it('accepts a bearer token with surrounding whitespace', () => {
    expect(authorizeMonitorRequest(request('  Bearer   configured-token  '), ' configured-token ')).toBeNull();
  });

  it('returns a bearer challenge for rejected requests', () => {
    const response = authorizeMonitorRequest(request(), 'configured-token');

    expect(response?.headers.get('www-authenticate')).toBe('Bearer');
    expect(response?.headers.get('cache-control')).toBe('no-store');
  });

  it('accepts an HttpOnly session cookie without exposing a bearer header to the browser', async () => {
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

    expect(login.status).toBe(200);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    expect(authorizeMonitorRequest(request(undefined, cookie), 'configured-token')).toBeNull();
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
});

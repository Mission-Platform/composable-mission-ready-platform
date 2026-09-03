/**
 * Authenticate administrative service-monitor API requests with the token
 * stored in the Worker secret `MONITOR_API_TOKEN`.
 *
 * This module intentionally has no Worker binding imports so the credential
 * parsing and comparison can be tested without a Cloudflare runtime.
 */

interface TimingSafeSubtleCrypto extends SubtleCrypto {
  timingSafeEqual?(a: ArrayBuffer | ArrayBufferView, b: ArrayBuffer | ArrayBufferView): boolean;
}

export const MONITOR_SESSION_COOKIE = 'monitor_session';
const MONITOR_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const MAX_AUTH_REQUEST_BYTES = 8 * 1024;

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let difference = 0;
  for (const [index, value] of left.entries()) {
    difference |= value ^ right[index];
  }
  return difference === 0;
}

function tokensMatch(expected: string, provided: string): boolean {
  const encoder = new TextEncoder();
  const expectedBytes = encoder.encode(expected);
  const providedBytes = encoder.encode(provided);
  const length = Math.max(expectedBytes.length, providedBytes.length);
  const expectedPadded = new Uint8Array(length);
  const providedPadded = new Uint8Array(length);
  expectedPadded.set(expectedBytes);
  providedPadded.set(providedBytes);

  const subtle = globalThis.crypto?.subtle as TimingSafeSubtleCrypto | undefined;
  const equal =
    subtle?.timingSafeEqual?.(expectedPadded, providedPadded) ?? constantTimeEqual(expectedPadded, providedPadded);
  return equal && expectedBytes.length === providedBytes.length;
}

function cookieValue(request: Request, name: string): string | undefined {
  const cookies = request.headers.get('cookie')?.split(';') ?? [];
  const prefix = `${name}=`;
  for (const cookie of cookies) {
    const value = cookie.trim();
    if (!value.startsWith(prefix)) continue;
    try {
      return decodeURIComponent(value.slice(prefix.length));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function bearerValue(request: Request): string | undefined {
  const authorization = request.headers.get('authorization');
  if (!authorization) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim();
}

function sessionCookie(token: string, request: Request, maxAge: number): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${MONITOR_SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

/** Return a no-store `401` response without revealing which check failed. */
function unauthorized(): Response {
  return Response.json(
    { error: 'Authentication required.' },
    {
      status: 401,
      headers: {
        'cache-control': 'no-store',
        'www-authenticate': 'Bearer',
      },
    },
  );
}

/**
 * Authenticate a request using `Authorization: Bearer <token>` or the browser
 * session cookie established by {@link handleMonitorSession}.
 *
 * A missing configured token fails closed so a deployment cannot accidentally
 * expose administrative routes when its secret has not been provisioned.
 * Returns `null` when access is allowed, otherwise the response to return.
 */
export function authorizeMonitorRequest(request: Request, configuredToken?: string): Response | null {
  const expectedToken = configuredToken?.trim();
  const providedToken = bearerValue(request) ?? cookieValue(request, MONITOR_SESSION_COOKIE);
  if (!expectedToken || !providedToken) {
    return unauthorized();
  }

  if (!tokensMatch(expectedToken, providedToken)) {
    return unauthorized();
  }

  return null;
}

/**
 * Establish or clear the browser session used by administrative API requests.
 * The API token is accepted only in the request body and is stored in an
 * HttpOnly, SameSite cookie so client code never needs to put it in a header.
 */
export async function handleMonitorSession(request: Request, configuredToken?: string): Promise<Response> {
  if (request.method === 'GET') {
    const authenticated = authorizeMonitorRequest(request, configuredToken) === null;
    return Response.json({ authenticated }, { headers: { 'cache-control': 'no-store' } });
  }

  if (request.method === 'DELETE') {
    const authenticationFailure = authorizeMonitorRequest(request, configuredToken);
    if (authenticationFailure) return authenticationFailure;
    return Response.json(
      { ok: true },
      {
        headers: {
          'cache-control': 'no-store',
          'set-cookie': sessionCookie('', request, 0),
        },
      },
    );
  }

  if (request.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed.' },
      { status: 405, headers: { allow: 'GET, POST, DELETE', 'cache-control': 'no-store' } },
    );
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_AUTH_REQUEST_BYTES) {
    return Response.json({ error: 'Request body is too large.' }, { status: 413 });
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_AUTH_REQUEST_BYTES) {
      return Response.json({ error: 'Request body is too large.' }, { status: 413 });
    }
    body = JSON.parse(text) as unknown;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const token =
    typeof body === 'object' && body !== null && 'token' in body && typeof body.token === 'string'
      ? body.token.trim()
      : '';
  const expectedToken = configuredToken?.trim();
  if (!expectedToken || !token || !tokensMatch(expectedToken, token)) {
    return unauthorized();
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        'cache-control': 'no-store',
        'set-cookie': sessionCookie(token, request, MONITOR_SESSION_MAX_AGE_SECONDS),
      },
    },
  );
}

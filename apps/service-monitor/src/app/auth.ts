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

export class RequestBodyTooLargeError extends Error {
  public constructor() {
    super('Request body is too large.');
    this.name = 'RequestBodyTooLargeError';
  }
}

export async function readRequestTextWithLimit(request: Request, maxBytes: number): Promise<string> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

interface SessionPayload {
  exp: number;
  nonce: string;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array | null {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return globalThis.crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

/**
 * Generate a stateless HMAC-SHA256 signed session token.
 */
export async function createSignedSessionToken(
  secret: string,
  maxAgeSeconds: number = MONITOR_SESSION_MAX_AGE_SECONDS,
): Promise<string> {
  const nonceBytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;

  const payload: SessionPayload = { exp, nonce };
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));

  const key = await getHmacKey(secret);
  const signatureBuffer = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  const signatureB64 = base64UrlEncode(new Uint8Array(signatureBuffer));

  return `${payloadB64}.${signatureB64}`;
}

/**
 * Verify a stateless HMAC-SHA256 signed session token against the secret and expiration.
 */
export async function verifySignedSessionToken(secret: string, token: string): Promise<boolean> {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;

  const payloadB64 = token.slice(0, dotIndex);
  const signatureB64 = token.slice(dotIndex + 1);
  if (!payloadB64 || !signatureB64) return false;

  const payloadBytes = base64UrlDecode(payloadB64);
  const signatureBytes = base64UrlDecode(signatureB64);
  if (!payloadBytes || !signatureBytes) return false;

  try {
    const payloadText = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadText) as Partial<SessionPayload>;
    if (typeof payload !== 'object' || payload === null) return false;
    if (typeof payload.exp !== 'number' || typeof payload.nonce !== 'string') return false;

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }

    const key = await getHmacKey(secret);
    return await globalThis.crypto.subtle.verify('HMAC', key, signatureBytes, new TextEncoder().encode(payloadB64));
  } catch {
    return false;
  }
}

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
export async function authorizeMonitorRequest(request: Request, configuredToken?: string): Promise<Response | null> {
  const expectedToken = configuredToken?.trim();
  if (!expectedToken) {
    return unauthorized();
  }

  const bearer = bearerValue(request);
  if (bearer && tokensMatch(expectedToken, bearer)) {
    return null;
  }

  const cookie = cookieValue(request, MONITOR_SESSION_COOKIE);
  if (cookie) {
    const valid = await verifySignedSessionToken(expectedToken, cookie);
    if (valid) {
      return null;
    }
  }

  return unauthorized();
}

/**
 * Establish or clear the browser session used by administrative API requests.
 * The API token is accepted only in the request body and is stored in an
 * HttpOnly, SameSite cookie so client code never needs to put it in a header.
 */
export async function handleMonitorSession(request: Request, configuredToken?: string): Promise<Response> {
  if (request.method === 'GET') {
    const authenticated = (await authorizeMonitorRequest(request, configuredToken)) === null;
    return Response.json({ authenticated }, { headers: { 'cache-control': 'no-store' } });
  }

  if (request.method === 'DELETE') {
    const authenticationFailure = await authorizeMonitorRequest(request, configuredToken);
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
    const text = await readRequestTextWithLimit(request, MAX_AUTH_REQUEST_BYTES);
    body = JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: error.message }, { status: 413 });
    }
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

  const sessionToken = await createSignedSessionToken(expectedToken, MONITOR_SESSION_MAX_AGE_SECONDS);

  return Response.json(
    { ok: true },
    {
      headers: {
        'cache-control': 'no-store',
        'set-cookie': sessionCookie(sessionToken, request, MONITOR_SESSION_MAX_AGE_SECONDS),
      },
    },
  );
}

import { connect } from 'cloudflare:sockets';

import { resolveMonitorValidationPolicy } from './config';
import { isAllowedMonitorHost, isAllowedMonitorUrl } from './validation';

import type { HealthState, MonitorTarget, ProbeType, Sample } from './types';
import type { MonitorValidationPolicy } from './validation';

/** Abort a probe that takes longer than this many milliseconds. */
const PROBE_TIMEOUT_MS = 8000;
const MAX_PROBE_RESPONSE_BYTES = 256 * 1024;
const MAX_REDIRECTS = 3;

/** Shared request headers so upstream services can identify the prober. */
const USER_AGENT = 'mission-platform-service-monitor/1.0';

/**
 * Run a single probe for one monitor, dispatching on its {@link ProbeType}.
 *
 * Implementations must never throw: a failed probe is returned as a
 * {@link Sample} with `state: 'down'` and a populated `error` so scheduling and
 * storage keep working regardless of the target's behaviour.
 */
export async function runProbe(target: MonitorTarget): Promise<Sample> {
  const type: ProbeType = target.type ?? 'http';
  const start = Date.now();
  const policy = resolveMonitorValidationPolicy();
  try {
    switch (type) {
      case 'http': {
        return await httpProbe(target, start, policy);
      }
      case 'json': {
        return await jsonProbe(target, start, policy);
      }
      case 'graphql': {
        return await graphqlProbe(target, start, policy);
      }
      case 'dns': {
        return await dnsProbe(target, start, policy);
      }
      case 'tcp':
      case 'mqtt':
      case 'network': {
        return await socketProbe(target, start, policy);
      }
      case 'udp':
      case 'ntp': {
        return unsupported(target, start, type);
      }
      default: {
        return unsupported(target, start, type);
      }
    }
  } catch (error) {
    return failed(target, start, error);
  }
}

/** Plain HTTP check classified by status code and latency. */
async function httpProbe(target: MonitorTarget, start: number, policy: MonitorValidationPolicy): Promise<Sample> {
  const url = requireUrl(target, policy);
  const response = await fetchWithRedirectPolicy(
    url,
    {
      method: target.method ?? 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: { 'user-agent': USER_AGENT },
    },
    policy,
  );
  await readResponseBody(response);
  const latencyMs = Date.now() - start;
  return sample(target, {
    state: classifyHttp(response.status, latencyMs, target.degradedAboveMs),
    status: response.status,
    latencyMs,
    error: response.ok ? null : `HTTP ${response.status}`,
  });
}

/**
 * Fetch a JSON health/liveness endpoint (`/health`, `/live`, …) and optionally
 * assert that the value at `jsonPath` equals `expect`. Reachable but unexpected
 * payloads are reported as `degraded` rather than `down`.
 */
async function jsonProbe(target: MonitorTarget, start: number, policy: MonitorValidationPolicy): Promise<Sample> {
  const url = requireUrl(target, policy);
  const response = await fetchWithRedirectPolicy(
    url,
    {
      method: target.method ?? 'GET',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
    },
    policy,
  );
  const latencyMs = Date.now() - start;
  if (!response.ok) {
    return sample(target, { state: 'down', status: response.status, latencyMs, error: `HTTP ${response.status}` });
  }

  const body: unknown = JSON.parse(await readResponseBody(response));
  if (target.jsonPath) {
    const actual = readPath(body, target.jsonPath);
    const expected = target.expect ?? 'ok';
    const matches = String(actual) === expected;
    return sample(target, {
      state: matches ? classifyHttp(response.status, latencyMs, target.degradedAboveMs) : 'degraded',
      status: response.status,
      latencyMs,
      error: matches ? null : `expected ${target.jsonPath}="${expected}", got "${String(actual)}"`,
    });
  }

  return sample(target, {
    state: classifyHttp(response.status, latencyMs, target.degradedAboveMs),
    status: response.status,
    latencyMs,
    error: null,
  });
}

/** POST a GraphQL query; fail on transport errors or a populated `errors` array. */
async function graphqlProbe(target: MonitorTarget, start: number, policy: MonitorValidationPolicy): Promise<Sample> {
  const url = requireUrl(target, policy);
  const query = target.query ?? '{ __typename }';
  const response = await fetchWithRedirectPolicy(
    url,
    {
      method: 'POST',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: { 'user-agent': USER_AGENT, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query }),
    },
    policy,
  );
  const latencyMs = Date.now() - start;
  if (!response.ok) {
    return sample(target, { state: 'down', status: response.status, latencyMs, error: `HTTP ${response.status}` });
  }

  const body = JSON.parse(await readResponseBody(response)) as { errors?: Array<{ message?: string }> };
  const errors = body.errors ?? [];
  if (errors.length > 0) {
    return sample(target, {
      state: 'degraded',
      status: response.status,
      latencyMs,
      error: errors[0]?.message ?? 'GraphQL errors',
    });
  }
  return sample(target, {
    state: classifyHttp(response.status, latencyMs, target.degradedAboveMs),
    status: response.status,
    latencyMs,
    error: null,
  });
}

/** Resolve a hostname via Cloudflare DNS-over-HTTPS (`application/dns-json`). */
async function dnsProbe(target: MonitorTarget, start: number, policy: MonitorValidationPolicy): Promise<Sample> {
  const host = requireHost(target, policy);
  const recordType = target.recordType ?? 'A';
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${encodeURIComponent(recordType)}`;
  const response = await fetchWithRedirectPolicy(url, {
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    headers: { accept: 'application/dns-json', 'user-agent': USER_AGENT },
  });
  const latencyMs = Date.now() - start;
  if (!response.ok) {
    return sample(target, { state: 'down', status: response.status, latencyMs, error: `HTTP ${response.status}` });
  }

  const body = JSON.parse(await readResponseBody(response)) as { Status?: number; Answer?: unknown[] };
  const resolved = body.Status === 0 && (body.Answer?.length ?? 0) > 0;
  return sample(target, {
    state: resolved ? classifyHttp(200, latencyMs, target.degradedAboveMs) : 'down',
    status: resolved ? 200 : 0,
    latencyMs,
    error: resolved ? null : `no ${recordType} record (DNS status ${body.Status ?? '?'})`,
  });
}

/**
 * Open a raw TCP connection to `host:port` and measure the time to the
 * handshake. Used for generic TCP reachability and MQTT broker checks (MQTT
 * runs over TCP; a successful connect confirms the broker is accepting
 * connections).
 */
async function socketProbe(target: MonitorTarget, start: number, policy: MonitorValidationPolicy): Promise<Sample> {
  const host = requireHost(target, policy);
  const port = target.port ?? (target.type === 'mqtt' ? 1883 : 443);
  if (!isAllowedMonitorHost(host, port, policy)) {
    throw new Error('monitor destination or port is not allowed');
  }
  const socket = connect({ hostname: host, port });
  try {
    await withTimeout(socket.opened, PROBE_TIMEOUT_MS, 'connect timeout');
    const latencyMs = Date.now() - start;
    return sample(target, {
      state: classifyHttp(200, latencyMs, target.degradedAboveMs),
      status: 200,
      latencyMs,
      error: null,
    });
  } finally {
    try {
      await socket.close();
    } catch {
      // Ignore close errors — the measurement is already complete.
    }
  }
}

/**
 * UDP-based checks (`udp`, `ntp`) cannot run on the Workers runtime, which only
 * exposes outbound TCP sockets. The monitor type still exists so it can be
 * configured, but it degrades gracefully to a stored error instead of throwing.
 */
function unsupported(target: MonitorTarget, start: number, type: ProbeType): Sample {
  return sample(target, {
    state: 'down',
    status: 0,
    latencyMs: Date.now() - start,
    error: `${type.toUpperCase()} probing is not supported on the Cloudflare Workers runtime (no outbound UDP).`,
  });
}

/** Build a `down` sample from a caught error. */
function failed(target: MonitorTarget, start: number, error: unknown): Sample {
  const message = error instanceof Error ? error.message : String(error);
  return sample(target, {
    state: 'down',
    status: 0,
    latencyMs: Date.now() - start,
    error: message.slice(0, 256),
  });
}

/** Assemble a {@link Sample}, stamping the service id and completion time. */
function sample(target: MonitorTarget, fields: Omit<Sample, 'service' | 'ts'>): Sample {
  return { service: target.id, ts: Date.now(), ...fields };
}

function requireUrl(target: MonitorTarget, policy: MonitorValidationPolicy): string {
  if (!target.url) {
    throw new Error(`monitor "${target.id}" is missing a url`);
  }
  if (!isAllowedMonitorUrl(target.url, policy)) {
    throw new Error('monitor destination is not allowed');
  }
  return target.url;
}

function requireHost(target: MonitorTarget, policy: MonitorValidationPolicy): string {
  if (!target.host) {
    throw new Error(`monitor "${target.id}" is missing a host`);
  }
  if (!isAllowedMonitorHost(target.host, target.port, policy)) {
    throw new Error('monitor destination is not allowed');
  }
  return target.host;
}

/** Fetch without allowing redirects to bypass the monitor destination policy. */
async function fetchWithRedirectPolicy(
  url: string,
  init: RequestInit,
  policy: MonitorValidationPolicy = {},
): Promise<Response> {
  let current = url;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(current, { ...init, redirect: 'manual' });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get('location');
    if (!location || redirect === MAX_REDIRECTS) throw new Error('redirect policy rejected the response');
    const next = new URL(location, current).toString();
    if (!isAllowedMonitorUrl(next, policy)) throw new Error('redirect destination is not allowed');
    current = next;
  }
  throw new Error('redirect policy rejected the response');
}

/** Read a probe response with a hard cap, including for chunked responses. */
async function readResponseBody(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length') ?? '');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PROBE_RESPONSE_BYTES) {
    throw new Error('probe response is too large');
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_PROBE_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error('probe response is too large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** Reject if `promise` does not settle within `ms` milliseconds. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);
}

/** Read a dot-separated path (e.g. `data.status`) out of a parsed JSON value. */
function readPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current !== null && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return;
  }, value);
}

/** Derive a health state from an HTTP status code and observed latency. */
export function classifyHttp(status: number, latencyMs: number, degradedAboveMs?: number): HealthState {
  if (status >= 500 || status === 0) {
    return 'down';
  }
  if (status >= 400) {
    return 'degraded';
  }
  if (degradedAboveMs !== undefined && latencyMs > degradedAboveMs) {
    return 'degraded';
  }
  return 'up';
}

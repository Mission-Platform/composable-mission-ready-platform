// Pure validation and normalisation for monitor configuration. This module is
// deliberately free of any Worker runtime dependency (no `cloudflare:workers`
// import) so it can be shared by both the server-side API and the React client,
// guaranteeing they accept exactly the same monitors.

import { PROBE_TYPES, type MonitorTarget, type ProbeType } from './types';

export const MIN_INTERVAL_SECONDS = 5;
const MAX_INTERVAL_SECONDS = 86_400;
export const MAX_MONITOR_REQUEST_BYTES = 64 * 1024;
export const MAX_MONITOR_ID_LENGTH = 128;
export const MAX_MONITOR_NAME_LENGTH = 200;
export const MAX_URL_LENGTH = 2048;
export const MAX_HOST_LENGTH = 253;
export const MAX_QUERY_LENGTH = 16_384;
export const MAX_JSON_PATH_LENGTH = 256;
export const MAX_EXPECT_LENGTH = 512;

export interface MonitorValidationPolicy {
  allowPrivateDestinations?: boolean;
  allowedDestinations?: readonly string[];
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname
    .toLowerCase()
    .replaceAll(/[\[\]]/g, '')
    .replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  if (/^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(host) || /^10\.(?:\d{1,3}\.){2}\d{1,3}$/.test(host)) return true;
  const private172 = /^172\.(\d{1,3})\.(?:\d{1,3}\.)\d{1,3}$/.exec(host);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return true;
  if (/^192\.168\.(?:\d{1,3}\.)\d{1,3}$/.test(host) || /^169\.254\./.test(host)) return true;
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return true;
  return false;
}

function isAllowedDestination(hostname: string, policy: MonitorValidationPolicy): boolean {
  if (policy.allowPrivateDestinations !== true && isPrivateHost(hostname)) return false;
  const allowed = policy.allowedDestinations ?? [];
  if (allowed.length === 0) return true;
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return allowed.some((entry) => {
    const candidate = entry.toLowerCase().replace(/\.$/, '');
    return candidate.startsWith('*.') ? host.endsWith(candidate.slice(1)) : host === candidate;
  });
}

/** Validate an HTTP destination used by a monitor or a redirect. */
export function isAllowedMonitorUrl(value: string, policy: MonitorValidationPolicy = {}): boolean {
  if (value.length > MAX_URL_LENGTH) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && !(policy.allowPrivateDestinations === true && url.protocol === 'http:'))
      return false;
    if (url.username || url.password) return false;
    if (url.port) {
      const port = Number(url.port);
      if (
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65_535 ||
        (policy.allowPrivateDestinations !== true && port !== 443)
      )
        return false;
    }
    return isAllowedDestination(url.hostname, policy);
  } catch {
    return false;
  }
}

/** Validate a socket/DNS destination and its explicitly configured port. */
export function isAllowedMonitorHost(hostname: string, port?: number, policy: MonitorValidationPolicy = {}): boolean {
  if (!hostname || hostname.length > MAX_HOST_LENGTH || /[^a-zA-Z0-9.:[\]-]/.test(hostname)) return false;
  if (!isAllowedDestination(hostname, policy)) return false;
  if (
    port !== undefined &&
    (!Number.isInteger(port) ||
      port < 1 ||
      port > 65_535 ||
      (policy.allowPrivateDestinations !== true && ![53, 80, 123, 443, 1883, 8883].includes(port)))
  )
    return false;
  return true;
}

function isProbeType(value: unknown): value is ProbeType {
  return typeof value === 'string' && (PROBE_TYPES as readonly string[]).includes(value);
}

/** Clamp a per-monitor interval into the allowed range, or return `undefined`. */
export function clampInterval(seconds: number | undefined): number | undefined {
  if (seconds === undefined || !Number.isFinite(seconds)) {
    return undefined;
  }
  return Math.min(Math.max(Math.round(seconds), MIN_INTERVAL_SECONDS), MAX_INTERVAL_SECONDS);
}

/**
 * Validate and normalise an untrusted monitor configuration coming from the
 * API. Returns a clean {@link MonitorTarget} or `null` when the payload is not
 * usable (missing id/name, or missing the field its probe type requires).
 */
export function sanitizeMonitor(value: unknown, policy: MonitorValidationPolicy = {}): MonitorTarget | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!id || !name || id.length > MAX_MONITOR_ID_LENGTH || name.length > MAX_MONITOR_NAME_LENGTH) {
    return null;
  }

  const type: ProbeType = isProbeType(raw.type) ? raw.type : 'http';
  const target: MonitorTarget = { id, name, type };

  const interval = clampInterval(typeof raw.intervalSeconds === 'number' ? raw.intervalSeconds : undefined);
  if (interval !== undefined) {
    target.intervalSeconds = interval;
  }
  if (typeof raw.degradedAboveMs === 'number' && Number.isFinite(raw.degradedAboveMs) && raw.degradedAboveMs > 0) {
    target.degradedAboveMs = Math.min(Math.round(raw.degradedAboveMs), 120_000);
  }

  if (type === 'http' || type === 'json' || type === 'graphql') {
    if (typeof raw.url !== 'string' || !raw.url.trim() || !isAllowedMonitorUrl(raw.url.trim(), policy)) {
      return null;
    }
    target.url = raw.url.trim();
    if (typeof raw.method === 'string' && raw.method.trim()) {
      const method = raw.method.trim().toUpperCase();
      if (!['GET', 'HEAD', 'POST'].includes(method)) return null;
      target.method = method;
    }
  }
  if (type === 'json') {
    if (typeof raw.jsonPath === 'string' && raw.jsonPath.length > MAX_JSON_PATH_LENGTH) return null;
    if (typeof raw.expect === 'string' && raw.expect.length > MAX_EXPECT_LENGTH) return null;
    if (typeof raw.jsonPath === 'string' && raw.jsonPath.trim()) {
      target.jsonPath = raw.jsonPath.trim();
    }
    if (typeof raw.expect === 'string') {
      target.expect = raw.expect;
    }
  }
  if (type === 'graphql') {
    if (typeof raw.query === 'string' && raw.query.length > MAX_QUERY_LENGTH) return null;
    if (typeof raw.query === 'string' && raw.query.trim()) target.query = raw.query.trim();
  }
  if (type === 'dns' || type === 'tcp' || type === 'mqtt' || type === 'udp' || type === 'ntp' || type === 'network') {
    if (typeof raw.host !== 'string' || !raw.host.trim()) {
      return null;
    }
    target.host = raw.host.trim();
  }
  if (type === 'dns' && typeof raw.recordType === 'string' && raw.recordType.trim()) {
    target.recordType = raw.recordType.trim().toUpperCase();
  }
  if (
    (type === 'tcp' || type === 'mqtt' || type === 'udp' || type === 'ntp' || type === 'network') &&
    typeof raw.port === 'number'
  ) {
    const port = Math.round(raw.port);
    if (!isAllowedMonitorHost(target.host, port, policy)) return null;
    target.port = port;
  }
  if (target.host && !isAllowedMonitorHost(target.host, target.port, policy)) return null;
  if (typeof raw.autoIncident === 'boolean') target.autoIncident = raw.autoIncident;
  if (typeof raw.failThreshold === 'number' && Number.isFinite(raw.failThreshold) && raw.failThreshold > 0)
    target.failThreshold = Math.round(raw.failThreshold);
  if (typeof raw.successThreshold === 'number' && Number.isFinite(raw.successThreshold) && raw.successThreshold > 0)
    target.successThreshold = Math.round(raw.successThreshold);

  return target;
}

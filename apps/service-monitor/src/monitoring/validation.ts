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

type IPv4 = readonly [number, number, number, number];
type IPv6 = readonly [number, number, number, number, number, number, number, number];
const LEGACY_IPV4_PART = /^(?:0[xX][0-9a-fA-F]+|0[0-7]*|[0-9]+)$/;

function parseIpv6Part(part: string): number | null {
  if (!/^[0-9a-fA-F]{1,4}$/.test(part)) return null;
  const number = Number.parseInt(part, 16);
  return number <= 0xff_ff ? number : null;
}

function isLegacyIpv4Literal(value: string): boolean {
  const parts = value.split('.');
  return parts.length <= 4 && parts.every((part) => LEGACY_IPV4_PART.test(part));
}

function parseLegacyIpv4(value: string): IPv4 | null {
  const parts = value.split('.');
  if (!isLegacyIpv4Literal(value)) {
    return null;
  }

  const numbers = parts.map((part) => {
    if (/^0[xX]/.test(part)) return Number.parseInt(part.slice(2), 16);
    if (part.length > 1 && part.startsWith('0')) return Number.parseInt(part, 8);
    return Number.parseInt(part, 10);
  });
  const limits = [0xff, 0xff_ff_ff, 0xff_ff_ff_ff];
  if (numbers.some((number) => !Number.isSafeInteger(number) || number < 0)) return null;

  let address: number;
  switch (numbers.length) {
    case 1: {
      address = numbers[0];
      break;
    }
    case 2: {
      if (numbers[0] > 0xff || numbers[1] > limits[1]) return null;
      address = numbers[0] * 0x1_00_00_00 + numbers[1];
      break;
    }
    case 3: {
      if (numbers[0] > 0xff || numbers[1] > 0xff || numbers[2] > limits[0]) return null;
      address = numbers[0] * 0x1_00_00_00 + numbers[1] * 0x1_00_00 + numbers[2];
      break;
    }
    case 4: {
      if (numbers.some((number) => number > 0xff)) return null;
      address = numbers[0] * 0x1_00_00_00 + numbers[1] * 0x1_00_00 + numbers[2] * 0x1_00 + numbers[3];
      break;
    }
  }
  if (address > 0xff_ff_ff_ff) return null;
  return [(address >>> 24) & 0xff, (address >>> 16) & 0xff, (address >>> 8) & 0xff, address & 0xff];
}

function parseIpv6(value: string): IPv6 | null {
  let host = value;
  if (host.includes('.')) {
    const separator = host.lastIndexOf(':');
    if (separator === -1) return null;
    const ipv4 = parseLegacyIpv4(host.slice(separator + 1));
    if (!ipv4 || host.slice(separator + 1).split('.').length !== 4) return null;
    host = `${host.slice(0, separator)}:${((ipv4[0] << 8) | ipv4[1]).toString(16)}:${((ipv4[2] << 8) | ipv4[3]).toString(16)}`;
  }

  const halves = host.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const leftValues = left.map(parseIpv6Part);
  const rightValues = right.map(parseIpv6Part);
  if (leftValues.includes(null) || rightValues.includes(null)) return null;
  if (halves.length === 1 && leftValues.length !== 8) return null;
  if (halves.length === 2 && leftValues.length + rightValues.length >= 8) return null;
  const zeros = halves.length === 2 ? Array.from({ length: 8 - leftValues.length - rightValues.length }).fill(0) : [];
  return [...leftValues, ...zeros, ...rightValues] as IPv6;
}

function isPrivateIpv4([first, second]: IPv4): boolean {
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isPrivateIpv6(address: IPv6): boolean {
  const [first, second, third, fourth, fifth, sixth, seventh, eighth] = address;
  const isUnspecified = address.every((part) => part === 0);
  const isUniqueLocal = (first & 0xfe_00) === 0xfc_00;
  const isLinkLocal = (first & 0xff_c0) === 0xfe_80;
  const isMulticast = (first & 0xff_00) === 0xff_00;
  const isIpv4Mapped = first === 0 && second === 0 && third === 0 && fourth === 0 && fifth === 0 && sixth === 0xff_ff;
  const isIpv4Compatible = first === 0 && second === 0 && third === 0 && fourth === 0 && fifth === 0 && sixth === 0;
  const embeddedIpv4: IPv4 = [(seventh >>> 8) & 0xff, seventh & 0xff, (eighth >>> 8) & 0xff, eighth & 0xff];
  const isPrivateEmbeddedIpv4 = (isIpv4Mapped || isIpv4Compatible) && isPrivateIpv4(embeddedIpv4);
  return isUnspecified || isUniqueLocal || isLinkLocal || isMulticast || isPrivateEmbeddedIpv4;
}

function normaliseDestinationHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '').replace(/\.$/, '');
}

function isPrivateHost(hostname: string): boolean {
  const host = normaliseDestinationHost(hostname);
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  const ipv4 = parseLegacyIpv4(host);
  if (ipv4) return isPrivateIpv4(ipv4);
  const ipv6 = parseIpv6(host);
  if (ipv6) return isPrivateIpv6(ipv6);

  const labels = host.split('.');
  for (let start = 0; start < labels.length; start += 1) {
    for (let count = 2; count <= 4 && start + count <= labels.length; count += 1) {
      const candidate = labels.slice(start, start + count).join('.');
      const embedded = parseLegacyIpv4(candidate);
      if (embedded && isPrivateIpv4(embedded)) return true;
    }
  }
  return false;
}

function isAllowedDestination(hostname: string, policy: MonitorValidationPolicy): boolean {
  if (policy.allowPrivateDestinations !== true && isPrivateHost(hostname)) return false;
  const allowed = policy.allowedDestinations ?? [];
  if (allowed.length === 0) return true;
  const host = normaliseDestinationHost(hostname);
  return allowed.some((entry) => {
    const candidate = normaliseDestinationHost(entry);
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
  const host = hostname.trim();
  if (!host || host.length > MAX_HOST_LENGTH) return false;
  const bracketed = host.startsWith('[') || host.endsWith(']');
  if (bracketed && (!host.startsWith('[') || !host.endsWith(']'))) return false;
  const unbracketed = bracketed ? host.slice(1, -1) : host;
  const isIpv6 = unbracketed.includes(':');
  const isIpv4Literal = isLegacyIpv4Literal(unbracketed);
  const validDns = unbracketed
    .replace(/\.$/, '')
    .split('.')
    .every(
      (label) => label.length > 0 && label.length <= 63 && /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label),
    );
  if (
    (isIpv6 && (!parseIpv6(unbracketed) || (!host.startsWith('[') && host.includes(']')))) ||
    (isIpv4Literal && !parseLegacyIpv4(unbracketed)) ||
    (!isIpv6 && !isIpv4Literal && !validDns)
  )
    return false;
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

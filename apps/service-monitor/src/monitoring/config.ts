import { env } from 'cloudflare:workers';

import { PROBE_TYPES, type MonitorTarget, type ProbeType } from './types';

/**
 * Built-in targets used when `MONITOR_TARGETS` is not configured. These point
 * at well-known public endpoints — using a mix of probe types — so the
 * dashboard is populated out of the box during local development.
 */
export const DEFAULT_TARGETS: readonly MonitorTarget[] = [
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    type: 'http',
    url: 'https://www.cloudflare.com/cdn-cgi/trace',
    degradedAboveMs: 800,
  },
  {
    id: 'github',
    name: 'GitHub API',
    type: 'http',
    url: 'https://api.github.com/zen',
    degradedAboveMs: 1000,
  },
  {
    id: 'npm',
    name: 'npm registry',
    type: 'http',
    url: 'https://registry.npmjs.org/-/ping',
    degradedAboveMs: 1000,
  },
  {
    id: 'countries-graphql',
    name: 'Countries GraphQL',
    type: 'graphql',
    url: 'https://countries.trevorblades.com/',
    query: '{ country(code: "US") { name } }',
    intervalSeconds: 60,
    degradedAboveMs: 1500,
  },
  {
    id: 'dns-example',
    name: 'DNS · example.com',
    type: 'dns',
    host: 'example.com',
    recordType: 'A',
    intervalSeconds: 120,
  },
];

export const DEFAULT_INTERVAL_SECONDS = 30;
export const MIN_INTERVAL_SECONDS = 5;
const MAX_INTERVAL_SECONDS = 86_400;
const DEFAULT_RETENTION_HOURS = 24;

const DEFAULT_SPEED_INTERVAL_SECONDS = 300;
const MIN_SPEED_INTERVAL_SECONDS = 30;
const DEFAULT_SPEED_BYTES = 10_000_000;
const MIN_SPEED_BYTES = 100_000;

function isProbeType(value: unknown): value is ProbeType {
  return typeof value === 'string' && (PROBE_TYPES as readonly string[]).includes(value);
}

function isTarget(value: unknown): value is MonitorTarget {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.name === 'string';
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
export function sanitizeMonitor(value: unknown): MonitorTarget | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!id || !name) {
    return null;
  }

  const type: ProbeType = isProbeType(raw.type) ? raw.type : 'http';
  const target: MonitorTarget = { id, name, type };

  const interval = clampInterval(typeof raw.intervalSeconds === 'number' ? raw.intervalSeconds : undefined);
  if (interval !== undefined) {
    target.intervalSeconds = interval;
  }
  if (typeof raw.degradedAboveMs === 'number' && raw.degradedAboveMs > 0) {
    target.degradedAboveMs = raw.degradedAboveMs;
  }

  if (type === 'http' || type === 'json' || type === 'graphql') {
    if (typeof raw.url !== 'string' || !raw.url.trim()) {
      return null;
    }
    target.url = raw.url.trim();
    if (typeof raw.method === 'string' && raw.method.trim()) {
      target.method = raw.method.trim().toUpperCase();
    }
  }
  if (type === 'json') {
    if (typeof raw.jsonPath === 'string' && raw.jsonPath.trim()) {
      target.jsonPath = raw.jsonPath.trim();
    }
    if (typeof raw.expect === 'string') {
      target.expect = raw.expect;
    }
  }
  if (type === 'graphql' && typeof raw.query === 'string' && raw.query.trim()) {
    target.query = raw.query.trim();
  }
  if (type === 'dns' || type === 'tcp' || type === 'mqtt' || type === 'udp' || type === 'ntp') {
    if (typeof raw.host !== 'string' || !raw.host.trim()) {
      return null;
    }
    target.host = raw.host.trim();
  }
  if (type === 'dns' && typeof raw.recordType === 'string' && raw.recordType.trim()) {
    target.recordType = raw.recordType.trim().toUpperCase();
  }
  if ((type === 'tcp' || type === 'mqtt' || type === 'udp' || type === 'ntp') && typeof raw.port === 'number') {
    target.port = Math.round(raw.port);
  }

  return target;
}

/** Resolve the effective list of targets from the environment (or defaults). */
export function resolveTargets(): MonitorTarget[] {
  const raw = env.MONITOR_TARGETS?.trim();
  if (!raw) {
    return [...DEFAULT_TARGETS];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const targets = parsed.filter(isTarget);
      if (targets.length > 0) {
        return targets;
      }
    }
    console.warn('MONITOR_TARGETS did not contain any valid targets; falling back to defaults.');
  } catch (error) {
    console.warn('Failed to parse MONITOR_TARGETS; falling back to defaults.', error);
  }

  return [...DEFAULT_TARGETS];
}

/** Parse a positive integer environment variable, clamping to a minimum. */
function parsePositiveInt(value: string | undefined, fallback: number, minimum: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < minimum) {
    return fallback;
  }
  return parsed;
}

/** Effective probe interval in seconds. */
export function resolveIntervalSeconds(): number {
  return parsePositiveInt(env.MONITOR_INTERVAL_SECONDS, DEFAULT_INTERVAL_SECONDS, MIN_INTERVAL_SECONDS);
}

/** Effective retention window in milliseconds. */
export function resolveRetentionMs(): number {
  const hours = parsePositiveInt(env.MONITOR_RETENTION_HOURS, DEFAULT_RETENTION_HOURS, 1);
  return hours * 60 * 60 * 1000;
}

/** Whether scheduled speed testing is enabled (defaults to enabled). */
export function resolveSpeedEnabled(): boolean {
  return env.SPEED_TEST_ENABLED?.trim().toLowerCase() !== 'false';
}

/** Effective interval between scheduled speed tests, in seconds. */
export function resolveSpeedIntervalSeconds(): number {
  return parsePositiveInt(env.SPEED_TEST_INTERVAL_SECONDS, DEFAULT_SPEED_INTERVAL_SECONDS, MIN_SPEED_INTERVAL_SECONDS);
}

/** Effective payload size for each download measurement, in bytes. */
export function resolveSpeedBytes(): number {
  return parsePositiveInt(env.SPEED_TEST_BYTES, DEFAULT_SPEED_BYTES, MIN_SPEED_BYTES);
}

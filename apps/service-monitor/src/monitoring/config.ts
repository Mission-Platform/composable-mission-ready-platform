import { env } from 'cloudflare:workers';

import { MIN_INTERVAL_SECONDS } from './validation';

import type { MonitorTarget } from './types';

// Re-exported so existing server-side importers (`@/monitoring/config`) keep
// working; the definition lives in the runtime-free `./validation` module so
// the React client can share it without pulling in `cloudflare:workers`.
export { sanitizeMonitor } from './validation';

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
    name: 'GitHub API health',
    type: 'json',
    url: 'https://api.github.com/meta',
    jsonPath: 'verifiable_password_authentication',
    expect: 'true',
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
    id: 'automated-incident-example',
    name: 'Automated incident · example.com',
    type: 'http',
    url: 'https://example.com/',
    intervalSeconds: 60,
    degradedAboveMs: 1000,
    autoIncident: true,
    failThreshold: 3,
    successThreshold: 2,
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
  {
    id: 'tcp-example',
    name: 'TCP · example.com HTTPS',
    type: 'tcp',
    host: 'example.com',
    port: 443,
    intervalSeconds: 60,
  },
  {
    id: 'mqtt-example',
    name: 'MQTT · Mosquitto test broker',
    type: 'mqtt',
    host: 'test.mosquitto.org',
    port: 1883,
    intervalSeconds: 60,
  },
  {
    id: 'udp-example',
    name: 'UDP · Cloudflare DNS',
    type: 'udp',
    host: '1.1.1.1',
    port: 53,
    intervalSeconds: 120,
  },
  {
    id: 'ntp-example',
    name: 'NTP · Cloudflare',
    type: 'ntp',
    host: 'time.cloudflare.com',
    port: 123,
    intervalSeconds: 120,
  },
  {
    id: 'network-example',
    name: 'Network · Cloudflare',
    type: 'network',
    host: 'cloudflare.com',
    port: 443,
    degradedAboveMs: 250,
    intervalSeconds: 60,
    autoIncident: true,
    failThreshold: 3,
    successThreshold: 2,
  },
];

export const DEFAULT_INTERVAL_SECONDS = 30;
const DEFAULT_RETENTION_HOURS = 24;

const DEFAULT_SPEED_INTERVAL_SECONDS = 300;
const MIN_SPEED_INTERVAL_SECONDS = 30;
const DEFAULT_SPEED_BYTES = 10_000_000;
const MIN_SPEED_BYTES = 100_000;

function isTarget(value: unknown): value is MonitorTarget {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.name === 'string';
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

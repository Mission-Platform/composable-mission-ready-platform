// Pure validation and normalisation for monitor configuration. This module is
// deliberately free of any Worker runtime dependency (no `cloudflare:workers`
// import) so it can be shared by both the server-side API and the React client,
// guaranteeing they accept exactly the same monitors.

import { PROBE_TYPES, type MonitorTarget, type ProbeType } from './types';

export const MIN_INTERVAL_SECONDS = 5;
const MAX_INTERVAL_SECONDS = 86_400;

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
    target.port = Math.round(raw.port);
  }
  if (typeof raw.autoIncident === 'boolean') target.autoIncident = raw.autoIncident;
  if (typeof raw.failThreshold === 'number' && raw.failThreshold > 0)
    target.failThreshold = Math.round(raw.failThreshold);
  if (typeof raw.successThreshold === 'number' && raw.successThreshold > 0)
    target.successThreshold = Math.round(raw.successThreshold);

  return target;
}

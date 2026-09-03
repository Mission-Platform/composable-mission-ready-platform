// Shared types for the service-monitoring domain. These are used by both the
// server-side Durable Object and the React client, so they intentionally avoid
// any runtime dependency on the Worker environment.

/**
 * The kind of check a monitor performs. HTTP is no longer the only metric:
 *
 * - `http`     — plain request, classified by status code.
 * - `json`     — request a JSON endpoint (e.g. `/health`, `/live`) and assert a
 *                field equals an expected value.
 * - `graphql`  — POST a GraphQL query and fail on transport or `errors`.
 * - `dns`      — resolve a hostname via DNS-over-HTTPS (Cloudflare 1.1.1.1).
 * - `tcp`      — open a raw TCP connection to `host:port` (reachability).
 * - `mqtt`     — TCP reachability of an MQTT broker's `host:port`.
 * - `udp`      — UDP reachability (unsupported on the Workers runtime).
 * - `ntp`      — NTP time sync over UDP (unsupported on the Workers runtime).
 * - `network`  — TCP ping/latency paired with the bandwidth test subsystem.
 */
export type ProbeType = 'http' | 'json' | 'graphql' | 'dns' | 'tcp' | 'mqtt' | 'udp' | 'ntp' | 'network';

/** All supported probe types, in display order. */
export const PROBE_TYPES: readonly ProbeType[] = [
  'http',
  'json',
  'graphql',
  'dns',
  'tcp',
  'mqtt',
  'udp',
  'ntp',
  'network',
];

/** A service the platform should keep an eye on. */
export interface MonitorTarget {
  /** Stable identifier, also used as the time-series key. */
  id: string;
  /** Human-friendly label shown in the dashboard. */
  name: string;
  /** Which kind of probe to run. Defaults to `http` when omitted. */
  type?: ProbeType;
  /**
   * How often, in seconds, this monitor is probed. Each monitor keeps its own
   * cadence; when omitted the global `MONITOR_INTERVAL_SECONDS` is used.
   */
  intervalSeconds?: number;
  /** Absolute URL polled for `http` / `json` / `graphql` probes. */
  url?: string;
  /** Optional HTTP method override (defaults to `GET`). */
  method?: string;
  /** Highest latency, in milliseconds, still considered healthy. */
  degradedAboveMs?: number;
  /** Hostname for `dns` / `tcp` / `mqtt` / `udp` / `ntp` probes. */
  host?: string;
  /** Port for `tcp` / `mqtt` / `udp` / `ntp` probes. */
  port?: number;
  /** GraphQL query string for `graphql` probes. */
  query?: string;
  /** Dot-separated path into the JSON body for `json` probes (e.g. `status`). */
  jsonPath?: string;
  /** Expected value (string compared) at `jsonPath` for `json` probes. */
  expect?: string;
  /** DNS record type for `dns` probes (defaults to `A`). */
  recordType?: string;
  /** Whether repeated failures should automatically open an incident. */
  autoIncident?: boolean;
  /** Consecutive failures required before an automatic incident opens. */
  failThreshold?: number;
  /** Consecutive healthy checks required before an automatic incident resolves. */
  successThreshold?: number;
}

/** The intentionally small monitor shape safe to expose to public clients. */
export interface PublicMonitorTarget {
  id: string;
  name: string;
  type: ProbeType;
}

export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';
export type IncidentSeverity = 'minor' | 'major' | 'critical';

export interface IncidentUpdate {
  id: string;
  incidentId: string;
  message: string;
  status: IncidentStatus | null;
  createdAt: number;
}

export interface Incident {
  id: string;
  serviceId: string | null;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  openedAt: number;
  resolvedAt: number | null;
  automatic: boolean;
  updates: IncidentUpdate[];
  postIncidentReport: string | null;
}

export type MaintenanceStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  serviceId: string | null;
  startsAt: number;
  endsAt: number;
  cancelledAt: number | null;
  createdAt: number;
}

/** Health classification derived from a single probe. */
export type HealthState = 'up' | 'degraded' | 'down';

/** A single point in the time series for one target. */
export interface Sample {
  /** Target id this sample belongs to. */
  service: string;
  /** Unix epoch milliseconds when the probe completed. */
  ts: number;
  /** Derived health state. */
  state: HealthState;
  /** HTTP status code, or `0` when the request never completed. */
  status: number;
  /** Round-trip latency in milliseconds. */
  latencyMs: number;
  /** Error message when the probe failed, otherwise `null`. */
  error: string | null;
}

/** Rolled-up view of a target's current condition. */
export interface ServiceStatus {
  target: PublicMonitorTarget;
  /** Most recent sample, or `null` when no probe has run yet. */
  latest: Sample | null;
  /** Uptime ratio (0..1) across the retained window. */
  uptime: number;
  /** Average latency in milliseconds across the retained window. */
  avgLatencyMs: number;
  /** Number of samples the roll-up is based on. */
  sampleCount: number;
}

/** Project a private monitor configuration into the public status contract. */
export function toPublicMonitorTarget(target: MonitorTarget): PublicMonitorTarget {
  return { id: target.id, name: target.name, type: target.type ?? 'http' };
}

/** Payload returned by `GET /api/services`. */
export interface ServicesResponse {
  /** Server clock at response time (epoch ms). */
  now: number;
  /** Configured check interval, in seconds. */
  intervalSeconds: number;
  services: ServiceStatus[];
}

/** Payload returned by `GET /api/metrics`. */
export interface MetricsResponse {
  service: string;
  now: number;
  since: number;
  samples: Sample[];
}

/** Payload returned by `GET /api/monitors` — the runtime monitor configuration. */
export interface MonitorsResponse {
  /** Global default interval used when a monitor omits `intervalSeconds`. */
  defaultIntervalSeconds: number;
  monitors: MonitorTarget[];
}

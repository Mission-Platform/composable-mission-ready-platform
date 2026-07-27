import { DurableObject } from 'cloudflare:workers';

import {
  resolveIntervalSeconds,
  resolveRetentionMs,
  resolveSpeedBytes,
  resolveSpeedEnabled,
  resolveSpeedIntervalSeconds,
  resolveTargets,
} from './config';
import { runProbe } from './probes';
import { SPEED_PROVIDER_META, SPEED_PROVIDERS } from './speed/providers';

import type { SpeedProviderId, SpeedResult, SpeedStatus } from './speed/types';
import type {
  HealthState,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  IncidentUpdate,
  MaintenanceWindow,
  MonitorTarget,
  Sample,
  ServiceStatus,
} from './types';

/** Storage key holding the timestamp of the last completed speed-test run. */
const LAST_SPEED_TEST_KEY = 'lastSpeedTestAt';

/** Never schedule the next alarm sooner than this, to avoid a hot loop. */
const MIN_ALARM_DELAY_MS = 1000;

/** Row shape as stored in the Durable Object's SQLite database. */
type SampleRow = {
  service: string;
  ts: number;
  state: string;
  status: number;
  latency_ms: number;
  error: string | null;
  // Index signature required by the typed `sql.exec<T>()` cursor.
  [column: string]: SqlStorageValue;
};

/** Row shape for a stored speed-test measurement. */
type SpeedRow = {
  provider: string;
  ts: number;
  download_mbps: number;
  upload_mbps: number | null;
  latency_ms: number;
  bytes: number;
  ok: number;
  error: string | null;
  [column: string]: SqlStorageValue;
};

/** Row shape for a runtime monitor configuration. */
type MonitorRow = {
  id: string;
  config: string;
  last_run_at: number;
  [column: string]: SqlStorageValue;
};

type IncidentRow = {
  id: string;
  service_id: string | null;
  title: string;
  description: string;
  status: string;
  severity: string;
  opened_at: number;
  resolved_at: number | null;
  automatic: number;
  post_incident_report: string | null;
  [column: string]: SqlStorageValue;
};

type IncidentUpdateRow = {
  id: string;
  incident_id: string;
  message: string;
  status: string | null;
  created_at: number;
  [column: string]: SqlStorageValue;
};
type MaintenanceRow = {
  id: string;
  title: string;
  description: string;
  service_id: string | null;
  starts_at: number;
  ends_at: number;
  cancelled_at: number | null;
  created_at: number;
  [column: string]: SqlStorageValue;
};

/** A monitor plus its scheduling bookkeeping. */
interface ScheduledMonitor {
  target: MonitorTarget;
  lastRunAt: number;
}

/**
 * Server-side monitoring engine.
 *
 * A single global instance runs on Cloudflare's edge and owns an embedded
 * SQLite database that acts as the time-series store. Monitor configuration is
 * itself stored in the database (seeded from the environment) so it can be
 * changed at runtime through the API. A Durable Object alarm fires whenever the
 * next monitor is due — each monitor keeps its own cadence — probes the monitors
 * that are ready, and appends one {@link Sample} per monitor to the series. All
 * monitoring therefore happens on the server; clients only ever read results
 * over the JSON API.
 */
export class MonitorDurableObject extends DurableObject<Env> {
  constructor(context: DurableObjectState, environment: Env) {
    super(context, environment);

    // Ensure the schema exists, monitors are seeded and an alarm is scheduled
    // before any request is served by this instance.
    void this.ctx.blockConcurrencyWhile(async () => {
      this.migrate();
      this.seedMonitors();
      await this.rescheduleAlarm();
    });
  }

  /** Create the time-series tables and supporting indexes if they do not exist. */
  private migrate(): void {
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT NOT NULL,
        ts INTEGER NOT NULL,
        state TEXT NOT NULL,
        status INTEGER NOT NULL,
        latency_ms REAL NOT NULL,
        error TEXT
      );`,
    );
    this.ctx.storage.sql.exec(`CREATE INDEX IF NOT EXISTS idx_samples_service_ts ON samples (service, ts);`);

    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS speed_samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        ts INTEGER NOT NULL,
        download_mbps REAL NOT NULL,
        upload_mbps REAL,
        latency_ms REAL NOT NULL,
        bytes INTEGER NOT NULL,
        ok INTEGER NOT NULL,
        error TEXT
      );`,
    );
    this.ctx.storage.sql.exec(`CREATE INDEX IF NOT EXISTS idx_speed_provider_ts ON speed_samples (provider, ts);`);

    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS monitors (
        id TEXT PRIMARY KEY,
        config TEXT NOT NULL,
        last_run_at INTEGER NOT NULL DEFAULT 0
      );`,
    );
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY, service_id TEXT, title TEXT NOT NULL, description TEXT NOT NULL,
        status TEXT NOT NULL, severity TEXT NOT NULL, opened_at INTEGER NOT NULL,
        resolved_at INTEGER, automatic INTEGER NOT NULL DEFAULT 0, post_incident_report TEXT
      );`,
    );
    const incidentColumns = this.ctx.storage.sql.exec<{ name: string }>(`PRAGMA table_info(incidents);`).toArray();
    if (!incidentColumns.some((column) => column.name === 'post_incident_report')) {
      this.ctx.storage.sql.exec(`ALTER TABLE incidents ADD COLUMN post_incident_report TEXT;`);
    }
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS incident_updates (
        id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, message TEXT NOT NULL, status TEXT,
        created_at INTEGER NOT NULL, FOREIGN KEY (incident_id) REFERENCES incidents(id)
      );`,
    );
    this.ctx.storage.sql.exec(
      `CREATE INDEX IF NOT EXISTS idx_incident_updates_incident ON incident_updates (incident_id, created_at);`,
    );
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS maintenance_windows (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, service_id TEXT,
        starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL, cancelled_at INTEGER, created_at INTEGER NOT NULL
      );`,
    );
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS probe_counters (
        service_id TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0, successes INTEGER NOT NULL DEFAULT 0
      );`,
    );
  }

  /** Populate the monitors table from the environment defaults when empty. */
  private seedMonitors(): void {
    const count = this.ctx.storage.sql.exec<{ n: number }>(`SELECT COUNT(*) AS n FROM monitors;`).one().n;
    if (count > 0) {
      return;
    }
    for (const target of resolveTargets()) {
      this.writeMonitor(target, 0);
    }
  }

  // ── Scheduling ─────────────────────────────────────────────────────────────

  /** Global default interval (ms) applied to monitors without their own. */
  private defaultIntervalMs(): number {
    return resolveIntervalSeconds() * 1000;
  }

  /** Interval (ms) for a single monitor, falling back to the global default. */
  private intervalMsFor(target: MonitorTarget): number {
    return (target.intervalSeconds ?? resolveIntervalSeconds()) * 1000;
  }

  /**
   * Set the alarm to fire when the next monitor (or the next speed test) is due.
   * Called after every run and whenever the configuration changes.
   */
  private async rescheduleAlarm(): Promise<void> {
    const now = Date.now();
    const candidates: number[] = [];

    for (const { target, lastRunAt } of this.loadMonitors()) {
      candidates.push(lastRunAt + this.intervalMsFor(target));
    }

    if (resolveSpeedEnabled()) {
      const lastSpeed = (await this.ctx.storage.get<number>(LAST_SPEED_TEST_KEY)) ?? 0;
      candidates.push(lastSpeed + resolveSpeedIntervalSeconds() * 1000);
    }

    // Fall back to the default cadence when there is nothing to schedule.
    const next = candidates.length > 0 ? Math.min(...candidates) : now + this.defaultIntervalMs();
    await this.ctx.storage.setAlarm(Math.max(next, now + MIN_ALARM_DELAY_MS));
  }

  /** Durable Object alarm handler: probe every due monitor, then re-arm. */
  override async alarm(): Promise<void> {
    try {
      await this.runDueChecks();
      this.prune();
      await this.maybeRunSpeedTests();
    } finally {
      // Always reschedule so monitoring keeps running even if a cycle throws.
      await this.rescheduleAlarm();
    }
  }

  /**
   * Run the speed tests when enabled and the configured interval has elapsed
   * since the previous run (or when none has ever run). Speed tests are heavier
   * than health probes, so they are throttled on their own cadence.
   */
  private async maybeRunSpeedTests(): Promise<void> {
    if (!resolveSpeedEnabled()) {
      return;
    }
    const last = (await this.ctx.storage.get<number>(LAST_SPEED_TEST_KEY)) ?? 0;
    const due = Date.now() - last >= resolveSpeedIntervalSeconds() * 1000;
    if (due) {
      await this.runSpeedTests();
    }
  }

  // ── Monitor configuration (runtime CRUD) ────────────────────────────────────

  /** Read every monitor together with its last-run bookkeeping. */
  private loadMonitors(): ScheduledMonitor[] {
    return this.ctx.storage.sql
      .exec<MonitorRow>(`SELECT id, config, last_run_at FROM monitors ORDER BY rowid ASC;`)
      .toArray()
      .map((row) => ({ target: JSON.parse(row.config) as MonitorTarget, lastRunAt: row.last_run_at }));
  }

  /** Insert or replace a monitor, preserving its `last_run_at` bookkeeping. */
  private writeMonitor(target: MonitorTarget, lastRunAt: number): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO monitors (id, config, last_run_at) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET config = excluded.config;`,
      target.id,
      JSON.stringify(target),
      lastRunAt,
    );
  }

  /** List the configured monitors (used by `GET /api/monitors`). */
  listMonitors(): MonitorTarget[] {
    return this.loadMonitors().map((entry) => entry.target);
  }

  /**
   * Create or update a monitor at runtime, probe it immediately so the
   * dashboard reflects the change, then re-arm the alarm.
   */
  async upsertMonitor(target: MonitorTarget): Promise<void> {
    this.writeMonitor(target, 0);
    await this.probeAndStore(target);
    await this.rescheduleAlarm();
  }

  /** Remove a monitor and its samples, then re-arm the alarm. */
  async deleteMonitor(id: string): Promise<void> {
    this.ctx.storage.sql.exec(`DELETE FROM monitors WHERE id = ?;`, id);
    this.ctx.storage.sql.exec(`DELETE FROM samples WHERE service = ?;`, id);
    await this.rescheduleAlarm();
  }

  // ── Probing ─────────────────────────────────────────────────────────────────

  /** Probe every monitor whose interval has elapsed and record the results. */
  private async runDueChecks(): Promise<void> {
    const now = Date.now();
    const due = this.loadMonitors().filter(({ target, lastRunAt }) => now - lastRunAt >= this.intervalMsFor(target));
    await Promise.all(due.map(({ target }) => this.probeAndStore(target)));
  }

  /** Probe every monitor immediately, ignoring their individual schedules. */
  async runChecks(): Promise<void> {
    await Promise.all(this.loadMonitors().map(({ target }) => this.probeAndStore(target)));
  }

  /** Run one probe, store the sample and stamp the monitor's last-run time. */
  private async probeAndStore(target: MonitorTarget): Promise<void> {
    const sample = await runProbe(target);
    this.insert(sample);
    this.updateAutomaticIncident(target, sample);
    this.ctx.storage.sql.exec(`UPDATE monitors SET last_run_at = ? WHERE id = ?;`, sample.ts, target.id);
  }

  private updateAutomaticIncident(target: MonitorTarget, sample: Sample): void {
    const previous = this.ctx.storage.sql
      .exec<{ failures: number; successes: number }>(
        `SELECT failures, successes FROM probe_counters WHERE service_id = ?;`,
        target.id,
      )
      .toArray()[0] ?? { failures: 0, successes: 0 };
    const failures = sample.state === 'down' ? previous.failures + 1 : 0;
    const successes = sample.state === 'up' ? previous.successes + 1 : 0;
    this.ctx.storage.sql.exec(
      `INSERT INTO probe_counters (service_id, failures, successes) VALUES (?, ?, ?)
       ON CONFLICT(service_id) DO UPDATE SET failures = excluded.failures, successes = excluded.successes;`,
      target.id,
      failures,
      successes,
    );
    const active = this.ctx.storage.sql
      .exec<IncidentRow>(
        `SELECT * FROM incidents WHERE service_id = ? AND automatic = 1 AND status != 'resolved' LIMIT 1;`,
        target.id,
      )
      .toArray()[0];
    if (target.autoIncident && failures >= (target.failThreshold ?? 3) && !active) {
      this.createIncident({
        serviceId: target.id,
        title: `${target.name} is unavailable`,
        description: sample.error ?? 'Repeated monitor failures detected.',
        severity: 'major',
        automatic: true,
      });
    } else if (active && successes >= (target.successThreshold ?? 2)) {
      this.updateIncident(active.id, { status: 'resolved' });
    }
  }

  listIncidents(): Incident[] {
    const incidents = this.ctx.storage.sql
      .exec<IncidentRow>(
        `SELECT * FROM incidents ORDER BY CASE WHEN status = 'resolved' THEN 1 ELSE 0 END, opened_at DESC;`,
      )
      .toArray()
      .map(toIncident);
    const updates = this.ctx.storage.sql
      .exec<IncidentUpdateRow>(`SELECT * FROM incident_updates ORDER BY created_at ASC;`)
      .toArray();
    return incidents.map((incident) => ({
      ...incident,
      updates: updates.filter((update) => update.incident_id === incident.id).map(toIncidentUpdate),
    }));
  }

  createIncident(input: {
    serviceId?: string | null;
    title: string;
    description?: string;
    severity?: IncidentSeverity;
    automatic?: boolean;
  }): Incident {
    const incident: Incident = {
      id: crypto.randomUUID(),
      serviceId: input.serviceId ?? null,
      title: input.title,
      description: input.description ?? '',
      status: 'investigating',
      severity: input.severity ?? 'minor',
      openedAt: Date.now(),
      resolvedAt: null,
      automatic: input.automatic ?? false,
      updates: [],
      postIncidentReport: null,
    };
    this.ctx.storage.sql.exec(
      `INSERT INTO incidents (id, service_id, title, description, status, severity, opened_at, resolved_at, automatic)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      incident.id,
      incident.serviceId,
      incident.title,
      incident.description,
      incident.status,
      incident.severity,
      incident.openedAt,
      incident.resolvedAt,
      incident.automatic ? 1 : 0,
    );
    this.addIncidentUpdate(incident.id, {
      message: incident.automatic
        ? 'Incident opened automatically after repeated probe failures.'
        : 'Incident reported.',
      status: 'investigating',
    });
    incident.updates = this.listIncidentUpdates(incident.id);
    return incident;
  }

  updateIncident(
    id: string,
    input: { status?: IncidentStatus; description?: string; severity?: IncidentSeverity },
  ): Incident | null {
    const current = this.listIncidents().find((incident) => incident.id === id);
    if (!current) return null;
    const incident = {
      ...current,
      ...input,
      resolvedAt: input.status === 'resolved' ? Date.now() : current.resolvedAt,
    };
    this.ctx.storage.sql.exec(
      `UPDATE incidents SET description = ?, status = ?, severity = ?, resolved_at = ? WHERE id = ?;`,
      incident.description,
      incident.status,
      incident.severity,
      incident.resolvedAt,
      id,
    );
    if (input.status && input.status !== current.status) {
      this.addIncidentUpdate(id, {
        message: `Status changed from ${current.status} to ${input.status}.`,
        status: input.status,
      });
      incident.updates = this.listIncidentUpdates(id);
    }
    return incident;
  }

  private listIncidentUpdates(incidentId: string): IncidentUpdate[] {
    return this.ctx.storage.sql
      .exec<IncidentUpdateRow>(
        `SELECT * FROM incident_updates WHERE incident_id = ? ORDER BY created_at ASC;`,
        incidentId,
      )
      .toArray()
      .map(toIncidentUpdate);
  }

  addIncidentUpdate(
    incidentId: string,
    input: { message: string; status?: IncidentStatus | null },
  ): IncidentUpdate | null {
    const current = this.ctx.storage.sql
      .exec<{ id: string }>(`SELECT id FROM incidents WHERE id = ?;`, incidentId)
      .toArray()[0];
    if (!current) return null;
    const update: IncidentUpdate = {
      id: crypto.randomUUID(),
      incidentId,
      message: input.message,
      status: input.status ?? null,
      createdAt: Date.now(),
    };
    this.ctx.storage.sql.exec(
      `INSERT INTO incident_updates (id, incident_id, message, status, created_at) VALUES (?, ?, ?, ?, ?);`,
      update.id,
      update.incidentId,
      update.message,
      update.status,
      update.createdAt,
    );
    if (input.status) {
      this.ctx.storage.sql.exec(
        `UPDATE incidents SET status = ?, resolved_at = ? WHERE id = ?;`,
        input.status,
        input.status === 'resolved' ? update.createdAt : null,
        incidentId,
      );
    }
    return update;
  }

  updatePostIncidentReport(id: string, report: string): Incident | null {
    const current = this.listIncidents().find((incident) => incident.id === id);
    if (!current || current.status !== 'resolved') return null;
    this.ctx.storage.sql.exec(`UPDATE incidents SET post_incident_report = ? WHERE id = ?;`, report, id);
    return { ...current, postIncidentReport: report };
  }

  listMaintenance(): MaintenanceWindow[] {
    return this.ctx.storage.sql
      .exec<MaintenanceRow>(`SELECT * FROM maintenance_windows ORDER BY starts_at ASC;`)
      .toArray()
      .map(toMaintenance);
  }

  createMaintenance(input: Omit<MaintenanceWindow, 'id' | 'createdAt' | 'cancelledAt'>): MaintenanceWindow {
    const window: MaintenanceWindow = { ...input, id: crypto.randomUUID(), cancelledAt: null, createdAt: Date.now() };
    this.ctx.storage.sql.exec(
      `INSERT INTO maintenance_windows (id, title, description, service_id, starts_at, ends_at, cancelled_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      window.id,
      window.title,
      window.description,
      window.serviceId,
      window.startsAt,
      window.endsAt,
      window.cancelledAt,
      window.createdAt,
    );
    return window;
  }

  updateMaintenance(
    id: string,
    input: Partial<
      Pick<MaintenanceWindow, 'title' | 'description' | 'serviceId' | 'startsAt' | 'endsAt' | 'cancelledAt'>
    >,
  ): MaintenanceWindow | null {
    const current = this.listMaintenance().find((window) => window.id === id);
    if (!current) return null;
    const window = { ...current, ...input };
    this.ctx.storage.sql.exec(
      `UPDATE maintenance_windows SET title = ?, description = ?, service_id = ?, starts_at = ?, ends_at = ?, cancelled_at = ? WHERE id = ?;`,
      window.title,
      window.description,
      window.serviceId,
      window.startsAt,
      window.endsAt,
      window.cancelledAt,
      id,
    );
    return window;
  }

  /** Append one sample to the time series. */
  private insert(sample: Sample): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO samples (service, ts, state, status, latency_ms, error) VALUES (?, ?, ?, ?, ?, ?);`,
      sample.service,
      sample.ts,
      sample.state,
      sample.status,
      sample.latencyMs,
      sample.error,
    );
  }

  /** Drop samples older than the retention window. */
  private prune(): void {
    const cutoff = Date.now() - resolveRetentionMs();
    this.ctx.storage.sql.exec(`DELETE FROM samples WHERE ts < ?;`, cutoff);
  }

  /**
   * Roll up the current status for every configured monitor across the retained
   * window. Called by the worker to answer `GET /api/services`.
   */
  getServices(): ServiceStatus[] {
    const since = Date.now() - resolveRetentionMs();
    return this.listMonitors().map((target) => {
      const rows = this.ctx.storage.sql
        .exec<SampleRow>(
          `SELECT service, ts, state, status, latency_ms, error
           FROM samples WHERE service = ? AND ts >= ? ORDER BY ts ASC;`,
          target.id,
          since,
        )
        .toArray();

      const samples = rows.map(toSample);
      const latest = samples.at(-1) ?? null;
      const up = samples.filter((sample) => sample.state !== 'down').length;
      const latencyTotal = samples.reduce((sum, sample) => sum + sample.latencyMs, 0);

      return {
        target,
        latest,
        uptime: samples.length > 0 ? up / samples.length : 0,
        avgLatencyMs: samples.length > 0 ? latencyTotal / samples.length : 0,
        sampleCount: samples.length,
      } satisfies ServiceStatus;
    });
  }

  /**
   * Return the raw time series for a single target since a given timestamp.
   * Called by the worker to answer `GET /api/metrics`.
   */
  getMetrics(service: string, since: number): Sample[] {
    return this.ctx.storage.sql
      .exec<SampleRow>(
        `SELECT service, ts, state, status, latency_ms, error
         FROM samples WHERE service = ? AND ts >= ? ORDER BY ts ASC;`,
        service,
        since,
      )
      .toArray()
      .map(toSample);
  }

  /** Force an immediate probe cycle (used to seed data on first load). */
  async checkNow(): Promise<void> {
    await this.runChecks();
    this.prune();
    await this.rescheduleAlarm();
  }

  // ── Speed testing ────────────────────────────────────────────────────────

  /** Run every speed-test provider once and persist the results. */
  async runSpeedTests(): Promise<SpeedResult[]> {
    const bytes = resolveSpeedBytes();
    const results = await Promise.all(SPEED_PROVIDERS.map((provider) => provider.run(bytes)));
    for (const result of results) {
      this.insertSpeed(result);
    }
    this.pruneSpeed();
    await this.ctx.storage.put(LAST_SPEED_TEST_KEY, Date.now());
    return results;
  }

  /** Append one speed-test measurement to the speed time series. */
  private insertSpeed(result: SpeedResult): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO speed_samples (provider, ts, download_mbps, upload_mbps, latency_ms, bytes, ok, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      result.provider,
      result.ts,
      result.downloadMbps,
      result.uploadMbps,
      result.latencyMs,
      result.bytes,
      result.ok ? 1 : 0,
      result.error,
    );
  }

  /** Drop speed samples older than the retention window. */
  private pruneSpeed(): void {
    const cutoff = Date.now() - resolveRetentionMs();
    this.ctx.storage.sql.exec(`DELETE FROM speed_samples WHERE ts < ?;`, cutoff);
  }

  /**
   * Roll up the current status for every speed-test provider across the
   * retained window. Called by the worker to answer `GET /api/speed`.
   */
  getSpeed(): SpeedStatus[] {
    const since = Date.now() - resolveRetentionMs();
    return SPEED_PROVIDER_META.map((provider) => {
      const rows = this.ctx.storage.sql
        .exec<SpeedRow>(
          `SELECT provider, ts, download_mbps, upload_mbps, latency_ms, bytes, ok, error
           FROM speed_samples WHERE provider = ? AND ts >= ? ORDER BY ts ASC;`,
          provider.id,
          since,
        )
        .toArray();

      const samples = rows.map(toSpeedResult);
      const successful = samples.filter((sample) => sample.ok);
      const downloadTotal = successful.reduce((sum, sample) => sum + sample.downloadMbps, 0);
      const maxDownload = successful.reduce((max, sample) => Math.max(max, sample.downloadMbps), 0);

      return {
        provider,
        latest: samples.at(-1) ?? null,
        avgDownloadMbps: successful.length > 0 ? downloadTotal / successful.length : 0,
        maxDownloadMbps: maxDownload,
        sampleCount: samples.length,
      } satisfies SpeedStatus;
    });
  }

  /**
   * Return the raw speed time series for a single provider since a given
   * timestamp. Called by the worker to answer `GET /api/speed/series`.
   */
  getSpeedSeries(provider: SpeedProviderId, since: number): SpeedResult[] {
    return this.ctx.storage.sql
      .exec<SpeedRow>(
        `SELECT provider, ts, download_mbps, upload_mbps, latency_ms, bytes, ok, error
         FROM speed_samples WHERE provider = ? AND ts >= ? ORDER BY ts ASC;`,
        provider,
        since,
      )
      .toArray()
      .map(toSpeedResult);
  }

  /** Trigger an immediate speed-test run (used by the manual "Run" button). */
  async runSpeedNow(): Promise<SpeedResult[]> {
    return this.runSpeedTests();
  }
}

/** Map a stored row back to the domain {@link Sample} shape. */
function toSample(row: SampleRow): Sample {
  return {
    service: row.service,
    ts: row.ts,
    state: row.state as HealthState,
    status: row.status,
    latencyMs: row.latency_ms,
    error: row.error,
  };
}

/** Map a stored row back to the domain {@link SpeedResult} shape. */
function toSpeedResult(row: SpeedRow): SpeedResult {
  return {
    provider: row.provider as SpeedProviderId,
    ts: row.ts,
    downloadMbps: row.download_mbps,
    uploadMbps: row.upload_mbps,
    latencyMs: row.latency_ms,
    bytes: row.bytes,
    ok: row.ok === 1,
    error: row.error,
  };
}

function toIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    serviceId: row.service_id,
    title: row.title,
    description: row.description,
    status: row.status as IncidentStatus,
    severity: row.severity as IncidentSeverity,
    openedAt: row.opened_at,
    resolvedAt: row.resolved_at,
    automatic: row.automatic === 1,
    updates: [],
    postIncidentReport: row.post_incident_report,
  };
}

function toIncidentUpdate(row: IncidentUpdateRow): IncidentUpdate {
  return {
    id: row.id,
    incidentId: row.incident_id,
    message: row.message,
    status: row.status as IncidentStatus | null,
    createdAt: row.created_at,
  };
}

function toMaintenance(row: MaintenanceRow): MaintenanceWindow {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    serviceId: row.service_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
  };
}

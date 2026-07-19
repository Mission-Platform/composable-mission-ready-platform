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
import type { HealthState, MonitorTarget, Sample, ServiceStatus } from './types';

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
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

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
    this.ctx.storage.sql.exec(`UPDATE monitors SET last_run_at = ? WHERE id = ?;`, sample.ts, target.id);
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

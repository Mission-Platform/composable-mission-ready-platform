import type { SpeedProviderId, SpeedResult } from './speed/types';
import type { HealthState, MonitorTarget, Sample } from './types';

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
export interface ScheduledMonitor {
  target: MonitorTarget;
  lastRunAt: number;
}

/**
 * Persistence layer for the monitoring engine.
 *
 * Owns every raw SQL statement backing the embedded SQLite time-series store —
 * schema migration, monitor configuration CRUD, the sample and speed-test
 * series, and their retention pruning. Domain objects are mapped to and from
 * their stored rows here so the {@link MonitorDurableObject} can stay focused on
 * orchestration and roll-up computations.
 */
export class MonitorStore {
  constructor(private readonly sql: SqlStorage) {}

  /** Create the time-series tables and supporting indexes if they do not exist. */
  migrate(): void {
    this.sql.exec(
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
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_samples_service_ts ON samples (service, ts);`);

    this.sql.exec(
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
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_speed_provider_ts ON speed_samples (provider, ts);`);

    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS monitors (
        id TEXT PRIMARY KEY,
        config TEXT NOT NULL,
        last_run_at INTEGER NOT NULL DEFAULT 0
      );`,
    );
    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY, service_id TEXT, title TEXT NOT NULL, description TEXT NOT NULL,
        status TEXT NOT NULL, severity TEXT NOT NULL, opened_at INTEGER NOT NULL,
        resolved_at INTEGER, automatic INTEGER NOT NULL DEFAULT 0, post_incident_report TEXT
      );`,
    );
    const incidentColumns = this.sql.exec<{ name: string }>(`PRAGMA table_info(incidents);`).toArray();
    if (!incidentColumns.some((column) => column.name === 'post_incident_report')) {
      this.sql.exec(`ALTER TABLE incidents ADD COLUMN post_incident_report TEXT;`);
    }
    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS incident_updates (
        id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, message TEXT NOT NULL, status TEXT,
        created_at INTEGER NOT NULL, FOREIGN KEY (incident_id) REFERENCES incidents(id)
      );`,
    );
    this.sql.exec(
      `CREATE INDEX IF NOT EXISTS idx_incident_updates_incident ON incident_updates (incident_id, created_at);`,
    );
    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS maintenance_windows (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, service_id TEXT,
        starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL, cancelled_at INTEGER, created_at INTEGER NOT NULL
      );`,
    );
    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS probe_counters (
        service_id TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0, successes INTEGER NOT NULL DEFAULT 0
      );`,
    );
  }

  /** Populate the monitors table from the provided targets when it is empty. */
  seedIfEmpty(targets: MonitorTarget[]): void {
    const count = this.sql.exec<{ n: number }>(`SELECT COUNT(*) AS n FROM monitors;`).one().n;
    if (count > 0) {
      return;
    }
    for (const target of targets) {
      this.writeMonitor(target, 0);
    }
  }

  /** Read every monitor together with its last-run bookkeeping. */
  loadMonitors(): ScheduledMonitor[] {
    return this.sql
      .exec<MonitorRow>(`SELECT id, config, last_run_at FROM monitors ORDER BY rowid ASC;`)
      .toArray()
      .map((row) => ({ target: JSON.parse(row.config) as MonitorTarget, lastRunAt: row.last_run_at }));
  }

  /** Insert or replace a monitor, preserving its `last_run_at` bookkeeping. */
  writeMonitor(target: MonitorTarget, lastRunAt: number): void {
    this.sql.exec(
      `INSERT INTO monitors (id, config, last_run_at) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET config = excluded.config;`,
      target.id,
      JSON.stringify(target),
      lastRunAt,
    );
  }

  /** Remove a monitor and every sample recorded against it. */
  deleteMonitor(id: string): void {
    this.sql.exec(`DELETE FROM monitors WHERE id = ?;`, id);
    this.sql.exec(`DELETE FROM samples WHERE service = ?;`, id);
  }

  /** Stamp a monitor's last-run timestamp after a probe completes. */
  stampLastRun(id: string, ts: number): void {
    this.sql.exec(`UPDATE monitors SET last_run_at = ? WHERE id = ?;`, ts, id);
  }

  /** Append one sample to the time series. */
  insertSample(sample: Sample): void {
    this.sql.exec(
      `INSERT INTO samples (service, ts, state, status, latency_ms, error) VALUES (?, ?, ?, ?, ?, ?);`,
      sample.service,
      sample.ts,
      sample.state,
      sample.status,
      sample.latencyMs,
      sample.error,
    );
  }

  /** Drop samples recorded before the given cutoff timestamp. */
  pruneSamples(cutoff: number): void {
    this.sql.exec(`DELETE FROM samples WHERE ts < ?;`, cutoff);
  }

  /** Read the raw sample series for a single service since a timestamp. */
  getSamples(service: string, since: number): Sample[] {
    return this.sql
      .exec<SampleRow>(
        `SELECT service, ts, state, status, latency_ms, error
         FROM samples WHERE service = ? AND ts >= ? ORDER BY ts ASC;`,
        service,
        since,
      )
      .toArray()
      .map(toSample);
  }

  /** Append one speed-test measurement to the speed time series. */
  insertSpeed(result: SpeedResult): void {
    this.sql.exec(
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

  /** Drop speed samples recorded before the given cutoff timestamp. */
  pruneSpeed(cutoff: number): void {
    this.sql.exec(`DELETE FROM speed_samples WHERE ts < ?;`, cutoff);
  }

  /** Read the raw speed-test series for a single provider since a timestamp. */
  getSpeedSamples(provider: SpeedProviderId, since: number): SpeedResult[] {
    return this.sql
      .exec<SpeedRow>(
        `SELECT provider, ts, download_mbps, upload_mbps, latency_ms, bytes, ok, error
         FROM speed_samples WHERE provider = ? AND ts >= ? ORDER BY ts ASC;`,
        provider,
        since,
      )
      .toArray()
      .map(toSpeedResult);
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

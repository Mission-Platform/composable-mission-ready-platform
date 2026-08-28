import { describe, expect, it } from 'vitest';

import { MonitorStore } from './storage';

import type { MonitorTarget } from './types';

interface ExecCall {
  query: string;
  params: unknown[];
}

/**
 * Minimal, honest stand-in for the Durable Object's `SqlStorage`. It records
 * every `exec` call so tests can assert query text and parameter binding, and a
 * responder supplies rows for the few reads the store performs (the
 * `PRAGMA table_info` guard and the seed count).
 */
class FakeSql {
  readonly calls: ExecCall[] = [];

  constructor(private readonly responder: (query: string) => Record<string, unknown>[] = () => []) {}

  exec(query: string, ...params: unknown[]) {
    this.calls.push({ query, params });
    const rows = this.responder(query);
    return {
      toArray: () => rows,
      one: () => rows[0],
    };
  }
}

function store(sql: FakeSql): MonitorStore {
  return new MonitorStore(sql as unknown as SqlStorage);
}

describe('MonitorStore.migrate', () => {
  it('creates every table and index and adds the missing post_incident_report column', () => {
    const sql = new FakeSql((query) =>
      query.includes('PRAGMA table_info(incidents)') ? [{ name: 'id' }, { name: 'status' }] : [],
    );
    store(sql).migrate();

    const queries = sql.calls.map((call) => call.query);
    expect(queries.some((query) => query.includes('CREATE TABLE IF NOT EXISTS samples'))).toBe(true);
    expect(queries.some((query) => query.includes('CREATE INDEX IF NOT EXISTS idx_samples_service_ts'))).toBe(true);
    expect(queries.some((query) => query.includes('CREATE TABLE IF NOT EXISTS speed_samples'))).toBe(true);
    expect(queries.some((query) => query.includes('CREATE INDEX IF NOT EXISTS idx_speed_provider_ts'))).toBe(true);
    expect(queries.some((query) => query.includes('CREATE TABLE IF NOT EXISTS monitors'))).toBe(true);
    expect(queries.some((query) => query.includes('CREATE TABLE IF NOT EXISTS incidents'))).toBe(true);
    expect(queries.some((query) => query.includes('CREATE TABLE IF NOT EXISTS incident_updates'))).toBe(true);
    expect(queries.some((query) => query.includes('CREATE TABLE IF NOT EXISTS maintenance_windows'))).toBe(true);
    expect(queries.some((query) => query.includes('CREATE TABLE IF NOT EXISTS probe_counters'))).toBe(true);
    expect(queries.some((query) => query.includes('PRAGMA table_info(incidents)'))).toBe(true);
    expect(queries.some((query) => query.includes('ALTER TABLE incidents ADD COLUMN post_incident_report'))).toBe(true);
  });

  it('does not ALTER when the post_incident_report column already exists', () => {
    const sql = new FakeSql((query) =>
      query.includes('PRAGMA table_info(incidents)') ? [{ name: 'id' }, { name: 'post_incident_report' }] : [],
    );
    store(sql).migrate();

    expect(sql.calls.some((call) => call.query.includes('ALTER TABLE incidents ADD COLUMN'))).toBe(false);
  });
});

describe('MonitorStore.seedIfEmpty', () => {
  const target: MonitorTarget = { id: 'svc', name: 'Service', type: 'http', url: 'https://example.com' };

  it('writes each target only when the table is empty', () => {
    const sql = new FakeSql((query) => (query.includes('COUNT(*)') ? [{ n: 0 }] : []));
    store(sql).seedIfEmpty([target]);

    const insert = sql.calls.find((call) => call.query.includes('INSERT INTO monitors'));
    expect(insert).toBeDefined();
    expect(insert?.params).toEqual([target.id, JSON.stringify(target), 0]);
  });

  it('writes nothing when the table already has rows', () => {
    const sql = new FakeSql((query) => (query.includes('COUNT(*)') ? [{ n: 3 }] : []));
    store(sql).seedIfEmpty([target]);

    expect(sql.calls.some((call) => call.query.includes('INSERT INTO monitors'))).toBe(false);
  });
});

describe('MonitorStore.writeMonitor', () => {
  it('serializes the target as JSON and binds the id and last-run stamp', () => {
    const sql = new FakeSql();
    const target: MonitorTarget = { id: 'svc', name: 'Service', type: 'tcp', host: 'example.com', port: 443 };
    store(sql).writeMonitor(target, 42);

    const insert = sql.calls.find((call) => call.query.includes('INSERT INTO monitors'));
    expect(insert?.params).toEqual([target.id, JSON.stringify(target), 42]);
  });
});

describe('MonitorStore.deleteMonitor', () => {
  it('removes the monitor, its samples, and its predecessor counters', () => {
    const sql = new FakeSql();
    store(sql).deleteMonitor('svc');

    expect(sql.calls).toEqual([
      { query: 'DELETE FROM monitors WHERE id = ?;', params: ['svc'] },
      { query: 'DELETE FROM samples WHERE service = ?;', params: ['svc'] },
      { query: 'DELETE FROM probe_counters WHERE service_id = ?;', params: ['svc'] },
      { query: 'UPDATE incidents SET service_id = NULL WHERE service_id = ?;', params: ['svc'] },
    ]);
  });
});

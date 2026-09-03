import { describe, expect, it } from 'vitest';

import {
  IncidentManager,
  isIncidentSeverity,
  isIncidentStatus,
  maintenanceStatus,
  validMaintenanceRange,
} from './incidents';

describe('incident validation', () => {
  it('accepts only supported statuses and severities', () => {
    expect(isIncidentStatus('monitoring')).toBe(true);
    expect(isIncidentStatus('closed')).toBe(false);
    expect(isIncidentSeverity('critical')).toBe(true);
    expect(isIncidentSeverity('urgent')).toBe(false);
  });
});

describe('maintenance windows', () => {
  it('requires finite, increasing timestamps', () => {
    expect(validMaintenanceRange(10, 20)).toBe(true);
    expect(validMaintenanceRange(20, 10)).toBe(false);
    expect(validMaintenanceRange(Number.NaN, 20)).toBe(false);
  });

  it('derives scheduled, active, completed, and cancelled states', () => {
    expect(maintenanceStatus({ startsAt: 20, endsAt: 30, cancelledAt: null }, 10)).toBe('scheduled');
    expect(maintenanceStatus({ startsAt: 20, endsAt: 30, cancelledAt: null }, 25)).toBe('active');
    expect(maintenanceStatus({ startsAt: 20, endsAt: 30, cancelledAt: null }, 30)).toBe('completed');
    expect(maintenanceStatus({ startsAt: 20, endsAt: 30, cancelledAt: 15 }, 10)).toBe('cancelled');
  });
});

interface ExecCall {
  query: string;
  params: unknown[];
}

/**
 * Minimal, honest stand-in for the Durable Object's `SqlStorage`. It records
 * every `exec` call so tests can assert query text and parameter binding, and a
 * responder supplies rows for the few reads the store performs.
 */
class FakeSql {
  readonly calls: ExecCall[] = [];
  private incidents: Map<string, Record<string, unknown>> = new Map();
  private incidentUpdates: Array<Record<string, unknown>> = [];

  constructor(private readonly responder: (query: string) => Record<string, unknown>[] = () => []) {}

  exec(query: string, ...params: unknown[]) {
    this.calls.push({ query, params });

    // Handle incident creation for testing
    if (query.includes('INSERT INTO incidents')) {
      const row: Record<string, unknown> = {
        id: params[0],
        service_id: params[1],
        title: params[2],
        description: params[3],
        status: params[4],
        severity: params[5],
        opened_at: params[6],
        resolved_at: params[7],
        automatic: params[8],
        post_incident_report: null,
      };
      this.incidents.set(params[0] as string, row);
    }

    // Handle incident updates (both updateIncident and addIncidentUpdate paths)
    if (query.includes('UPDATE incidents SET') && query.includes('status')) {
      const incidentId = params.at(-1) as string;
      const incident = this.incidents.get(incidentId);
      if (incident) {
        if (params.length === 5) {
          incident.description = params[0];
          incident.status = params[1];
          incident.severity = params[2];
          incident.resolved_at = params[3];
        } else if (params.length === 3) {
          incident.status = params[0];
          incident.resolved_at = params[1];
        }
      }
    }

    // Handle incident update inserts
    if (query.includes('INSERT INTO incident_updates')) {
      const row: Record<string, unknown> = {
        id: params[0],
        incident_id: params[1],
        message: params[2],
        status: params[3],
        created_at: params[4],
      };
      this.incidentUpdates.push(row);
    }

    // Handle SELECT queries
    if (query.includes('SELECT * FROM incidents')) {
      const rows = [...this.incidents.values()];
      return {
        toArray: () => rows,
        one: () => rows[0],
      };
    }

    if (query.includes('SELECT * FROM incident_updates')) {
      const incidentId = params[0] as string;
      const rows = this.incidentUpdates.filter((u) => u.incident_id === incidentId);
      return {
        toArray: () => rows,
        one: () => rows[0],
      };
    }

    if (query.includes('SELECT id FROM incidents')) {
      const incidentId = params[0] as string;
      const incident = this.incidents.get(incidentId);
      return {
        toArray: () => (incident ? [{ id: incident.id }] : []),
        one: () => (incident ? { id: incident.id } : undefined),
      };
    }

    const rows = this.responder(query);
    return {
      toArray: () => rows,
      one: () => rows[0],
    };
  }
}

function manager(sql: FakeSql): IncidentManager {
  return new IncidentManager(sql as unknown as SqlStorage);
}

describe('incident resolvedAt lifecycle', () => {
  it('sets resolvedAt when transitioning to resolved status via updateIncident', () => {
    const sql = new FakeSql();
    const incidents = manager(sql);

    // Create an incident
    const incident = incidents.createIncident({
      title: 'Test Incident',
      description: 'Test',
      severity: 'major',
      automatic: false,
    });

    expect(incident.resolvedAt).toBeNull();

    // Transition to resolved
    const before = Date.now();
    const updated = incidents.updateIncident(incident.id, { status: 'resolved' });
    const after = Date.now();

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('resolved');
    expect(updated!.resolvedAt).toBeGreaterThanOrEqual(before);
    expect(updated!.resolvedAt).toBeLessThanOrEqual(after);
  });

  it('clears resolvedAt when transitioning from resolved to non-resolved via updateIncident', () => {
    const sql = new FakeSql();
    const incidents = manager(sql);

    // Create and resolve an incident
    const incident = incidents.createIncident({
      title: 'Test Incident',
      description: 'Test',
      severity: 'major',
      automatic: false,
    });
    const resolved = incidents.updateIncident(incident.id, { status: 'resolved' });
    expect(resolved!.resolvedAt).not.toBeNull();

    // Transition back to investigating
    const reopened = incidents.updateIncident(incident.id, { status: 'investigating' });
    expect(reopened!.status).toBe('investigating');
    expect(reopened!.resolvedAt).toBeNull();
  });

  it('re-sets resolvedAt when transitioning back to resolved via updateIncident', async () => {
    const sql = new FakeSql();
    const incidents = manager(sql);

    // Create, resolve, and reopen an incident
    const incident = incidents.createIncident({
      title: 'Test Incident',
      description: 'Test',
      severity: 'major',
      automatic: false,
    });
    const resolved = incidents.updateIncident(incident.id, { status: 'resolved' });
    const firstResolvedAt = resolved!.resolvedAt;
    expect(firstResolvedAt).not.toBeNull();

    const reopened = incidents.updateIncident(incident.id, { status: 'investigating' });
    expect(reopened!.resolvedAt).toBeNull();

    // Wait a bit to ensure time has passed
    await new Promise((resolve) => setTimeout(resolve, 2));

    // Re-resolve
    const before = Date.now();
    const reresolved = incidents.updateIncident(incident.id, { status: 'resolved' });
    const after = Date.now();

    expect(reresolved!.status).toBe('resolved');
    expect(reresolved!.resolvedAt).toBeGreaterThanOrEqual(before);
    expect(reresolved!.resolvedAt).toBeLessThanOrEqual(after);
    // The new resolvedAt should be different from the first one (time has passed)
    expect(reresolved!.resolvedAt).toBeGreaterThan(firstResolvedAt!);
  });

  it('sets resolvedAt when transitioning to resolved status via addIncidentUpdate', () => {
    const sql = new FakeSql();
    const incidents = manager(sql);

    // Create an incident
    const incident = incidents.createIncident({
      title: 'Test Incident',
      description: 'Test',
      severity: 'major',
      automatic: false,
    });

    expect(incident.resolvedAt).toBeNull();

    // Add an update that transitions to resolved
    const before = Date.now();
    const update = incidents.addIncidentUpdate(incident.id, {
      message: 'Issue resolved.',
      status: 'resolved',
    });
    const after = Date.now();

    expect(update).not.toBeNull();
    expect(update!.status).toBe('resolved');

    // Verify the incident was updated
    const updated = incidents.listIncidents().find((i) => i.id === incident.id);
    expect(updated!.status).toBe('resolved');
    expect(updated!.resolvedAt).toBeGreaterThanOrEqual(before);
    expect(updated!.resolvedAt).toBeLessThanOrEqual(after);
  });

  it('clears resolvedAt when transitioning from resolved to non-resolved via addIncidentUpdate', () => {
    const sql = new FakeSql();
    const incidents = manager(sql);

    // Create and resolve an incident
    const incident = incidents.createIncident({
      title: 'Test Incident',
      description: 'Test',
      severity: 'major',
      automatic: false,
    });
    incidents.addIncidentUpdate(incident.id, {
      message: 'Issue resolved.',
      status: 'resolved',
    });

    let current = incidents.listIncidents().find((i) => i.id === incident.id);
    expect(current!.resolvedAt).not.toBeNull();

    // Add an update that transitions back to investigating
    incidents.addIncidentUpdate(incident.id, {
      message: 'Issue reopened.',
      status: 'investigating',
    });

    current = incidents.listIncidents().find((i) => i.id === incident.id);
    expect(current!.status).toBe('investigating');
    expect(current!.resolvedAt).toBeNull();
  });

  it('re-sets resolvedAt when transitioning back to resolved via addIncidentUpdate', async () => {
    const sql = new FakeSql();
    const incidents = manager(sql);

    // Create, resolve, and reopen an incident
    const incident = incidents.createIncident({
      title: 'Test Incident',
      description: 'Test',
      severity: 'major',
      automatic: false,
    });
    incidents.addIncidentUpdate(incident.id, {
      message: 'Issue resolved.',
      status: 'resolved',
    });

    let current = incidents.listIncidents().find((i) => i.id === incident.id);
    const firstResolvedAt = current!.resolvedAt;
    expect(firstResolvedAt).not.toBeNull();

    incidents.addIncidentUpdate(incident.id, {
      message: 'Issue reopened.',
      status: 'investigating',
    });

    current = incidents.listIncidents().find((i) => i.id === incident.id);
    expect(current!.resolvedAt).toBeNull();

    // Wait a bit to ensure time has passed
    await new Promise((resolve) => setTimeout(resolve, 2));

    // Re-resolve
    const before = Date.now();
    incidents.addIncidentUpdate(incident.id, {
      message: 'Issue resolved again.',
      status: 'resolved',
    });
    const after = Date.now();

    current = incidents.listIncidents().find((i) => i.id === incident.id);
    expect(current!.status).toBe('resolved');
    expect(current!.resolvedAt).toBeGreaterThanOrEqual(before);
    expect(current!.resolvedAt).toBeLessThanOrEqual(after);
    // The new resolvedAt should be different from the first one (time has passed)
    expect(current!.resolvedAt).toBeGreaterThan(firstResolvedAt!);
  });
});

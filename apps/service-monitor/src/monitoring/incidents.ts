import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  IncidentUpdate,
  MaintenanceStatus,
  MaintenanceWindow,
  MonitorTarget,
  Sample,
} from './types';

export const INCIDENT_STATUSES: readonly IncidentStatus[] = ['investigating', 'identified', 'monitoring', 'resolved'];
export const INCIDENT_SEVERITIES: readonly IncidentSeverity[] = ['minor', 'major', 'critical'];

export function isIncidentStatus(value: unknown): value is IncidentStatus {
  return typeof value === 'string' && INCIDENT_STATUSES.includes(value as IncidentStatus);
}

export function isIncidentSeverity(value: unknown): value is IncidentSeverity {
  return typeof value === 'string' && INCIDENT_SEVERITIES.includes(value as IncidentSeverity);
}

export function maintenanceStatus(
  window: { startsAt: number; endsAt: number; cancelledAt: number | null },
  now = Date.now(),
): MaintenanceStatus {
  if (window.cancelledAt !== null) return 'cancelled';
  if (now < window.startsAt) return 'scheduled';
  if (now < window.endsAt) return 'active';
  return 'completed';
}

export function validMaintenanceRange(startsAt: unknown, endsAt: unknown): startsAt is number {
  return (
    typeof startsAt === 'number' &&
    Number.isFinite(startsAt) &&
    typeof endsAt === 'number' &&
    Number.isFinite(endsAt) &&
    startsAt < endsAt
  );
}

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

/**
 * Incident and planned-maintenance lifecycle backed by the Durable Object's
 * SQLite database.
 *
 * Owns the raw SQL for the `incidents`, `incident_updates`,
 * `maintenance_windows` and `probe_counters` tables, together with the
 * automatic-incident logic that opens and resolves incidents from consecutive
 * probe outcomes. The {@link MonitorDurableObject} delegates the whole incident
 * surface to this collaborator.
 */
export class IncidentManager {
  constructor(private readonly sql: SqlStorage) {}

  listIncidents(): Incident[] {
    const incidents = this.sql
      .exec<IncidentRow>(
        `SELECT * FROM incidents ORDER BY CASE WHEN status = 'resolved' THEN 1 ELSE 0 END, opened_at DESC;`,
      )
      .toArray()
      .map(toIncident);
    const updates = this.sql
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
    this.sql.exec(
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
    this.sql.exec(
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
    return this.sql
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
    const current = this.sql.exec<{ id: string }>(`SELECT id FROM incidents WHERE id = ?;`, incidentId).toArray()[0];
    if (!current) return null;
    const update: IncidentUpdate = {
      id: crypto.randomUUID(),
      incidentId,
      message: input.message,
      status: input.status ?? null,
      createdAt: Date.now(),
    };
    this.sql.exec(
      `INSERT INTO incident_updates (id, incident_id, message, status, created_at) VALUES (?, ?, ?, ?, ?);`,
      update.id,
      update.incidentId,
      update.message,
      update.status,
      update.createdAt,
    );
    if (input.status) {
      this.sql.exec(
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
    this.sql.exec(`UPDATE incidents SET post_incident_report = ? WHERE id = ?;`, report, id);
    return { ...current, postIncidentReport: report };
  }

  listMaintenance(): MaintenanceWindow[] {
    return this.sql
      .exec<MaintenanceRow>(`SELECT * FROM maintenance_windows ORDER BY starts_at ASC;`)
      .toArray()
      .map(toMaintenance);
  }

  createMaintenance(input: Omit<MaintenanceWindow, 'id' | 'createdAt' | 'cancelledAt'>): MaintenanceWindow {
    const window: MaintenanceWindow = { ...input, id: crypto.randomUUID(), cancelledAt: null, createdAt: Date.now() };
    this.sql.exec(
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
    this.sql.exec(
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

  /**
   * Update the consecutive failure/success counters for a service and open or
   * resolve an automatic incident once the target's thresholds are crossed.
   */
  updateAutomaticIncident(target: MonitorTarget, sample: Sample): void {
    const previous = this.sql
      .exec<{ failures: number; successes: number }>(
        `SELECT failures, successes FROM probe_counters WHERE service_id = ?;`,
        target.id,
      )
      .toArray()[0] ?? { failures: 0, successes: 0 };
    const failures = sample.state === 'down' ? previous.failures + 1 : 0;
    const successes = sample.state === 'up' ? previous.successes + 1 : 0;
    this.sql.exec(
      `INSERT INTO probe_counters (service_id, failures, successes) VALUES (?, ?, ?)
       ON CONFLICT(service_id) DO UPDATE SET failures = excluded.failures, successes = excluded.successes;`,
      target.id,
      failures,
      successes,
    );
    const active = this.sql
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

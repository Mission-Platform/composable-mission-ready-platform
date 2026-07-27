import type { IncidentSeverity, IncidentStatus, MaintenanceStatus } from './types';

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

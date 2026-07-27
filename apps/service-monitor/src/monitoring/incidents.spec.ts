import { describe, expect, it } from 'vitest';

import { isIncidentSeverity, isIncidentStatus, maintenanceStatus, validMaintenanceRange } from './incidents';

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

import { describe, expect, it } from 'vitest';

import { MIN_ALARM_DELAY_MS, ProbeScheduler } from './scheduler';

import type { ScheduledMonitor } from './storage';
import type { MonitorTarget } from './types';

const DEFAULT_INTERVAL_SECONDS = 30;
const SPEED_INTERVAL_SECONDS = 300;

function scheduler(): ProbeScheduler {
  return new ProbeScheduler(
    () => DEFAULT_INTERVAL_SECONDS,
    () => SPEED_INTERVAL_SECONDS,
  );
}

function monitor(target: MonitorTarget, lastRunAt: number): ScheduledMonitor {
  return { target, lastRunAt };
}

describe('ProbeScheduler interval math', () => {
  it('uses a monitor-specific interval when present and the default otherwise', () => {
    const probe = scheduler();
    expect(probe.defaultIntervalMs()).toBe(DEFAULT_INTERVAL_SECONDS * 1000);
    expect(probe.intervalMsFor({ id: 'a', name: 'A', intervalSeconds: 60 })).toBe(60_000);
    expect(probe.intervalMsFor({ id: 'b', name: 'B' })).toBe(DEFAULT_INTERVAL_SECONDS * 1000);
  });
});

describe('ProbeScheduler.computeNextAlarmAt', () => {
  it('picks the soonest per-monitor due time', () => {
    const now = 1_000_000;
    const next = scheduler().computeNextAlarmAt({
      now,
      monitors: [monitor({ id: 'a', name: 'A', intervalSeconds: 60 }, now), monitor({ id: 'b', name: 'B' }, now)],
      speedEnabled: false,
      lastSpeedAt: 0,
    });
    // Default-cadence monitor (30s) is due before the 60s one.
    expect(next).toBe(now + DEFAULT_INTERVAL_SECONDS * 1000);
  });

  it('includes the speed-test candidate only when speed testing is enabled', () => {
    const now = 1_000_000;
    const monitors = [monitor({ id: 'b', name: 'B' }, 1_020_000)];
    const lastSpeedAt = 740_000; // speed candidate = 740_000 + 300_000 = 1_040_000

    const withoutSpeed = scheduler().computeNextAlarmAt({ now, monitors, speedEnabled: false, lastSpeedAt });
    const withSpeed = scheduler().computeNextAlarmAt({ now, monitors, speedEnabled: true, lastSpeedAt });

    expect(withoutSpeed).toBe(1_050_000); // monitor: 1_020_000 + 30_000
    expect(withSpeed).toBe(1_040_000); // speed test is sooner
  });

  it('never schedules sooner than the minimum alarm delay', () => {
    const now = 1_000_000;
    const next = scheduler().computeNextAlarmAt({
      now,
      monitors: [monitor({ id: 'b', name: 'B' }, 100)], // long overdue
      speedEnabled: false,
      lastSpeedAt: 0,
    });
    expect(next).toBe(now + MIN_ALARM_DELAY_MS);
  });

  it('falls back to the default cadence when there is nothing to schedule', () => {
    const now = 1_000_000;
    const next = scheduler().computeNextAlarmAt({
      now,
      monitors: [],
      speedEnabled: false,
      lastSpeedAt: 0,
    });
    expect(next).toBe(now + DEFAULT_INTERVAL_SECONDS * 1000);
  });
});

import type { ScheduledMonitor } from './storage';
import type { MonitorTarget } from './types';

/** Never schedule the next alarm sooner than this, to avoid a hot loop. */
export const MIN_ALARM_DELAY_MS = 1000;

/** Inputs required to compute the next Durable Object alarm timestamp. */
export interface NextAlarmInput {
  /** Current wall-clock time in epoch milliseconds. */
  now: number;
  /** Every configured monitor together with its last-run bookkeeping. */
  monitors: ScheduledMonitor[];
  /** Whether scheduled speed testing is enabled. */
  speedEnabled: boolean;
  /** Timestamp of the last completed speed-test run (epoch ms), or `0`. */
  lastSpeedAt: number;
}

/**
 * Pure interval arithmetic for the monitoring engine.
 *
 * Given each monitor's cadence and the speed-test schedule, it works out when
 * the next Durable Object alarm should fire. The math is deliberately free of
 * any Cloudflare runtime dependency so it can be unit-tested directly; the
 * environment-derived interval resolvers are injected by the caller (the
 * {@link MonitorDurableObject}, which supplies the `config.ts` resolvers).
 */
export class ProbeScheduler {
  constructor(
    private readonly resolveIntervalSeconds: () => number,
    private readonly resolveSpeedIntervalSeconds: () => number,
  ) {}

  /** Global default interval (ms) applied to monitors without their own. */
  defaultIntervalMs(): number {
    return this.resolveIntervalSeconds() * 1000;
  }

  /** Interval (ms) for a single monitor, falling back to the global default. */
  intervalMsFor(target: MonitorTarget): number {
    return (target.intervalSeconds ?? this.resolveIntervalSeconds()) * 1000;
  }

  /**
   * Work out when the next alarm should fire: the soonest of every monitor's
   * next-due time and, when enabled, the next speed test. Falls back to the
   * default cadence when there is nothing to schedule, and never returns a time
   * sooner than {@link MIN_ALARM_DELAY_MS} from now to avoid a hot loop.
   */
  computeNextAlarmAt({ now, monitors, speedEnabled, lastSpeedAt }: NextAlarmInput): number {
    const candidates: number[] = [];

    for (const { target, lastRunAt } of monitors) {
      candidates.push(lastRunAt + this.intervalMsFor(target));
    }

    if (speedEnabled) {
      candidates.push(lastSpeedAt + this.resolveSpeedIntervalSeconds() * 1000);
    }

    // Fall back to the default cadence when there is nothing to schedule.
    const next = candidates.length > 0 ? Math.min(...candidates) : now + this.defaultIntervalMs();
    return Math.max(next, now + MIN_ALARM_DELAY_MS);
  }
}

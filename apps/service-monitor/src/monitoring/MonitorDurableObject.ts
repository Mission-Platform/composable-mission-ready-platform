import { DurableObject } from 'cloudflare:workers';

import {
  resolveIntervalSeconds,
  resolveRetentionMs,
  resolveSpeedBytes,
  resolveSpeedEnabled,
  resolveSpeedIntervalSeconds,
  resolveTargets,
} from './config';
import { IncidentManager } from './incidents';
import { runProbe } from './probes';
import { ProbeScheduler } from './scheduler';
import { SPEED_PROVIDER_META, SPEED_PROVIDERS } from './speed/providers';
import { MonitorStore } from './storage';

import type { SpeedProviderId, SpeedResult, SpeedStatus } from './speed/types';
import type {
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
 *
 * The heavy lifting is delegated to focused collaborators: {@link MonitorStore}
 * owns all persistence, {@link ProbeScheduler} owns the alarm interval math, and
 * {@link IncidentManager} owns the incident and maintenance lifecycle. This
 * class only wires them together and computes the roll-up views.
 */
export class MonitorDurableObject extends DurableObject<Env> {
  private readonly store: MonitorStore;
  private readonly scheduler: ProbeScheduler;
  private readonly incidents: IncidentManager;

  constructor(context: DurableObjectState, environment: Env) {
    super(context, environment);

    this.store = new MonitorStore(context.storage.sql);
    this.scheduler = new ProbeScheduler(resolveIntervalSeconds, resolveSpeedIntervalSeconds);
    this.incidents = new IncidentManager(context.storage.sql);

    // Ensure the schema exists, monitors are seeded and an alarm is scheduled
    // before any request is served by this instance.
    void this.ctx.blockConcurrencyWhile(async () => {
      this.store.migrate();
      this.store.seedIfEmpty(resolveTargets());
      await this.rescheduleAlarm();
    });
  }

  // ── Scheduling ─────────────────────────────────────────────────────────────

  /**
   * Set the alarm to fire when the next monitor (or the next speed test) is due.
   * Called after every run and whenever the configuration changes.
   */
  private async rescheduleAlarm(): Promise<void> {
    const now = Date.now();
    const speedEnabled = resolveSpeedEnabled();
    const lastSpeedAt = speedEnabled ? ((await this.ctx.storage.get<number>(LAST_SPEED_TEST_KEY)) ?? 0) : 0;
    const next = this.scheduler.computeNextAlarmAt({
      now,
      monitors: this.store.loadMonitors(),
      speedEnabled,
      lastSpeedAt,
    });
    await this.ctx.storage.setAlarm(next);
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

  /** List the configured monitors (used by `GET /api/monitors`). */
  listMonitors(): MonitorTarget[] {
    return this.store.loadMonitors().map((entry) => entry.target);
  }

  /**
   * Create or update a monitor at runtime, probe it immediately so the
   * dashboard reflects the change, then re-arm the alarm.
   */
  async upsertMonitor(target: MonitorTarget): Promise<void> {
    this.store.writeMonitor(target, 0);
    await this.probeAndStore(target);
    await this.rescheduleAlarm();
  }

  /** Remove a monitor and its samples, then re-arm the alarm. */
  async deleteMonitor(id: string): Promise<void> {
    this.store.deleteMonitor(id);
    await this.rescheduleAlarm();
  }

  // ── Probing ─────────────────────────────────────────────────────────────────

  /** Probe every monitor whose interval has elapsed and record the results. */
  private async runDueChecks(): Promise<void> {
    const now = Date.now();
    const due = this.store
      .loadMonitors()
      .filter(({ target, lastRunAt }) => now - lastRunAt >= this.scheduler.intervalMsFor(target));
    await Promise.all(due.map(({ target }) => this.probeAndStore(target)));
  }

  /** Probe every monitor immediately, ignoring their individual schedules. */
  async runChecks(): Promise<void> {
    await Promise.all(this.store.loadMonitors().map(({ target }) => this.probeAndStore(target)));
  }

  /** Run one probe, store the sample and stamp the monitor's last-run time. */
  private async probeAndStore(target: MonitorTarget): Promise<void> {
    const sample = await runProbe(target);
    this.store.insertSample(sample);
    this.incidents.updateAutomaticIncident(target, sample);
    this.store.stampLastRun(target.id, sample.ts);
  }

  // ── Incidents & maintenance ─────────────────────────────────────────────────

  listIncidents(): Incident[] {
    return this.incidents.listIncidents();
  }

  createIncident(input: {
    serviceId?: string | null;
    title: string;
    description?: string;
    severity?: IncidentSeverity;
    automatic?: boolean;
  }): Incident {
    return this.incidents.createIncident(input);
  }

  updateIncident(
    id: string,
    input: { status?: IncidentStatus; description?: string; severity?: IncidentSeverity },
  ): Incident | null {
    return this.incidents.updateIncident(id, input);
  }

  addIncidentUpdate(
    incidentId: string,
    input: { message: string; status?: IncidentStatus | null },
  ): IncidentUpdate | null {
    return this.incidents.addIncidentUpdate(incidentId, input);
  }

  updatePostIncidentReport(id: string, report: string): Incident | null {
    return this.incidents.updatePostIncidentReport(id, report);
  }

  listMaintenance(): MaintenanceWindow[] {
    return this.incidents.listMaintenance();
  }

  createMaintenance(input: Omit<MaintenanceWindow, 'id' | 'createdAt' | 'cancelledAt'>): MaintenanceWindow {
    return this.incidents.createMaintenance(input);
  }

  updateMaintenance(
    id: string,
    input: Partial<
      Pick<MaintenanceWindow, 'title' | 'description' | 'serviceId' | 'startsAt' | 'endsAt' | 'cancelledAt'>
    >,
  ): MaintenanceWindow | null {
    return this.incidents.updateMaintenance(id, input);
  }

  // ── Roll-ups & series ───────────────────────────────────────────────────────

  /** Drop samples older than the retention window. */
  private prune(): void {
    this.store.pruneSamples(Date.now() - resolveRetentionMs());
  }

  /**
   * Roll up the current status for every configured monitor across the retained
   * window. Called by the worker to answer `GET /api/services`.
   */
  getServices(): ServiceStatus[] {
    const since = Date.now() - resolveRetentionMs();
    return this.listMonitors().map((target) => {
      const samples = this.store.getSamples(target.id, since);
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
    return this.store.getSamples(service, since);
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
      this.store.insertSpeed(result);
    }
    this.store.pruneSpeed(Date.now() - resolveRetentionMs());
    await this.ctx.storage.put(LAST_SPEED_TEST_KEY, Date.now());
    return results;
  }

  /**
   * Roll up the current status for every speed-test provider across the
   * retained window. Called by the worker to answer `GET /api/speed`.
   */
  getSpeed(): SpeedStatus[] {
    const since = Date.now() - resolveRetentionMs();
    return SPEED_PROVIDER_META.map((provider) => {
      const samples = this.store.getSpeedSamples(provider.id, since);
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
    return this.store.getSpeedSamples(provider, since);
  }

  /** Trigger an immediate speed-test run (used by the manual "Run" button). */
  async runSpeedNow(): Promise<SpeedResult[]> {
    return this.runSpeedTests();
  }
}

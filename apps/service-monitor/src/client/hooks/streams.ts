import { from, of, timer, type Observable } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';

import type { SpeedProviderId, SpeedResponse, SpeedResult, SpeedSeriesResponse } from '@/monitoring/speed/types';
import type { MetricsResponse, MonitorTarget, MonitorsResponse, Sample, ServicesResponse } from '@/monitoring/types';

/** Fetch and parse JSON, throwing on non-2xx responses. */
async function fetchJson<T>(input: string): Promise<T> {
  const response = await fetch(input, { credentials: 'same-origin', headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Request to ${input} failed with HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

/**
 * Poll `GET /api/services` on a fixed cadence. A failed request emits `null`
 * for that tick (via the inner `catchError`) without terminating the outer
 * interval, so the dashboard keeps trying on the next beat. The stream is
 * shared and replays its latest value to late subscribers.
 */
export function servicesStream(intervalMs: number): Observable<ServicesResponse | null> {
  return timer(0, intervalMs).pipe(
    switchMap(() => from(fetchJson<ServicesResponse>('/api/services')).pipe(catchError(() => of(null)))),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}

/** Fetch the private monitor configuration only for an authenticated management view. */
export async function loadMonitors(): Promise<MonitorTarget[]> {
  const response = await fetchJson<MonitorsResponse>('/api/monitors');
  return response.monitors;
}

/**
 * Poll `GET /api/metrics` for a single service and project the response down to
 * just its ordered samples.
 */
export function metricsStream(service: string, intervalMs: number): Observable<Sample[]> {
  return timer(0, intervalMs).pipe(
    switchMap(() =>
      from(fetchJson<MetricsResponse>(`/api/metrics?service=${encodeURIComponent(service)}`)).pipe(
        map((response) => response.samples),
        catchError(() => of<Sample[]>([])),
      ),
    ),
    distinctUntilChanged((a, b) => a.length === b.length && a.at(-1)?.ts === b.at(-1)?.ts),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}

/**
 * Poll `GET /api/speed` on a fixed cadence for the rolled-up speed-test results
 * across every provider. Failed ticks emit `null` without ending the stream.
 */
export function speedStream(intervalMs: number): Observable<SpeedResponse | null> {
  return timer(0, intervalMs).pipe(
    switchMap(() => from(fetchJson<SpeedResponse>('/api/speed')).pipe(catchError(() => of(null)))),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}

/**
 * Poll `GET /api/speed/series` for a single provider and project the response
 * down to its ordered samples, so the speed graph updates live.
 */
export function speedSeriesStream(provider: SpeedProviderId, intervalMs: number): Observable<SpeedResult[]> {
  return timer(0, intervalMs).pipe(
    switchMap(() =>
      from(fetchJson<SpeedSeriesResponse>(`/api/speed/series?provider=${encodeURIComponent(provider)}`)).pipe(
        map((response) => response.samples),
        catchError(() => of<SpeedResult[]>([])),
      ),
    ),
    distinctUntilChanged((a, b) => a.length === b.length && a.at(-1)?.ts === b.at(-1)?.ts),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}

/** Trigger an immediate server-side speed-test run across every provider. */
export async function triggerSpeedRun(): Promise<void> {
  await fetch('/api/speed/run', { credentials: 'same-origin', method: 'POST' });
}

/** Create or update a monitor at runtime. Returns `true` on success. */
export async function saveMonitor(monitor: MonitorTarget): Promise<boolean> {
  const response = await fetch('/api/monitors', {
    credentials: 'same-origin',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(monitor),
  });
  return response.ok;
}

/** Remove a monitor (and its stored samples) at runtime. */
export async function deleteMonitor(id: string): Promise<boolean> {
  const response = await fetch(`/api/monitors?id=${encodeURIComponent(id)}`, {
    credentials: 'same-origin',
    method: 'DELETE',
  });
  return response.ok;
}

/** Exchange the operator token for an HttpOnly browser session cookie. */
export async function createMonitorSession(token: string): Promise<boolean> {
  const response = await fetch('/api/auth/session', {
    body: JSON.stringify({ token }),
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  return response.ok;
}

/** Check whether the current browser has an authenticated monitor session. */
export async function hasMonitorSession(): Promise<boolean> {
  const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
  if (!response.ok) return false;
  const body = (await response.json()) as { authenticated?: unknown };
  return body.authenticated === true;
}

import {
  resolveIntervalSeconds,
  resolveRetentionMs,
  resolveSpeedEnabled,
  resolveSpeedIntervalSeconds,
  sanitizeMonitor,
} from '@/monitoring/config';
import { getMonitor } from '@/monitoring/store';
import type { SpeedProviderId, SpeedResponse, SpeedSeriesResponse } from '@/monitoring/speed/types';
import type { MetricsResponse, MonitorsResponse, ServicesResponse } from '@/monitoring/types';

/** Serialize a value as a JSON `Response` with sensible caching headers. */
function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...init?.headers,
    },
  });
}

/**
 * `GET /api/services` — current rolled-up status for every monitored service.
 * The heavy lifting happens inside the Durable Object; this handler only
 * shapes the response.
 */
export async function handleServices(): Promise<Response> {
  const monitor = getMonitor();
  const services = await monitor.getServices();

  const payload: ServicesResponse = {
    now: Date.now(),
    intervalSeconds: resolveIntervalSeconds(),
    services,
  };
  return json(payload);
}

/**
 * `GET /api/metrics?service=<id>&since=<ms>` — raw time series for one service.
 * `since` defaults to the full retention window when omitted.
 */
export async function handleMetrics(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const service = url.searchParams.get('service');
  if (!service) {
    return json({ error: 'Missing required "service" query parameter.' }, { status: 400 });
  }

  const sinceParam = Number.parseInt(url.searchParams.get('since') ?? '', 10);
  const since = Number.isFinite(sinceParam) ? sinceParam : Date.now() - resolveRetentionMs();

  const monitor = getMonitor();
  const samples = await monitor.getMetrics(service, since);

  const payload: MetricsResponse = {
    service,
    now: Date.now(),
    since,
    samples,
  };
  return json(payload);
}

/**
 * `POST /api/check` — trigger an immediate server-side probe cycle. Useful for
 * seeding the dashboard on first load instead of waiting for the next alarm.
 */
export async function handleCheckNow(): Promise<Response> {
  const monitor = getMonitor();
  await monitor.checkNow();
  return json({ ok: true });
}

/**
 * `GET /api/monitors` — the current runtime monitor configuration. Monitors are
 * stored server-side and can be added, edited or removed at runtime.
 */
export async function handleMonitors(): Promise<Response> {
  const monitor = getMonitor();
  const monitors = await monitor.listMonitors();
  const payload: MonitorsResponse = {
    defaultIntervalSeconds: resolveIntervalSeconds(),
    monitors,
  };
  return json(payload);
}

/**
 * `POST /api/monitors` — create or update a monitor. The body is validated and
 * normalised; unusable payloads are rejected with `400`. The new monitor is
 * probed immediately so the change is reflected without waiting for the alarm.
 */
export async function handleMonitorUpsert(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const target = sanitizeMonitor(body);
  if (!target) {
    return json(
      { error: 'Invalid monitor: "id" and "name" are required, plus a "url" (http/json/graphql) or "host".' },
      { status: 400 },
    );
  }

  const monitor = getMonitor();
  await monitor.upsertMonitor(target);
  return json({ ok: true, monitor: target });
}

/**
 * `DELETE /api/monitors?id=<id>` — remove a monitor and its stored samples.
 */
export async function handleMonitorDelete(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return json({ error: 'Missing required "id" query parameter.' }, { status: 400 });
  }

  const monitor = getMonitor();
  await monitor.deleteMonitor(id);
  return json({ ok: true });
}

/**
 * `/api/monitors` — dispatch to the list / upsert / delete handlers based on
 * the HTTP method so a single route can serve the whole CRUD surface.
 */
export function handleMonitorsRoute(request: Request): Promise<Response> {
  switch (request.method) {
    case 'POST':
    case 'PUT':
      return handleMonitorUpsert(request);
    case 'DELETE':
      return handleMonitorDelete(request);
    default:
      return handleMonitors();
  }
}

/**
 * `GET /api/speed` — rolled-up speed-test results per provider (Cloudflare,
 * Fast.com, Speedtest).
 */
export async function handleSpeed(): Promise<Response> {
  const monitor = getMonitor();
  const providers = await monitor.getSpeed();

  const payload: SpeedResponse = {
    now: Date.now(),
    intervalSeconds: resolveSpeedIntervalSeconds(),
    enabled: resolveSpeedEnabled(),
    providers,
  };
  return json(payload);
}

/**
 * `GET /api/speed/series?provider=<id>&since=<ms>` — raw speed time series for
 * one provider.
 */
export async function handleSpeedSeries(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider') as SpeedProviderId | null;
  if (!provider) {
    return json({ error: 'Missing required "provider" query parameter.' }, { status: 400 });
  }

  const sinceParam = Number.parseInt(url.searchParams.get('since') ?? '', 10);
  const since = Number.isFinite(sinceParam) ? sinceParam : Date.now() - resolveRetentionMs();

  const monitor = getMonitor();
  const samples = await monitor.getSpeedSeries(provider, since);

  const payload: SpeedSeriesResponse = { provider, now: Date.now(), since, samples };
  return json(payload);
}

/**
 * `POST /api/speed/run` — trigger an immediate speed-test run across every
 * provider and return the fresh results.
 */
export async function handleSpeedRun(): Promise<Response> {
  const monitor = getMonitor();
  const results = await monitor.runSpeedNow();
  return json({ ok: true, results });
}

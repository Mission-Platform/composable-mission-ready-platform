import { env } from 'cloudflare:workers';

import { authorizeMonitorRequest, handleMonitorSession } from '@/app/auth';
import {
  resolveIntervalSeconds,
  resolveRetentionMs,
  resolveSpeedEnabled,
  resolveSpeedIntervalSeconds,
  sanitizeMonitor,
} from '@/monitoring/config';
import { isIncidentSeverity, isIncidentStatus, validMaintenanceRange } from '@/monitoring/incidents';
import { getMonitor } from '@/monitoring/store';

import type { SpeedProviderId, SpeedResponse, SpeedSeriesResponse } from '@/monitoring/speed/types';
import type { MetricsResponse, MonitorsResponse, ServicesResponse } from '@/monitoring/types';

/** Serialize a value as a JSON `Response` with sensible caching headers. */
function json(body: unknown, init?: ResponseInit): Response {
  return Response.json(body, {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...init?.headers,
    },
  });
}

/** Return the authentication failure for an administrative API request. */
function requireAuthentication(request: Request): Response | null {
  return authorizeMonitorRequest(request, env.MONITOR_API_TOKEN);
}

/** `/api/auth/session` — establish or clear the browser's administrative session. */
export function handleAuthSession(request: Request): Promise<Response> {
  return handleMonitorSession(request, env.MONITOR_API_TOKEN);
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

  const sinceParameter = Number.parseInt(url.searchParams.get('since') ?? '', 10);
  const since = Number.isFinite(sinceParameter) ? sinceParameter : Date.now() - resolveRetentionMs();

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
export async function handleCheckNow(request: Request): Promise<Response> {
  const authenticationFailure = requireAuthentication(request);
  if (authenticationFailure) return authenticationFailure;

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
  const authenticationFailure = requireAuthentication(request);
  if (authenticationFailure) return authenticationFailure;

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
  const authenticationFailure = requireAuthentication(request);
  if (authenticationFailure) return authenticationFailure;

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
export async function handleMonitorsRoute(request: Request): Promise<Response> {
  const authenticationFailure = requireAuthentication(request);
  if (authenticationFailure) return authenticationFailure;

  switch (request.method) {
    case 'POST':
    case 'PUT': {
      return handleMonitorUpsert(request);
    }
    case 'DELETE': {
      return handleMonitorDelete(request);
    }
    case 'GET': {
      return handleMonitors();
    }
    default: {
      return json({ error: 'Method not allowed.' }, { status: 405, headers: { allow: 'GET, POST, PUT, DELETE' } });
    }
  }
}

/** Runtime incident listing, reporting, and status updates. */
export async function handleIncidentsRoute(request: Request): Promise<Response> {
  const authenticationFailure = requireAuthentication(request);
  if (authenticationFailure) return authenticationFailure;

  const monitor = getMonitor();
  if (request.method === 'GET') return json({ incidents: await monitor.listIncidents() });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (request.method === 'POST') {
    if (typeof body.title !== 'string' || !body.title.trim())
      return json({ error: 'A title is required.' }, { status: 400 });
    if (body.severity !== undefined && !isIncidentSeverity(body.severity))
      return json({ error: 'Invalid incident severity.' }, { status: 400 });
    const incident = await monitor.createIncident({
      title: body.title.trim(),
      description: typeof body.description === 'string' ? body.description.trim() : '',
      serviceId: typeof body.serviceId === 'string' && body.serviceId ? body.serviceId : null,
      severity: isIncidentSeverity(body.severity) ? body.severity : 'minor',
    });
    return json({ incident }, { status: 201 });
  }
  if (request.method === 'PATCH' && typeof body.id === 'string') {
    if (body.operation === 'update') {
      if (typeof body.message !== 'string' || !body.message.trim())
        return json({ error: 'An update message is required.' }, { status: 400 });
      if (body.status !== undefined && body.status !== null && !isIncidentStatus(body.status))
        return json({ error: 'Invalid incident status.' }, { status: 400 });
      const update = await monitor.addIncidentUpdate(body.id, {
        message: body.message.trim(),
        status: isIncidentStatus(body.status) ? body.status : null,
      });
      return update ? json({ update }) : json({ error: 'Incident not found.' }, { status: 404 });
    }
    if (body.operation === 'post-report') {
      if (typeof body.report !== 'string')
        return json({ error: 'A post-incident report is required.' }, { status: 400 });
      const incident = await monitor.updatePostIncidentReport(body.id, body.report.trim());
      return incident
        ? json({ incident })
        : json({ error: 'Only resolved incidents can have a post-incident report.' }, { status: 409 });
    }
    if (body.status !== undefined && !isIncidentStatus(body.status))
      return json({ error: 'Invalid incident status.' }, { status: 400 });
    if (body.severity !== undefined && !isIncidentSeverity(body.severity))
      return json({ error: 'Invalid incident severity.' }, { status: 400 });
    const incident = await monitor.updateIncident(body.id, {
      status: isIncidentStatus(body.status) ? body.status : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      severity: isIncidentSeverity(body.severity) ? body.severity : undefined,
    });
    return incident ? json({ incident }) : json({ error: 'Incident not found.' }, { status: 404 });
  }
  return json({ error: 'Unsupported incident operation.' }, { status: 405 });
}

/** Planned maintenance listing, creation, and updates. */
export async function handleMaintenanceRoute(request: Request): Promise<Response> {
  const authenticationFailure = requireAuthentication(request);
  if (authenticationFailure) return authenticationFailure;

  const monitor = getMonitor();
  if (request.method === 'GET') return json({ maintenance: await monitor.listMaintenance() });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (typeof body.title !== 'string' || !body.title.trim())
    return json({ error: 'A title is required.' }, { status: 400 });
  if (!validMaintenanceRange(body.startsAt, body.endsAt))
    return json({ error: 'startsAt and endsAt must be finite numbers with startsAt before endsAt.' }, { status: 400 });
  const input = {
    title: body.title.trim(),
    description: typeof body.description === 'string' ? body.description.trim() : '',
    serviceId: typeof body.serviceId === 'string' && body.serviceId ? body.serviceId : null,
    startsAt: body.startsAt,
    endsAt: body.endsAt as number,
  };
  if (request.method === 'POST') return json({ maintenance: await monitor.createMaintenance(input) }, { status: 201 });
  if (request.method === 'PATCH' && typeof body.id === 'string') {
    const update =
      body.cancelled === true
        ? { ...input, cancelledAt: Date.now() }
        : body.cancelled === false
          ? { ...input, cancelledAt: null }
          : input;
    const maintenance = await monitor.updateMaintenance(body.id, update);
    return maintenance ? json({ maintenance }) : json({ error: 'Maintenance window not found.' }, { status: 404 });
  }
  return json({ error: 'Unsupported maintenance operation.' }, { status: 405 });
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

  const sinceParameter = Number.parseInt(url.searchParams.get('since') ?? '', 10);
  const since = Number.isFinite(sinceParameter) ? sinceParameter : Date.now() - resolveRetentionMs();

  const monitor = getMonitor();
  const samples = await monitor.getSpeedSeries(provider, since);

  const payload: SpeedSeriesResponse = { provider, now: Date.now(), since, samples };
  return json(payload);
}

/**
 * `POST /api/speed/run` — trigger an immediate speed-test run across every
 * provider and return the fresh results.
 */
export async function handleSpeedRun(request: Request): Promise<Response> {
  const authenticationFailure = requireAuthentication(request);
  if (authenticationFailure) return authenticationFailure;

  const monitor = getMonitor();
  const results = await monitor.runSpeedNow();
  return json({ ok: true, results });
}

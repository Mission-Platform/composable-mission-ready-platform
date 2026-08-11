import { render, route } from 'rwsdk/router';
import { defineApp } from 'rwsdk/worker';

import {
  handleAuthSession,
  handleCheckNow,
  handleIncidentsRoute,
  handleMaintenanceRoute,
  handleMetrics,
  handleMonitorsRoute,
  handleServices,
  handleSpeed,
  handleSpeedRun,
  handleSpeedSeries,
} from '@/app/api';
import { Document } from '@/app/Document';
import { DashboardPage } from '@/app/pages/DashboardPage';
import { IncidentsPage } from '@/app/pages/IncidentsPage';
import { MonitorsPage } from '@/app/pages/MonitorsPage';
import { SummaryPage } from '@/app/pages/SummaryPage';

// The Durable Object must be exported from the worker entry so the runtime can
// instantiate it for the `MONITOR` binding declared in `wrangler.jsonc`.
export { MonitorDurableObject } from '@/monitoring/MonitorDurableObject';

export default defineApp([
  // JSON API — consumed by the RxJS client streams. Declared before `render`
  // so these routes return raw JSON instead of the HTML document.
  route('/api/services', handleServices),
  route('/api/metrics', ({ request }) => handleMetrics(request)),
  route('/api/monitors', ({ request }) => handleMonitorsRoute(request)),
  route('/api/incidents', ({ request }) => handleIncidentsRoute(request)),
  route('/api/maintenance', ({ request }) => handleMaintenanceRoute(request)),
  route('/api/check', ({ request }) => handleCheckNow(request)),
  route('/api/auth/session', ({ request }) => handleAuthSession(request)),
  route('/api/speed', handleSpeed),
  route('/api/speed/series', ({ request }) => handleSpeedSeries(request)),
  route('/api/speed/run', ({ request }) => handleSpeedRun(request)),

  // HTML — the server-rendered dashboard shell and the monitors management page.
  render(Document, [
    route('/', SummaryPage),
    route('/dashboard', DashboardPage),
    route('/monitors', MonitorsPage),
    route('/incidents', IncidentsPage),
  ]),
]);

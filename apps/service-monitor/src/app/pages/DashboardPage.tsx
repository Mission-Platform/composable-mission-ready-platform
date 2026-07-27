import { AppProviders } from '@/client/AppProviders';
import { LiveDashboard } from '@/client/components/live-dashboard';
import { resolveIntervalSeconds, resolveSpeedEnabled, resolveSpeedIntervalSeconds } from '@/monitoring/config';
import { getMonitor } from '@/monitoring/store';

/**
 * Server component for `/`. It reads the current status straight from the
 * monitoring Durable Object (running one immediate probe cycle if the store is
 * still empty) and hands that snapshot to the client dashboard as its initial
 * state, so the page is populated on first paint before RxJS takes over.
 */
export async function DashboardPage() {
  const monitor = getMonitor();

  let services = await monitor.getServices();
  const hasData = services.some((service) => service.sampleCount > 0);
  if (!hasData) {
    await monitor.checkNow();
    services = await monitor.getServices();
  }

  const speed = await monitor.getSpeed();

  return (
    <AppProviders>
      <LiveDashboard
        initialServices={services}
        initialIncidents={await monitor.listIncidents()}
        initialSpeed={speed}
        intervalSeconds={resolveIntervalSeconds()}
        speedIntervalSeconds={resolveSpeedIntervalSeconds()}
        speedEnabled={resolveSpeedEnabled()}
        initialNow={Date.now()}
      />
    </AppProviders>
  );
}

import { env } from 'cloudflare:workers';

import type { MonitorDurableObject } from './MonitorDurableObject';

/** Name of the single, global monitoring Durable Object instance. */
const GLOBAL_INSTANCE = 'global';

/**
 * Resolve the stub for the singleton {@link MonitorDurableObject}. Using a
 * fixed name guarantees every request talks to the same server-side monitor
 * and its embedded time-series database.
 */
export function getMonitor(): DurableObjectStub<MonitorDurableObject> {
  const id = env.MONITOR.idFromName(GLOBAL_INSTANCE);
  return env.MONITOR.get(id);
}

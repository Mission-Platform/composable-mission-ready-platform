import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_TARGETS } from './config';
import { PROBE_TYPES } from './types';

vi.mock('cloudflare:workers', () => ({ env: {} }));

describe('monitor probe types', () => {
  it('includes unified network monitoring alongside all service probes', () => {
    expect(PROBE_TYPES).toEqual(['http', 'json', 'graphql', 'dns', 'tcp', 'mqtt', 'udp', 'ntp', 'network']);
  });

  it('does not seed unsupported UDP or NTP probes by default', () => {
    expect(DEFAULT_TARGETS.some((target) => target.type === 'udp' || target.type === 'ntp')).toBe(false);
  });
});

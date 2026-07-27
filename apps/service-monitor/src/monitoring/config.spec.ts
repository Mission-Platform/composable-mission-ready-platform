import { describe, expect, it } from 'vitest';

import { PROBE_TYPES } from './types';

describe('monitor probe types', () => {
  it('includes unified network monitoring alongside all service probes', () => {
    expect(PROBE_TYPES).toEqual(['http', 'json', 'graphql', 'dns', 'tcp', 'mqtt', 'udp', 'ntp', 'network']);
  });
});

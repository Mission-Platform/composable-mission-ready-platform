import { describe, expect, it } from 'vitest';
import { toPublicMonitorTarget } from './types';

describe('toPublicMonitorTarget', () => {
  it('projects only public fields', () => {
    const fullTarget = {
      id: 'test-id',
      name: 'test-name',
      type: 'http' as const,
      url: 'https://secret.com',
      host: 'secret-host',
      port: 8080,
      query: 'secret-query',
      method: 'POST',
      degradedAboveMs: 100,
      failThreshold: 3,
      successThreshold: 3,
      intervalSeconds: 60,
    };
    const publicTarget = toPublicMonitorTarget(fullTarget);
    expect(publicTarget).toEqual({
      id: 'test-id',
      name: 'test-name',
      type: 'http',
    });
    expect(publicTarget).not.toHaveProperty('url');
    expect(publicTarget).not.toHaveProperty('host');
    expect(publicTarget).not.toHaveProperty('port');
    expect(publicTarget).not.toHaveProperty('query');
    expect(publicTarget).not.toHaveProperty('method');
    expect(publicTarget).not.toHaveProperty('degradedAboveMs');
    expect(publicTarget).not.toHaveProperty('failThreshold');
    expect(publicTarget).not.toHaveProperty('successThreshold');
    expect(publicTarget).not.toHaveProperty('intervalSeconds');
  });
});

import { describe, expect, it } from 'vitest';

import { isAllowedMonitorHost, isAllowedMonitorUrl, sanitizeMonitor } from './validation';

describe('monitor destination policy', () => {
  it('rejects private HTTP destinations and non-approved public ports by default', () => {
    expect(isAllowedMonitorUrl('https://127.0.0.1/health')).toBe(false);
    expect(isAllowedMonitorUrl('https://example.com:22/health')).toBe(false);
    expect(isAllowedMonitorHost('localhost', 3000)).toBe(false);
  });

  it('rejects alternate loopback and unspecified-address forms', () => {
    expect(isAllowedMonitorUrl('https://[::ffff:127.0.0.1]/health')).toBe(false);
    expect(isAllowedMonitorUrl('https://[::ffff:7f00:1]/health')).toBe(false);
    expect(isAllowedMonitorUrl('https://[::]/health')).toBe(false);
    expect(isAllowedMonitorHost('127.1')).toBe(false);
    expect(isAllowedMonitorHost('2130706433')).toBe(false);
    expect(isAllowedMonitorHost('::ffff:127.0.0.1')).toBe(false);
  });

  it('allows explicitly trusted private destinations with bounded custom ports', () => {
    const policy = { allowPrivateDestinations: true };
    expect(isAllowedMonitorUrl('http://127.0.0.1:3000/health', policy)).toBe(true);
    expect(isAllowedMonitorHost('localhost', 3000, policy)).toBe(true);
    expect(isAllowedMonitorHost('localhost', 70_000, policy)).toBe(false);
  });

  it('supports exact and wildcard destination allowlists', () => {
    const policy = { allowedDestinations: ['status.example.com', '*.trusted.example'] };
    expect(isAllowedMonitorUrl('https://status.example.com/health', policy)).toBe(true);
    expect(isAllowedMonitorUrl('https://api.trusted.example/health', policy)).toBe(true);
    expect(isAllowedMonitorUrl('https://other.example/health', policy)).toBe(false);
  });
});

describe('monitor configuration bounds', () => {
  it('rejects oversized identifiers, URLs, and GraphQL queries', () => {
    expect(sanitizeMonitor({ id: 'x'.repeat(129), name: 'Service', url: 'https://example.com' })).toBeNull();
    expect(
      sanitizeMonitor({ id: 'service', name: 'Service', url: `https://example.com/${'x'.repeat(2050)}` }),
    ).toBeNull();
    expect(
      sanitizeMonitor({
        id: 'service',
        name: 'Service',
        type: 'graphql',
        url: 'https://example.com',
        query: 'x'.repeat(16_385),
      }),
    ).toBeNull();
  });
});

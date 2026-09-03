import { describe, expect, it } from 'vitest';

import { ForgeGauge, type GaugeProperties } from './forge-gauge';

describe('ForgeGauge', () => {
  it('renders a clamped circular SVG meter with exact meter semantics', () => {
    const element = ForgeGauge({ value: 140, min: 0, max: 100, label: 'Health', size: 'lg' });
    const rendered = JSON.stringify(element);

    expect(rendered).toContain('"type":"svg"');
    expect(rendered).toContain('"role":"meter"');
    expect(rendered).toContain('"aria-label":"Health"');
    expect(rendered).toContain('"aria-valuemin":0');
    expect(rendered).toContain('"aria-valuemax":100');
    expect(rendered).toContain('"aria-valuenow":100');
    expect(rendered).toContain('forge-gauge--lg');
    expect(rendered).toContain('forge-gauge__svg');
    expect(rendered).toContain('forge-gauge__arc');
    expect(rendered).toContain('stroke-dasharray');
    expect(rendered).toContain('Health');
    expect(rendered).toContain('100%');
  });

  it('requires value at the type level', () => {
    // @ts-expect-error Gauge value is required.
    ForgeGauge({ label: 'Missing value' });

    const validProperties: GaugeProperties = { value: 0 };
    expect(validProperties.value).toBe(0);
  });
});

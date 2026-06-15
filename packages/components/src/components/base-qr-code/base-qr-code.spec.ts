import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseQrCode from './base-qr-code.vue';
import { encodeQr } from './qr-encode';

/** Asserts a 7×7 finder pattern is present with its origin at (`ox`, `oy`). */
function expectFinderPattern(modules: boolean[][], ox: number, oy: number): void {
  for (let dy = 0; dy < 7; dy++) {
    for (let dx = 0; dx < 7; dx++) {
      const onBorder = dx === 0 || dx === 6 || dy === 0 || dy === 6;
      const inCenter = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
      expect(modules[oy + dy][ox + dx]).toBe(onBorder || inCenter);
    }
  }
}

describe('encodeQr', () => {
  it('produces a square matrix whose size is 4 * version + 17', () => {
    const qr = encodeQr('https://mission-platform.com');
    expect(qr.size).toBe(qr.version * 4 + 17);
    expect(qr.modules).toHaveLength(qr.size);
    for (const row of qr.modules) expect(row).toHaveLength(qr.size);
  });

  it('selects version 1 (21×21) for very short payloads', () => {
    const qr = encodeQr('hi', 'M');
    expect(qr.version).toBe(1);
    expect(qr.size).toBe(21);
  });

  it('selects a larger version as the payload grows', () => {
    const small = encodeQr('a', 'M');
    const big = encodeQr('a'.repeat(300), 'M');
    expect(big.version).toBeGreaterThan(small.version);
  });

  it('places the three finder patterns in the expected corners', () => {
    const { modules, size } = encodeQr('finder-patterns');
    expectFinderPattern(modules, 0, 0); // Top-left.
    expectFinderPattern(modules, size - 7, 0); // Top-right.
    expectFinderPattern(modules, 0, size - 7); // Bottom-left.
  });

  it('draws an alternating timing pattern on row / column 6', () => {
    const { modules, size } = encodeQr('timing');
    for (let index = 8; index < size - 8; index++) {
      expect(modules[6][index]).toBe(index % 2 === 0);
      expect(modules[index][6]).toBe(index % 2 === 0);
    }
  });

  it('is deterministic for the same input', () => {
    const a = encodeQr('determinism', 'Q');
    const b = encodeQr('determinism', 'Q');
    expect(b.version).toBe(a.version);
    expect(JSON.stringify(b.modules)).toBe(JSON.stringify(a.modules));
  });

  it('encodes more data at a lower error-correction level for the same version', () => {
    const low = encodeQr('x'.repeat(100), 'L');
    const high = encodeQr('x'.repeat(100), 'H');
    expect(high.version).toBeGreaterThanOrEqual(low.version);
  });

  it('throws when the payload is too large to fit any version', () => {
    expect(() => encodeQr('x'.repeat(10_000), 'H')).toThrow(RangeError);
  });
});

describe('BaseQrCode', () => {
  it('renders an SVG sized by the size prop', () => {
    const wrapper = mountWithI18n(BaseQrCode, { props: { value: 'hello', size: 200 } });
    const svg = wrapper.find('svg.base-qr-code');
    expect(svg.exists()).toBe(true);
    expect(svg.attributes('width')).toBe('200');
    expect(svg.attributes('height')).toBe('200');
  });

  it('expands the viewBox by the quiet-zone margin on both axes', () => {
    const wrapper = mountWithI18n(BaseQrCode, { props: { value: 'hi', margin: 4 } });
    // version 1 = 21 modules; + 2 * 4 margin = 29.
    expect(wrapper.find('svg').attributes('viewBox')).toBe('0 0 29 29');
  });

  it('emits an SVG path for the dark modules and a background rect', () => {
    const wrapper = mountWithI18n(BaseQrCode, { props: { value: 'modules' } });
    expect(wrapper.find('.base-qr-code__background').exists()).toBe(true);
    expect(wrapper.find('.base-qr-code__modules').attributes('d')?.length).toBeGreaterThan(0);
  });

  it('exposes an accessible role + label when ariaLabel is provided', () => {
    const wrapper = mountWithI18n(BaseQrCode, { props: { value: 'hi', ariaLabel: 'Open the app' } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('role')).toBe('img');
    expect(svg.attributes('aria-label')).toBe('Open the app');
  });

  it('hides itself from assistive tech and emits error for an unencodable payload', () => {
    const wrapper = mountWithI18n(BaseQrCode, { props: { value: 'x'.repeat(10_000), errorCorrection: 'H' } });
    expect(wrapper.find('svg').exists()).toBe(false);
    expect(wrapper.emitted('error')).toBeTruthy();
  });

  it('applies custom colours', () => {
    const wrapper = mountWithI18n(BaseQrCode, {
      props: { value: 'hi', color: '#123456', background: '#abcdef' },
    });
    expect(wrapper.find('.base-qr-code__modules').attributes('fill')).toBe('#123456');
    expect(wrapper.find('.base-qr-code__background').attributes('fill')).toBe('#abcdef');
  });
});

import { describe, expect, it } from 'vitest';

import {
  calculateFallbackPosition,
  isAnchorPositioningSupported,
  supportsAnchorPositioning,
} from './fallback-position';

describe('fallback-position utility', () => {
  it('reports whether anchor positioning is supported', () => {
    expect(typeof isAnchorPositioningSupported()).toBe('boolean');
    expect(typeof supportsAnchorPositioning).toBe('boolean');
  });

  it('calculates bottom placement coordinates accurately', () => {
    const triggerRect = {
      top: 100,
      bottom: 140,
      left: 200,
      right: 300,
      width: 100,
      height: 40,
    } as DOMRect;

    const result = calculateFallbackPosition(triggerRect, 'bottom', 8);
    expect(result.top).toBe(148);
    expect(result.left).toBe(250);
    expect(result.transform).toBe('translate(-50%, 0)');
  });

  it('calculates top-start placement coordinates accurately', () => {
    const triggerRect = {
      top: 100,
      bottom: 140,
      left: 200,
      right: 300,
      width: 100,
      height: 40,
    } as DOMRect;

    const result = calculateFallbackPosition(triggerRect, 'top-start', 4);
    expect(result.top).toBe(96);
    expect(result.left).toBe(200);
    expect(result.transform).toBe('translate(0, -100%)');
  });

  it('calculates right-end placement coordinates accurately', () => {
    const triggerRect = {
      top: 100,
      bottom: 140,
      left: 200,
      right: 300,
      width: 100,
      height: 40,
    } as DOMRect;

    const result = calculateFallbackPosition(triggerRect, 'right-end', 10);
    expect(result.top).toBe(140);
    expect(result.left).toBe(310);
    expect(result.transform).toBe('translate(0, -100%)');
  });
});

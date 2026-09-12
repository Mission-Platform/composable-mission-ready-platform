import { describe, expect, it } from 'vitest';

import {
  applyFallbackPosition,
  calculateFallbackPosition,
  isAnchorPositioningSupported,
  supportsAnchorPositioning,
  type FallbackPlacement,
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

  it('defaults to bottom-start placement when placement is omitted', () => {
    const triggerRect = {
      top: 100,
      bottom: 140,
      left: 200,
      right: 300,
      width: 100,
      height: 40,
    } as DOMRect;

    const result = calculateFallbackPosition(triggerRect);
    expect(result.top).toBe(140);
    expect(result.left).toBe(200);
    expect(result.transform).toBe('translate(0, 0)');
  });

  it('falls back to default bottom-start position when placement is unrecognized', () => {
    const triggerRect = {
      top: 100,
      bottom: 140,
      left: 200,
      right: 300,
      width: 100,
      height: 40,
    } as DOMRect;

    const result = calculateFallbackPosition(triggerRect, 'unsupported-placement' as FallbackPlacement, 5);
    expect(result.top).toBe(145);
    expect(result.left).toBe(200);
    expect(result.transform).toBe('translate(0, 0)');
  });

  it('applies fallback position and width styling to DOM elements', () => {
    const trigger = document.createElement('button');
    const panel = document.createElement('div');
    trigger.getBoundingClientRect = () =>
      ({
        top: 50,
        bottom: 80,
        left: 100,
        right: 250,
        width: 150,
        height: 30,
      }) as DOMRect;

    applyFallbackPosition(trigger, panel, 'bottom-start', { offset: 10, matchTriggerWidth: true });

    expect(panel.style.top).toBe('90px');
    expect(panel.style.left).toBe('100px');
    expect(panel.style.transform).toBe('translate(0, 0)');
    expect(panel.style.margin).toBe('0px');
    expect(panel.style.minWidth).toBe('150px');
  });

  it('handles numeric offset shorthand in applyFallbackPosition', () => {
    const trigger = document.createElement('button');
    const panel = document.createElement('div');
    trigger.getBoundingClientRect = () =>
      ({
        top: 50,
        bottom: 80,
        left: 100,
        right: 250,
        width: 150,
        height: 30,
      }) as DOMRect;

    applyFallbackPosition(trigger, panel, 'top', 6);

    expect(panel.style.top).toBe('44px');
    expect(panel.style.left).toBe('175px');
    expect(panel.style.transform).toBe('translate(-50%, -100%)');
    expect(panel.style.margin).toBe('0px');
  });
});

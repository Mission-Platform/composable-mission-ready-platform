import { describe, expect, it } from 'vitest';

import { centerDiffers, scalarDiffers } from './camera';

// These predicates guard `ForgeMapLibre`'s camera-sync effects: they must treat a
// value echoed back from the map (the controlled `onMove` round-trip) as
// unchanged so it is never re-applied, which is what stops the map from drifting
// north and zooming in forever.
describe('scalarDiffers', () => {
  it('is false for identical values', () => {
    expect(scalarDiffers(4, 4)).toBe(false);
  });

  it('is false for values within the default tolerance (echoed rounding)', () => {
    expect(scalarDiffers(1.5, 1.5 + 1e-9)).toBe(false);
  });

  it('is true for a meaningful change', () => {
    expect(scalarDiffers(1.5, 2)).toBe(true);
  });

  it('never reports a change when either value is not finite', () => {
    expect(scalarDiffers(Number.NaN, 3)).toBe(false);
    expect(scalarDiffers(3, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('honours a custom epsilon', () => {
    expect(scalarDiffers(0, 0.5, 1)).toBe(false);
    expect(scalarDiffers(0, 1.5, 1)).toBe(true);
  });
});

describe('centerDiffers', () => {
  it('is false when both longitude and latitude match', () => {
    expect(centerDiffers({ lng: 2.35, lat: 48.85 }, { lng: 2.35, lat: 48.85 })).toBe(false);
  });

  it('is false for sub-tolerance drift in latitude (the north-drift echo)', () => {
    expect(centerDiffers({ lng: 0, lat: 20 }, { lng: 0, lat: 20 + 1e-9 })).toBe(false);
  });

  it('is true when longitude differs', () => {
    expect(centerDiffers({ lng: 0, lat: 20 }, { lng: 5, lat: 20 })).toBe(true);
  });

  it('is true when latitude differs', () => {
    expect(centerDiffers({ lng: 0, lat: 20 }, { lng: 0, lat: 25 })).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import { contrastStretchLuma, imageDataToLuma, type LumaImage } from './image';

import type { ImageLike } from './types';

describe('imageDataToLuma', () => {
  it('collapses RGBA pixels to Rec. 601 luma and drops alpha', () => {
    // One black, one white, one pure red, one pure green pixel.
    const data = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 128, 0, 255, 0, 255]);
    const image: ImageLike = { width: 2, height: 2, data };

    const luma = imageDataToLuma(image);

    expect(luma.width).toBe(2);
    expect(luma.height).toBe(2);
    expect(luma.data.length).toBe(4);
    expect(luma.data[0]).toBe(0); // black
    expect(luma.data[1]).toBe(255); // white
    expect(luma.data[2]).toBe(Math.round(0.299 * 255)); // red, alpha ignored
    expect(luma.data[3]).toBe(Math.round(0.587 * 255)); // green
  });
});

describe('contrastStretchLuma', () => {
  it('stretches a low-contrast image across the full 0..255 range', () => {
    // A dull gradient confined to 100..140; the ends should reach 0 and 255.
    const data = Uint8Array.from({ length: 41 }, (_value, index) => 100 + index);
    const luma: LumaImage = { width: 41, height: 1, data };

    // Clip at the extremes (0% / 100%) so the observed min/max map to 0/255.
    const stretched = contrastStretchLuma(luma, 0, 1);

    expect(stretched.data[0]).toBe(0);
    expect(stretched.data.at(-1)).toBe(255);
    // Preserves the image geometry and never mutates the input.
    expect(stretched.width).toBe(41);
    expect(stretched.height).toBe(1);
    expect(data[0]).toBe(100);
  });

  it('clips values outside the chosen percentile window', () => {
    // A uniform 0..99 gradient; a 10%/90% window puts the tails outside it.
    const data = Uint8Array.from({ length: 100 }, (_value, index) => index);
    const luma: LumaImage = { width: 100, height: 1, data };

    const stretched = contrastStretchLuma(luma, 0.1, 0.9);

    // Values at/below the 10th percentile clamp to 0, at/above the 90th to 255.
    expect(stretched.data[0]).toBe(0); // darkest tail clamped low
    expect(stretched.data[5]).toBe(0);
    expect(stretched.data.at(-1)).toBe(255); // brightest tail clamped high
    expect(stretched.data.at(-5)).toBe(255);
    // A mid-window value lands somewhere strictly between the extremes.
    expect(stretched.data[50]).toBeGreaterThan(0);
    expect(stretched.data[50]).toBeLessThan(255);
  });

  it('returns a flat image unchanged', () => {
    const data = new Uint8Array([128, 128, 128, 128]);
    const luma: LumaImage = { width: 2, height: 2, data };

    const stretched = contrastStretchLuma(luma);

    // Nothing to stretch: the same buffer is handed straight back.
    expect(stretched.data).toBe(data);
  });

  it('handles an empty image without throwing', () => {
    const luma: LumaImage = { width: 0, height: 0, data: new Uint8Array(0) };

    expect(contrastStretchLuma(luma).data.length).toBe(0);
  });
});

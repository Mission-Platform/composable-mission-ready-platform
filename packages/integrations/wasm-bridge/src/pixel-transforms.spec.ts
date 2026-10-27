import { describe, expect, it } from 'vitest';

import {
  contrastStretchLuma,
  cropRegion,
  fitSize,
  imageDataToContrastStretchLuma,
  imageDataToLuma,
  percentileValue,
} from './pixel-transforms';

describe('Pixel Transforms & Image Helpers', () => {
  describe('cropRegion', () => {
    it('returns full bounds when roi is 1 or invalid', () => {
      expect(cropRegion(100, 200, 1)).toEqual({ x: 0, y: 0, width: 100, height: 200 });
      expect(cropRegion(100, 200, 0)).toEqual({ x: 0, y: 0, width: 100, height: 200 });
      expect(cropRegion(100, 200, -1)).toEqual({ x: 0, y: 0, width: 100, height: 200 });
    });

    it('crops central window when roi is between 0 and 1', () => {
      const region = cropRegion(1000, 800, 0.5);
      expect(region).toEqual({
        x: 250,
        y: 200,
        width: 500,
        height: 400,
      });
    });
  });

  describe('fitSize', () => {
    it('preserves dimensions when below maxEdge', () => {
      expect(fitSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    });

    it('scales dimensions proportionally when exceeding maxEdge', () => {
      expect(fitSize(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 });
      expect(fitSize(1000, 2000, 1000)).toEqual({ width: 500, height: 1000 });
    });
  });

  describe('imageDataToLuma', () => {
    it('converts RGBA pixels to 8-bit grayscale using Rec. 601', () => {
      const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);

      const luma = imageDataToLuma({ width: 2, height: 2, data: rgba });
      expect(luma.length).toBe(4);
      expect(luma[0]).toBe(Math.round(0.299 * 255));
      expect(luma[1]).toBe(Math.round(0.587 * 255));
      expect(luma[2]).toBe(Math.round(0.114 * 255));
      expect(luma[3]).toBe(255);
    });
  });

  describe('contrastStretchLuma', () => {
    it('handles empty buffers cleanly', () => {
      expect(contrastStretchLuma(new Uint8Array(0)).length).toBe(0);
    });

    it('enhances low contrast grayscale images', () => {
      // Uniform distribution from 50 to 150 across 100 pixels
      const pixels = new Uint8Array(100);
      for (let index = 0; index < 100; index++) {
        pixels[index] = 50 + index;
      }

      const stretched = contrastStretchLuma(pixels, 0.05, 0.95);
      expect(stretched.length).toBe(100);
      expect(stretched[0]).toBe(0);
      expect(stretched[99]).toBe(255);
    });

    it('converts RGBA directly to contrast stretched luma', () => {
      const rgba = new Uint8Array([100, 100, 100, 255, 150, 150, 150, 255, 200, 200, 200, 255, 250, 250, 250, 255]);
      const stretched = imageDataToContrastStretchLuma({ width: 2, height: 2, data: rgba });
      expect(stretched.length).toBe(4);
    });

    it('finds percentile intensity from histogram', () => {
      const hist = new Uint32Array(256);
      hist[10] = 50;
      hist[20] = 50;
      expect(percentileValue(hist, 100, 0.3)).toBe(10);
      expect(percentileValue(hist, 100, 0.7)).toBe(20);
    });
  });
});

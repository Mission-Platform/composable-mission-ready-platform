import { describe, expect, it, vi } from 'vitest';

import {
  calculateLogoLayout,
  computeGradientId,
  copyBlobToClipboard,
  copyTextToClipboard,
  downloadBlob,
  modulePath,
  rasterizeSvgToPngBlob,
  renderMatrixPath,
  resolveCodeActions,
  stableId,
} from './code-render';

describe('code-render utilities', () => {
  describe('modulePath', () => {
    it('generates standard square module path data', () => {
      expect(modulePath('square', 2, 3)).toBe('M2 3h1v1h-1z');
    });

    it('generates dot module path data with circle arcs', () => {
      expect(modulePath('dot', 4, 5)).toBe('M4 5.5a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0z');
    });

    it('generates rounded module path data with squircle arcs', () => {
      const path = modulePath('rounded', 1, 2);
      expect(path).toContain('M1.25 2h0.5a0.25 0.25 0 0 1 0.25 0.25v0.5');
    });
  });

  describe('renderMatrixPath', () => {
    it('concatenates path strings for dark modules only', () => {
      const grid = [
        [true, false],
        [false, true],
      ];
      const result = renderMatrixPath(
        2,
        2,
        (x, y) => grid[y][x],
        () => 'square',
        1,
      );
      // (0,0) -> (1,1) in quiet zone; (1,1) -> (2,2)
      expect(result).toBe('M1 1h1v1h-1zM2 2h1v1h-1z');
    });

    it('supports custom module shape per coordinate', () => {
      const result = renderMatrixPath(
        2,
        1,
        () => true,
        (x) => (x === 0 ? 'dot' : 'square'),
        0,
      );
      expect(result).toBe('M0 0.5a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0zM1 0h1v1h-1z');
    });
  });

  describe('stableId and computeGradientId', () => {
    it('generates deterministic hash IDs across calls', () => {
      const id1 = stableId('mp-test', 'linear:#000:#fff:45');
      const id2 = stableId('mp-test', 'linear:#000:#fff:45');
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^mp-test-[0-9a-z]+$/);
    });

    it('generates gradient IDs incorporating type and rotation', () => {
      const id = computeGradientId('mp-qr', {
        type: 'radial',
        from: '#ff0000',
        to: '#0000ff',
      });
      expect(id).toMatch(/^mp-qr-[0-9a-z]+$/);
    });
  });

  describe('calculateLogoLayout', () => {
    it('computes logo size and bounding plate dimensions with defaults', () => {
      const layout = calculateLogoLayout(20, 20, 24, 24, { href: 'logo.png' });
      expect(layout.logoSize).toBeCloseTo(4.4); // 20 * 0.22
      expect(layout.plate).toBeCloseTo(6.4); // 4.4 + 2*1
      expect(layout.centreX).toBe(12);
      expect(layout.centreY).toBe(12);
      expect(layout.radius).toBe(1);
    });

    it('respects custom scale, padding, and radius', () => {
      const layout = calculateLogoLayout(30, 20, 32, 22, {
        href: 'logo.png',
        scale: 0.3,
        padding: 2,
        radius: 0.5,
      });
      expect(layout.logoSize).toBe(6); // min(30, 20) * 0.3
      expect(layout.plate).toBe(10); // 6 + 2*2
      expect(layout.centreX).toBe(16);
      expect(layout.centreY).toBe(11);
      expect(layout.radius).toBe(0.5);
    });
  });

  describe('resolveCodeActions', () => {
    it('resolves true to enable all actions', () => {
      const actions = resolveCodeActions(true);
      expect(actions.showDownload).toBe(true);
      expect(actions.showCopyImage).toBe(true);
      expect(actions.showCopyValue).toBe(true);
      expect(actions.hasVisibleToolbarActions).toBe(true);
    });

    it('resolves false / undefined to disable all actions', () => {
      const actions = resolveCodeActions(false);
      expect(actions.showDownload).toBe(false);
      expect(actions.showCopyImage).toBe(false);
      expect(actions.showCopyValue).toBe(false);
      expect(actions.hasVisibleToolbarActions).toBe(false);
    });

    it('resolves individual action object properties', () => {
      const actions = resolveCodeActions({ copyValue: true });
      expect(actions.showDownload).toBe(false);
      expect(actions.showCopyImage).toBe(false);
      expect(actions.showCopyValue).toBe(true);
      expect(actions.hasVisibleToolbarActions).toBe(true);
    });
  });

  describe('clipboard and download operations', () => {
    it('copies text via navigator.clipboard', async () => {
      const writeText = vi.fn().mockResolvedValue();
      Object.assign(navigator, { clipboard: { writeText } });
      await copyTextToClipboard('test-content');
      expect(writeText).toHaveBeenCalledWith('test-content');
    });

    it('copies blob via navigator.clipboard.write', async () => {
      const write = vi.fn().mockResolvedValue();
      Object.assign(navigator, { clipboard: { write } });
      class MockClipboardItem {
        constructor(public items: Record<string, Blob>) {}
      }
      globalThis.ClipboardItem = MockClipboardItem as unknown as typeof ClipboardItem;
      const blob = new Blob(['test'], { type: 'image/png' });
      await copyBlobToClipboard(blob);
      expect(write).toHaveBeenCalledOnce();
    });

    it('triggers anchor download for blobs', () => {
      const createObjectURL = vi.fn().mockReturnValue('blob:test');
      const revokeObjectURL = vi.fn();
      globalThis.URL.createObjectURL = createObjectURL;
      globalThis.URL.revokeObjectURL = revokeObjectURL;

      const appendSpy = vi.spyOn(document.body, 'append');
      const blob = new Blob(['test'], { type: 'image/png' });
      downloadBlob(blob, 'sample.png');

      expect(createObjectURL).toHaveBeenCalledWith(blob);
      expect(appendSpy).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });

    it('throws when rasterizing without an svgElement', async () => {
      await expect(rasterizeSvgToPngBlob(null, 100, 100)).rejects.toThrow('The code has not been rendered yet.');
    });
  });
});

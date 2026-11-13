import { describe, expect, it, vi } from 'vitest';

import {
  getPositionArea,
  POSITION_AREA_MAP,
  promoteToTopLayer,
  setupOutsideDismiss,
  type AnchorPlacement,
} from './anchor-position';

describe('anchor-position', () => {
  it('maps all standard placements to valid position-area keywords', () => {
    const placements: AnchorPlacement[] = [
      'top',
      'top-start',
      'top-end',
      'bottom',
      'bottom-start',
      'bottom-end',
      'left',
      'left-start',
      'left-end',
      'right',
      'right-start',
      'right-end',
    ];

    for (const placement of placements) {
      const area = getPositionArea(placement);
      expect(area).toBe(POSITION_AREA_MAP[placement]);
      expect(area.length).toBeGreaterThan(0);
    }
  });

  it('handles outside dismiss on mousedown outside trigger and panel', () => {
    const trigger = document.createElement('button');
    const panel = document.createElement('div');
    const outside = document.createElement('div');
    document.body.appendChild(trigger);
    document.body.appendChild(panel);
    document.body.appendChild(outside);

    const onClose = vi.fn();
    const cleanup = setupOutsideDismiss({
      trigger,
      panel,
      closeOnOutsideClick: true,
      onClose,
    });

    // Click on trigger - should not close
    trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();

    // Click on panel - should not close
    panel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();

    // Click outside - should close
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Escape key - should close
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledTimes(2);

    cleanup();
    trigger.remove();
    panel.remove();
    outside.remove();
  });

  it('promotes panel to top layer via showPopover', () => {
    vi.useFakeTimers();
    const panel = document.createElement('div') as HTMLElement & { showPopover?: () => void };
    const mockShowPopover = vi.fn();
    panel.showPopover = mockShowPopover;

    const cleanup = promoteToTopLayer(panel);
    vi.runAllTimers();
    expect(mockShowPopover).toHaveBeenCalledTimes(1);

    if (typeof cleanup === 'function') {
      cleanup();
    }
    vi.useRealTimers();
  });
});

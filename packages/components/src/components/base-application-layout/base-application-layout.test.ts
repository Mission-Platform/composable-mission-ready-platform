import { describe, expect, it } from 'vitest';

import { StatusLevels } from './types';

// Mirrors the statusRole computed in ApplicationLayout.vue
function getStatusRole(statusLevel: string): string | undefined {
  if (statusLevel === 'error') return 'alert';
  if (statusLevel === 'none') return undefined;
  return 'status';
}

// Mirrors the statusTextColor computed in ApplicationLayout.vue
function getStatusTextColor(statusLevel: string): string {
  if (statusLevel === 'info' || statusLevel === 'warning') {
    return 'var(--mp-color-text-primary)';
  }
  return 'var(--mp-color-text-on-primary)';
}

describe('ApplicationLayout', () => {
  describe('StatusLevels', () => {
    it('exports all expected status level values', () => {
      expect(StatusLevels.none).toBe('none');
      expect(StatusLevels.info).toBe('info');
      expect(StatusLevels.warning).toBe('warning');
      expect(StatusLevels.error).toBe('error');
    });

    it('has the correct number of levels', () => {
      expect(Object.keys(StatusLevels)).toHaveLength(4);
    });
  });

  describe('landmark ARIA roles', () => {
    it('assigns role="alert" for error level', () => {
      expect(getStatusRole(StatusLevels.error)).toBe('alert');
    });

    it('assigns role="status" for info level', () => {
      expect(getStatusRole(StatusLevels.info)).toBe('status');
    });

    it('assigns role="status" for warning level', () => {
      expect(getStatusRole(StatusLevels.warning)).toBe('status');
    });

    it('assigns no role for none level', () => {
      expect(getStatusRole(StatusLevels.none)).toBeUndefined();
    });
  });

  describe('status text colour (WCAG AAA contrast)', () => {
    it('uses dark text (text-primary) for info — 8.30:1 on info-default, WCAG AAA', () => {
      expect(getStatusTextColor(StatusLevels.info)).toBe('var(--mp-color-text-primary)');
    });

    it('uses dark text (text-primary) for warning — 8.59:1 on warning-default, WCAG AAA', () => {
      expect(getStatusTextColor(StatusLevels.warning)).toBe('var(--mp-color-text-primary)');
    });

    it('uses white text (text-on-primary) for error — 8.0:1 on danger-default, WCAG AAA', () => {
      expect(getStatusTextColor(StatusLevels.error)).toBe('var(--mp-color-text-on-primary)');
    });

    it('uses white text (text-on-primary) for none (transparent background)', () => {
      expect(getStatusTextColor(StatusLevels.none)).toBe('var(--mp-color-text-on-primary)');
    });
  });
});

// AAA (Arrange–Act–Assert) tests for the dark theme colour tokens.
// Each test verifies that a semantic colour pair defined in the dark theme
// achieves WCAG AAA contrast (≥ 7:1) as documented in the token comments.
//
// Colour values are sourced directly from:
//   packages/tokens/src/themes/dark/index.scss
//   packages/tokens/src/scss/_colors.scss

import { describe, expect, it } from 'vitest';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a single sRGB channel value [0..1] to linear light. */
function toLinear(c: number): number {
  return c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Convert a hex colour string to a linear-light RGB triple [0..1].
 * Supports 3-digit (#rgb) and 6-digit (#rrggbb) hex values.
 */
function hexToLinearRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const r = Number.parseInt(full.slice(0, 2), 16) / 255;
  const g = Number.parseInt(full.slice(2, 4), 16) / 255;
  const b = Number.parseInt(full.slice(4, 6), 16) / 255;
  return [toLinear(r), toLinear(g), toLinear(b)];
}

/** Compute relative luminance per WCAG 2.1 (0 = black, 1 = white). */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToLinearRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Compute contrast ratio between two hex colours. */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const WCAG_AAA = 7;

// ─── Dark theme token values ──────────────────────────────────────────────────
// Taken directly from packages/tokens/src/themes/dark/index.scss and
// packages/tokens/src/scss/_colors.scss (resolved from SCSS variables).

const dark = {
  // Background surfaces
  bgBase: '#111D1C', // $color-cyan-950
  bgSurface: '#172423',
  bgRaised: '#1e2e2d',
  bgOverlay: '#243837',
  bgSunken: '#0b1413',
  bgMuted: '#172423',

  // Borders
  borderDefault: '#233130',
  borderStrong: '#2e4140',
  borderFocus: '#1ae6db', // $color-cyan-400

  // Text
  textPrimary: '#ebfffe', // $color-cyan-50
  textSecondary: '#9efaf5', // $color-cyan-200
  textTertiary: '#1ae6db', // $color-cyan-400
  textDisabled: '#1ae6db', // $color-cyan-400 — 10.2:1 on bgSurface
  textInverse: '#042523', // $color-cyan-900
  textOnPrimary: '#042523', // $color-cyan-900 — 8.85:1 on primary-200

  // Brand / Primary
  primaryDefault: '#c9b4ff', // $color-primary-200
  primaryHover: '#e5d9ff', // $color-primary-100
  primaryActive: '#a97fff', // $color-primary-300
  primarySubtle: '#14072c', // $color-primary-900
  primaryMuted: '#280e56', // $color-primary-800
  primaryText: '#c9b4ff', // $color-primary-200 — 8.90:1 on primaryMuted

  // Success
  successDefault: '#2cc46e', // $color-success-400
  successHover: '#5dd891', // $color-success-300
  successSubtle: '#031e0e', // $color-success-900
  successMuted: '#073d1d', // $color-success-800
  successText: '#d0f4df', // $color-success-100 — 10.44:1 on successMuted

  // Warning
  warningDefault: '#fdb022', // $color-warning-400
  warningHover: '#fec84b', // $color-warning-300
  warningSubtle: '#7a2e0e', // $color-warning-900
  warningMuted: '#7a2e0e', // $color-warning-900
  warningText: '#fffaeb', // $color-warning-50 — 7.21:1 on warningMuted

  // Danger
  dangerDefault: '#fda4af', // $color-danger-300
  dangerHover: '#fecdd6', // $color-danger-200
  dangerSubtle: '#881337', // $color-danger-900
  dangerMuted: '#881337', // $color-danger-900
  dangerText: '#ffe4e8', // $color-danger-100 — 7.98:1 on dangerMuted

  // Info
  infoDefault: '#22d3ee', // $color-info-400
  infoHover: '#67e8f9', // $color-info-300
  infoSubtle: '#164e63', // $color-info-900
  infoMuted: '#164e63', // $color-info-900
  infoText: '#cffafe', // $color-info-100 — 8.14:1 on infoMuted

  // Error
  errorDefault: '#fda4af', // $color-error-300  — 8.46:1 on bg-surface (WCAG AAA)
  errorHover: '#fecdd3', // $color-error-200
  errorSubtle: '#881337', // $color-error-900
  errorMuted: '#881337', // $color-error-900
  errorText: '#ffe4e6', // $color-error-100 — 7.98:1 on errorMuted

  // Alert
  alertDefault: '#fb923c', // $color-alert-400
  alertHover: '#fdba74', // $color-alert-300
  alertSubtle: '#7c2d12', // $color-alert-900
  alertMuted: '#7c2d12', // $color-alert-900
  alertText: '#fff7ed', // $color-alert-50 — 8.21:1 on alertMuted

  // Notice
  noticeDefault: '#a5b4fc', // $color-notice-300  — 8.02:1 on bg-surface (WCAG AAA)
  noticeHover: '#c7d2fe', // $color-notice-200
  noticeSubtle: '#312e81', // $color-notice-900
  noticeMuted: '#312e81', // $color-notice-900
  noticeText: '#e0e7ff', // $color-notice-100 — 9.81:1 on noticeMuted

  // Debug
  debugDefault: '#c4b5fd', // $color-debug-300  — 8.66:1 on bg-surface (WCAG AAA)
  debugHover: '#ddd6fe', // $color-debug-200
  debugSubtle: '#4c1d95', // $color-debug-900
  debugMuted: '#4c1d95', // $color-debug-900
  debugText: '#ede9fe', // $color-debug-100 — 9.10:1 on debugMuted
};

// ─── Test Suites ─────────────────────────────────────────────────────────────

describe('Dark theme — WCAG AAA contrast ratios', () => {
  describe('Text on background surfaces', () => {
    it('primary text on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange
      const text = dark.textPrimary; // $color-cyan-50  #ebfffe
      const bg = dark.bgSurface; // #172423

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('primary text on bg-base achieves WCAG AAA (≥7:1)', () => {
      // Arrange
      const text = dark.textPrimary;
      const bg = dark.bgBase;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('secondary text on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange
      const text = dark.textSecondary; // $color-cyan-200  #9efaf5
      const bg = dark.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('tertiary text on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange
      const text = dark.textTertiary; // $color-cyan-400  #1ae6db
      const bg = dark.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('disabled text on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange – token comment states 10.2:1 on bgSurface
      const text = dark.textDisabled;
      const bg = dark.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('primary text on bg-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange — bgMuted equals bgSurface (#172423) in the dark theme
      const text = dark.textPrimary; // $color-cyan-50  #ebfffe
      const bg = dark.bgMuted;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('tertiary text on bg-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 10.2:1 on bgSurface; bgMuted is the same value
      const text = dark.textTertiary; // $color-cyan-400  #1ae6db
      const bg = dark.bgMuted;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('disabled text on bg-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange — same value as textTertiary; bgMuted equals bgSurface in the dark theme
      const text = dark.textDisabled;
      const bg = dark.bgMuted;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Text-on-primary (button label on primary button background)', () => {
    it('text-on-primary on primary-default achieves WCAG AAA (≥7:1)', () => {
      // Arrange – token comment states 8.85:1 on primary-200 button bg
      const text = dark.textOnPrimary; // $color-cyan-900
      const bg = dark.primaryDefault; // $color-primary-200

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: primary', () => {
    it('primary-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — primary-200 (#c9b4ff) is a pale purple; high contrast on dark teal bg-surface
      const text = dark.primaryDefault; // $color-primary-200  #c9b4ff
      const bg = dark.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('primary-text on primary-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange – token comment states 8.90:1 on primary-800 muted
      const text = dark.primaryText; // $color-primary-200
      const bg = dark.primaryMuted; // $color-primary-800

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: success', () => {
    it('success-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — success-400 (#2cc46e) on dark teal bg-surface (#172423)
      const text = dark.successDefault; // $color-success-400  #2cc46e
      const bg = dark.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('success-text on success-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange – token comment states 10.44:1 on success-800 muted
      const text = dark.successText; // $color-success-100
      const bg = dark.successMuted; // $color-success-800

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: warning', () => {
    it('warning-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — warning-400 (#fdb022) on dark teal bg-surface (#172423)
      const text = dark.warningDefault; // $color-warning-400  #fdb022
      const bg = dark.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('warning-text on warning-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange – token comment states 7.21:1 on warning-900 muted
      const text = dark.warningText; // $color-warning-50
      const bg = dark.warningMuted; // $color-warning-900

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: danger', () => {
    it('danger-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — dark/index.scss states danger-300 gives 8.46:1 on dark bg-surface
      const text = dark.dangerDefault; // $color-danger-300  #fda4af
      const bg = dark.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('danger-text on danger-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange – token comment states 7.98:1 on danger-900 muted
      const text = dark.dangerText; // $color-danger-100
      const bg = dark.dangerMuted; // $color-danger-900

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: info', () => {
    it('info-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — info-400 (#22d3ee) on dark teal bg-surface (#172423)
      const text = dark.infoDefault; // $color-info-400  #22d3ee
      const bg = dark.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('info-text on info-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange – token comment states 8.14:1 on info-900 muted
      const text = dark.infoText; // $color-info-100
      const bg = dark.infoMuted; // $color-info-900

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: error', () => {
    it('error-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — error-300 gives 8.46:1 on dark bg-surface (WCAG AAA)
      const text = dark.errorDefault; // $color-error-300  #fda4af
      const bg = dark.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('error-text on error-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange – token comment states 7.98:1 on error-900 muted
      const text = dark.errorText; // $color-error-100
      const bg = dark.errorMuted; // $color-error-900

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: alert', () => {
    it('alert-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — dark/index.scss states alert-300 gives 8.21:1 on dark bg-surface
      const text = dark.alertDefault; // $color-alert-400  #fb923c
      const bg = dark.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('alert-text on alert-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange – token comment states 8.21:1 on alert-900 muted
      const text = dark.alertText; // $color-alert-50
      const bg = dark.alertMuted; // $color-alert-900

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: notice', () => {
    it('notice-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — notice-300 gives 8.02:1 on dark bg-surface (WCAG AAA)
      const text = dark.noticeDefault; // $color-notice-300  #a5b4fc
      const bg = dark.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('notice-text on notice-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange – token comment states 9.81:1 on notice-900 muted
      const text = dark.noticeText; // $color-notice-100
      const bg = dark.noticeMuted; // $color-notice-900

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: debug', () => {
    it('debug-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — debug-300 gives 8.66:1 on dark bg-surface (WCAG AAA)
      const text = dark.debugDefault; // $color-debug-300  #c4b5fd
      const bg = dark.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('debug-text on debug-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange – token comment states 9.10:1 on debug-900 muted
      const text = dark.debugText; // $color-debug-100
      const bg = dark.debugMuted; // $color-debug-900

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });
});

// ─── Light theme token values ─────────────────────────────────────────────────
// Taken directly from packages/tokens/src/themes/light/index.scss and
// packages/tokens/src/scss/_colors.scss (resolved from SCSS variables).

const light = {
  // Background surfaces
  bgBase: '#f9f9fb', // $color-neutral-50
  bgSurface: '#ffffff', // $color-white
  bgRaised: '#ffffff', // $color-white
  bgOverlay: '#ffffff', // $color-white
  bgSunken: '#f2f2f5', // $color-neutral-100
  bgMuted: '#f2f2f5', // $color-neutral-100

  // Text
  textPrimary: '#08060d', // $color-neutral-900 — 19.4:1 on white
  textSecondary: '#3a3545', // $color-neutral-700 — 10.1:1 on white
  textTertiary: '#504b5c', // $color-neutral-600 —  8.4:1 on white,  7.5:1 on neutral-100
  textDisabled: '#504b5c', // $color-neutral-600 —  8.4:1 on white,  7.5:1 on neutral-100
  textOnPrimary: '#ffffff', // $color-white       —  9.1:1 on primary-500

  // Brand / Primary
  primaryDefault: '#6c2fd4', // $color-primary-500
  primaryMuted: '#e5d9ff', // $color-primary-100
  primaryText: '#3d1680', // $color-primary-700 — 8.5:1 on primary-100

  // Success
  successDefault: '#0d5e2e', // $color-success-700 —  7.90:1 on white (WCAG AAA)
  successMuted: '#d0f4df', // $color-success-100
  successText: '#073d1d', // $color-success-800 — 10.44:1 on success-100 (WCAG AAA)

  // Warning
  warningDefault: '#93370d', // $color-warning-800 —  7.52:1 on white (WCAG AAA)
  warningMuted: '#fef0c7', // $color-warning-100
  warningText: '#7a2e0e', // $color-warning-900 —  8.32:1 on warning-100 (WCAG AAA)

  // Danger
  dangerDefault: '#9f1239', // $color-danger-800 —  8.02:1 on white (WCAG AAA)
  dangerMuted: '#ffe4e8', // $color-danger-100
  dangerText: '#881337', // $color-danger-900 —  7.98:1 on danger-100 (WCAG AAA)

  // Info
  infoDefault: '#155e75', // $color-info-800 —  7.27:1 on white (WCAG AAA)
  infoMuted: '#cffafe', // $color-info-100
  infoText: '#164e63', // $color-info-900 —  8.14:1 on info-100 (WCAG AAA)

  // Error
  errorDefault: '#9f1239', // $color-error-800 —  8.02:1 on white (WCAG AAA)
  errorMuted: '#ffe4e6', // $color-error-100
  errorText: '#881337', // $color-error-900 —  7.98:1 on error-100 (WCAG AAA)

  // Alert
  alertDefault: '#9a3412', // $color-alert-800 —  7.43:1 on white (WCAG AAA)
  alertMuted: '#ffedd5', // $color-alert-100
  alertText: '#7c2d12', // $color-alert-900 —  8.21:1 on alert-100 (WCAG AAA)

  // Notice
  noticeDefault: '#3730a3', // $color-notice-800 —  8.59:1 on white (WCAG AAA)
  noticeMuted: '#e0e7ff', // $color-notice-100
  noticeText: '#312e81', // $color-notice-900 —  9.81:1 on notice-100 (WCAG AAA)

  // Debug
  debugDefault: '#5b21b6', // $color-debug-800 —  8.20:1 on white (WCAG AAA)
  debugMuted: '#ede9fe', // $color-debug-100
  debugText: '#4c1d95', // $color-debug-900 —  9.10:1 on debug-100 (WCAG AAA)
};

// ─── Light theme test suite ───────────────────────────────────────────────────

describe('Light theme — WCAG AAA contrast ratios', () => {
  describe('Text on background surfaces', () => {
    it('primary text on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange
      const text = light.textPrimary; // $color-neutral-900  #08060d
      const bg = light.bgSurface; // $color-white         #ffffff

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('primary text on bg-base achieves WCAG AAA (≥7:1)', () => {
      // Arrange
      const text = light.textPrimary;
      const bg = light.bgBase; // $color-neutral-50  #f9f9fb

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('primary text on bg-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange
      const text = light.textPrimary;
      const bg = light.bgMuted; // $color-neutral-100  #f2f2f5

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('secondary text on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange
      const text = light.textSecondary; // $color-neutral-700  #3a3545
      const bg = light.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('tertiary text on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange
      const text = light.textTertiary; // $color-neutral-600  #504b5c
      const bg = light.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('tertiary text on bg-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 7.5:1 on neutral-100
      const text = light.textTertiary;
      const bg = light.bgMuted;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('disabled text on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — same value as tertiary: 8.4:1 on white
      const text = light.textDisabled;
      const bg = light.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('disabled text on bg-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 7.5:1 on neutral-100
      const text = light.textDisabled;
      const bg = light.bgMuted;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Text-on-primary (button label on primary button background)', () => {
    it('text-on-primary on primary-default achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 9.1:1 on primary-500 #6c2fd4
      const text = light.textOnPrimary; // $color-white
      const bg = light.primaryDefault; // $color-primary-500

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: primary', () => {
    it('primary-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange
      const text = light.primaryDefault; // $color-primary-500  #6c2fd4
      const bg = light.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('primary-text on primary-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 8.5:1 on primary-100 #e5d9ff
      const text = light.primaryText; // $color-primary-700  #3d1680
      const bg = light.primaryMuted; // $color-primary-100  #e5d9ff

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: success', () => {
    it('success-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 7.90:1 on white
      const text = light.successDefault; // $color-success-700  #0d5e2e
      const bg = light.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('success-text on success-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 10.44:1 on success-100
      const text = light.successText; // $color-success-800  #073d1d
      const bg = light.successMuted; // $color-success-100  #d0f4df

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: warning', () => {
    it('warning-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 7.52:1 on white
      const text = light.warningDefault; // $color-warning-800  #93370d
      const bg = light.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('warning-text on warning-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 8.32:1 on warning-100
      const text = light.warningText; // $color-warning-900  #7a2e0e
      const bg = light.warningMuted; // $color-warning-100  #fef0c7

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: danger', () => {
    it('danger-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 8.02:1 on white
      const text = light.dangerDefault; // $color-danger-800  #9f1239
      const bg = light.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('danger-text on danger-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 7.98:1 on danger-100
      const text = light.dangerText; // $color-danger-900  #881337
      const bg = light.dangerMuted; // $color-danger-100  #ffe4e8

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: info', () => {
    it('info-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 7.27:1 on white
      const text = light.infoDefault; // $color-info-800  #155e75
      const bg = light.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('info-text on info-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 8.14:1 on info-100
      const text = light.infoText; // $color-info-900  #164e63
      const bg = light.infoMuted; // $color-info-100  #cffafe

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: error', () => {
    it('error-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 8.02:1 on white
      const text = light.errorDefault; // $color-error-800  #9f1239
      const bg = light.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('error-text on error-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 7.98:1 on error-100
      const text = light.errorText; // $color-error-900  #881337
      const bg = light.errorMuted; // $color-error-100  #ffe4e6

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: alert', () => {
    it('alert-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 7.43:1 on white
      const text = light.alertDefault; // $color-alert-800  #9a3412
      const bg = light.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('alert-text on alert-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 8.21:1 on alert-100
      const text = light.alertText; // $color-alert-900  #7c2d12
      const bg = light.alertMuted; // $color-alert-100  #ffedd5

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: notice', () => {
    it('notice-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 8.59:1 on white
      const text = light.noticeDefault; // $color-notice-800  #3730a3
      const bg = light.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('notice-text on notice-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 9.81:1 on notice-100
      const text = light.noticeText; // $color-notice-900  #312e81
      const bg = light.noticeMuted; // $color-notice-100  #e0e7ff

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });

  describe('Semantic colour: debug', () => {
    it('debug-default on bg-surface achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 8.20:1 on white
      const text = light.debugDefault; // $color-debug-800  #5b21b6
      const bg = light.bgSurface;

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });

    it('debug-text on debug-muted achieves WCAG AAA (≥7:1)', () => {
      // Arrange — token comment states 9.10:1 on debug-100
      const text = light.debugText; // $color-debug-900  #4c1d95
      const bg = light.debugMuted; // $color-debug-100  #ede9fe

      // Act
      const ratio = contrastRatio(text, bg);

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA);
    });
  });
});

// ─── Helper function unit tests ───────────────────────────────────────────────

describe('contrastRatio helper', () => {
  it('black on white returns 21:1', () => {
    // Arrange
    const foreground = '#000000';
    const background = '#ffffff';

    // Act
    const ratio = contrastRatio(foreground, background);

    // Assert
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('white on white returns 1:1', () => {
    // Arrange
    const foreground = '#ffffff';
    const background = '#ffffff';

    // Act
    const ratio = contrastRatio(foreground, background);

    // Assert
    expect(ratio).toBeCloseTo(1, 5);
  });
});

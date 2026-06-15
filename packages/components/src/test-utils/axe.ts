// ─── WCAG AAA accessibility test helper ───────────────────────────────────────
//
// A thin wrapper around `axe-core` that runs the engine against a mounted Vue
// component and asserts that it produces no WCAG-A / AA / AAA violations.
//
// Notes / limitations under jsdom:
// - jsdom does not perform layout or paint, so axe's colour-contrast rules
//   (`color-contrast`, `color-contrast-enhanced` — the AAA 1.4.6 rule) cannot be
//   evaluated and are reported as *incomplete* rather than as violations. The
//   library's colour tokens are independently verified at AAA (≥ 7:1) in
//   `@mission-platform/tokens`, so these tests focus on the *structural* AAA
//   requirements (roles, names, relationships, landmarks, ARIA usage, …).
// - axe is scoped to the mounted component's root element, so page-level rules
//   that target `<html>`/`<head>` (e.g. `html-has-lang`, `document-title`) are
//   intentionally excluded — components are fragments, not whole documents.

import axe, { type AxeResults, type ElementContext, type Result, type RunOptions } from 'axe-core';
import { expect } from 'vitest';

import { mountWithI18n } from './mount-with-i18n';

import type { mount } from '@vue/test-utils';
import type { Router } from 'vue-router';

/**
 * The axe-core tags that, taken together, cover WCAG 2.0 / 2.1 / 2.2 at the
 * A, AA, and AAA conformance levels. AAA conformance also requires meeting the
 * lower levels, so the A and AA tags are included alongside the AAA ones.
 * Tags that a given axe-core version does not recognise simply match no rules.
 */
export const WCAG_AAA_TAGS: readonly string[] = [
  'wcag2a',
  'wcag2aa',
  'wcag2aaa',
  'wcag21a',
  'wcag21aa',
  'wcag21aaa',
  'wcag22a',
  'wcag22aa',
  'wcag22aaa',
];

/** A compact, assertion-friendly view of a single axe violation. */
export interface A11yViolation {
  id: string;
  impact: Result['impact'];
  help: string;
  helpUrl: string;
  nodes: string[];
}

/**
 * Runs axe-core against `context`, restricted to the WCAG A/AA/AAA rule set.
 * Pass `options` to extend or override the defaults (e.g. to tune `rules`).
 */
export async function runAxe(context: ElementContext, options: RunOptions = {}): Promise<AxeResults> {
  return axe.run(context, {
    runOnly: { type: 'tag', values: [...WCAG_AAA_TAGS] },
    resultTypes: ['violations'],
    ...options,
  });
}

/** Maps raw axe violations to the compact {@link A11yViolation} shape. */
export function summarizeViolations(violations: Result[]): A11yViolation[] {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }));
}

/**
 * Asserts that `context` (typically a mounted component's root element) has no
 * WCAG A/AA/AAA accessibility violations. On failure, Vitest prints the offending
 * rules — including their ids, impact, help text, and the matching DOM targets.
 */
export async function expectNoA11yViolations(context: ElementContext, options: RunOptions = {}): Promise<void> {
  const { violations } = await runAxe(context, options);
  expect(summarizeViolations(violations)).toStrictEqual([]);
}

/**
 * Mounts a component attached to `document.body` (so axe can evaluate visibility
 * and relationships) with the vue-i18n and vue-router plugins pre-installed.
 * Always call `wrapper.unmount()` afterwards to detach it from the document.
 */
export function mountForA11y(
  component: Parameters<typeof mount>[0],
  options: Parameters<typeof mount>[1] = {},
  router?: Router,
): ReturnType<typeof mount> {
  return mountWithI18n(component, { attachTo: document.body, ...options }, router);
}

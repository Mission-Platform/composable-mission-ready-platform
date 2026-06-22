import { describe, expect, it } from 'vitest';

import { isGhostAtEnd, isGhostBefore, type InsertTarget } from './form-builder-tree';

/**
 * Unit tests for the pure drop-placement-ghost positioning helpers that decide,
 * given the live `dropIndicator` insert-target, where `BaseFormBuilder` renders
 * the placeholder "ghost" row marking where a dragged field will land. They are
 * framework-agnostic, so they can be asserted directly (the live `dragover`
 * interaction that feeds them is exercised through the component itself).
 */
describe('isGhostBefore', () => {
  it('matches the exact slot in the same root container (parent + step)', () => {
    const indicator: InsertTarget = { parentId: undefined, index: 1, step: 0 };
    expect(isGhostBefore(indicator, undefined, 0, 1)).toBe(true);
    expect(isGhostBefore(indicator, undefined, 0, 0)).toBe(false);
    expect(isGhostBefore(indicator, undefined, 0, 2)).toBe(false);
  });

  it('disambiguates root containers by wizard step', () => {
    const indicator: InsertTarget = { parentId: undefined, index: 0, step: 1 };
    expect(isGhostBefore(indicator, undefined, 1, 0)).toBe(true);
    expect(isGhostBefore(indicator, undefined, 0, 0)).toBe(false);
  });

  it('matches a nested field-set container by parentId (step is irrelevant)', () => {
    const indicator: InsertTarget = { parentId: 'fieldset-1', index: 0, step: 0 };
    expect(isGhostBefore(indicator, 'fieldset-1', 0, 0)).toBe(true);
    // A nested container is uniquely identified by its parentId, so a different
    // step still matches.
    expect(isGhostBefore(indicator, 'fieldset-1', 5, 0)).toBe(true);
    expect(isGhostBefore(indicator, 'fieldset-2', 0, 0)).toBe(false);
    expect(isGhostBefore(indicator, undefined, 0, 0)).toBe(false);
  });

  it('never matches an append indicator (no index) or a missing indicator', () => {
    expect(isGhostBefore({ parentId: undefined, step: 0 }, undefined, 0, 0)).toBe(false);
    expect(isGhostBefore(undefined, undefined, 0, 0)).toBe(false);
  });
});

describe('isGhostAtEnd', () => {
  it('matches an append indicator (no index) in the same container', () => {
    const indicator: InsertTarget = { parentId: undefined, step: 0 };
    expect(isGhostAtEnd(indicator, undefined, 0, 0)).toBe(true);
    expect(isGhostAtEnd(indicator, undefined, 0, 3)).toBe(true);
    expect(isGhostAtEnd(indicator, undefined, 1, 0)).toBe(false);
  });

  it('treats an index at or past the end as an append', () => {
    expect(isGhostAtEnd({ parentId: undefined, index: 2, step: 0 }, undefined, 0, 2)).toBe(true);
    expect(isGhostAtEnd({ parentId: undefined, index: 1, step: 0 }, undefined, 0, 2)).toBe(false);
  });

  it('matches a nested field-set container by parentId', () => {
    const indicator: InsertTarget = { parentId: 'fieldset-1', step: 0 };
    expect(isGhostAtEnd(indicator, 'fieldset-1', 0, 0)).toBe(true);
    expect(isGhostAtEnd(indicator, 'fieldset-2', 0, 0)).toBe(false);
    expect(isGhostAtEnd(indicator, undefined, 0, 0)).toBe(false);
  });

  it('never matches a missing indicator', () => {
    expect(isGhostAtEnd(undefined, undefined, 0, 0)).toBe(false);
  });
});

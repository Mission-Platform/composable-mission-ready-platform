import { describe, expect, it } from 'vitest';

import { useId } from './runtime';

describe('useId', () => {
  it('returns a non-empty string id', () => {
    const id = useId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('hands out a distinct id on each call (stable across a single render, unique per instance)', () => {
    const first = useId();
    const second = useId();
    expect(first).not.toBe(second);
  });
});

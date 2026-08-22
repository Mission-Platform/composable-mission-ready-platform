import { describe, expect, it } from 'vitest';

import { forgeFigma } from './forge-figma';

describe('forgeFigma', () => {
  it('returns the package name', () => {
    expect(forgeFigma()).toBe('forge-figma');
  });
});

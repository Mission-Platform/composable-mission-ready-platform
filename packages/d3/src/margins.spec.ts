import { describe, expect, it } from 'vitest';

import { innerDimensions, resolveMargin } from './margins';

describe('resolveMargin', () => {
  it('returns a zero margin for `undefined`', () => {
    expect(resolveMargin()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('applies a single number to all four sides', () => {
    expect(resolveMargin(8)).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
  });

  it('keeps provided sides and defaults the rest to 0', () => {
    expect(resolveMargin({ top: 10, left: 20 })).toEqual({ top: 10, right: 0, bottom: 0, left: 20 });
  });
});

describe('innerDimensions', () => {
  it('subtracts the margin from the outer box (margin convention)', () => {
    const result = innerDimensions({ width: 300, height: 200, margin: { top: 10, right: 20, bottom: 30, left: 40 } });

    expect(result.innerWidth).toBe(300 - 20 - 40);
    expect(result.innerHeight).toBe(200 - 10 - 30);
    expect(result.margin).toEqual({ top: 10, right: 20, bottom: 30, left: 40 });
    expect(result.translate).toBe('translate(40,10)');
  });

  it('treats a numeric margin uniformly', () => {
    const result = innerDimensions({ width: 100, height: 100, margin: 25 });

    expect(result.innerWidth).toBe(50);
    expect(result.innerHeight).toBe(50);
    expect(result.translate).toBe('translate(25,25)');
  });

  it('defaults to a zero margin when none is given', () => {
    const result = innerDimensions({ width: 640, height: 480 });

    expect(result.innerWidth).toBe(640);
    expect(result.innerHeight).toBe(480);
    expect(result.translate).toBe('translate(0,0)');
  });

  it('clamps inner dimensions at 0 for an over-large margin', () => {
    const result = innerDimensions({ width: 50, height: 40, margin: 100 });

    expect(result.innerWidth).toBe(0);
    expect(result.innerHeight).toBe(0);
  });
});

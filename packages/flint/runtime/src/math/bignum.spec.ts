import { describe, expect, it } from 'vitest';

import {
  createFlintDMatrix,
  createFlintTensorShape,
  flintDMatrixCholesky,
  flintDMatrixCholeskySolve,
  flintDMatrixGet,
  flintDMatrixMul,
  flintDMatrixSet,
  flintTensorFill,
  flintTensorReshape,
  flintTensorShapeSize,
  flintTensorView,
  flintTensorViewGet,
  flintTensorViewSet,
} from './bignum.js';

describe('Flint Runtime Math: Dynamic Matrices & Tensors', () => {
  it('manages dynamic matrix operations and linear solves', () => {
    const m = createFlintDMatrix(2, 2);
    flintDMatrixSet(m, 0, 0, 1);
    flintDMatrixSet(m, 0, 1, 2);
    flintDMatrixSet(m, 1, 0, 3);
    flintDMatrixSet(m, 1, 1, 4);

    expect(flintDMatrixGet(m, 0, 0).kind).toBe('some');
    if (flintDMatrixGet(m, 0, 0).kind === 'some') {
      expect(flintDMatrixGet(m, 0, 0).value).toBe(1);
    }
    if (flintDMatrixGet(m, 1, 1).kind === 'some') {
      expect(flintDMatrixGet(m, 1, 1).value).toBe(4);
    }

    const m2 = createFlintDMatrix(2, 2);
    flintDMatrixSet(m2, 0, 0, 2);
    flintDMatrixSet(m2, 0, 1, 0);
    flintDMatrixSet(m2, 1, 0, 0);
    flintDMatrixSet(m2, 1, 1, 2);

    const mul = flintDMatrixMul(m, m2);
    if (flintDMatrixGet(mul, 0, 0).kind === 'some') {
      expect(flintDMatrixGet(mul, 0, 0).value).toBe(2);
    }
    if (flintDMatrixGet(mul, 1, 1).kind === 'some') {
      expect(flintDMatrixGet(mul, 1, 1).value).toBe(8);
    }

    const spd = createFlintDMatrix(2, 2);
    flintDMatrixSet(spd, 0, 0, 4);
    flintDMatrixSet(spd, 0, 1, 2);
    flintDMatrixSet(spd, 1, 0, 2);
    flintDMatrixSet(spd, 1, 1, 5);

    const chol = flintDMatrixCholesky(spd);
    expect(chol.kind).toBe('some');

    if (chol.kind === 'some') {
      const b = createFlintDMatrix(2, 1);
      flintDMatrixSet(b, 0, 0, 8);
      flintDMatrixSet(b, 1, 0, 14);

      const solved = flintDMatrixCholeskySolve(chol.value, b);
      if (flintDMatrixGet(solved, 0, 0).kind === 'some') {
        expect(flintDMatrixGet(solved, 0, 0).value).toBeCloseTo(0.75);
      }
      if (flintDMatrixGet(solved, 1, 0).kind === 'some') {
        expect(flintDMatrixGet(solved, 1, 0).value).toBeCloseTo(2.5);
      }
    }
  });

  it('handles N-dimensional tensor allocation, slicing, and views', () => {
    const shape = createFlintTensorShape([2, 3, 4]);
    expect(flintTensorShapeSize(shape)).toBe(24);

    const tensor = flintTensorFill(shape, 1.5);
    expect(tensor.data[0]).toBe(1.5);
    expect(tensor.data[23]).toBe(1.5);

    const reshaped = flintTensorReshape(tensor, createFlintTensorShape([4, 6]));
    expect(reshaped.kind).toBe('some');

    const view = flintTensorView(tensor);
    expect(flintTensorViewGet(view, [1, 2, 3]).kind).toBe('some');
    flintTensorViewSet(view, [1, 2, 3], 42);
    if (flintTensorViewGet(view, [1, 2, 3]).kind === 'some') {
      expect(flintTensorViewGet(view, [1, 2, 3]).value).toBe(42);
    }
  });
});

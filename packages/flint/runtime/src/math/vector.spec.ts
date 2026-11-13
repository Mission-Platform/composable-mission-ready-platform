import { describe, expect, it } from 'vitest';

import {
  createFlintMat2,
  createFlintVec2,
  createFlintVec3,
  createFlintVec4,
  flintMat2Determinant,
  flintMat2Identity,
  flintMat2Inverse,
  flintMat3TransformVec2,
  flintMat3Translate2D,
  flintMat4Determinant,
  flintMat4Identity,
  flintMat4RotationZ,
  flintMat4TransformPoint3,
  flintMat4Translation,
  flintQuatFromAxisAngle,
  flintQuatIdentity,
  flintQuatRotateVec3,
  flintQuatToMat4,
  flintVec2Add,
  flintVec2Div,
  flintVec2Dot,
  flintVec2Length,
  flintVec2LengthSq,
  flintVec2Mul,
  flintVec2Normalize,
  flintVec2PerpDot,
  flintVec2Project,
  flintVec2Scale,
  flintVec2Sub,
  flintVec3Cross,
  flintVec3Dot,
  flintVec3Length,
  flintVec3Normalize,
  flintVec3Project,
  flintVec4Dot,
  flintVec4Normalize,
  flintVec4Scale,
} from './vector.js';

describe('Flint Runtime Math: Vectors, Matrices & Quaternions', () => {
  it('performs 2D, 3D, and 4D vector algebra', () => {
    const v1 = createFlintVec2(3, 4);
    const v2 = createFlintVec2(1, 2);

    expect(flintVec2Add(v1, v2)).toEqual({ x: 4, y: 6 });
    expect(flintVec2Sub(v1, v2)).toEqual({ x: 2, y: 2 });
    expect(flintVec2Mul(v1, v2)).toEqual({ x: 3, y: 8 });
    expect(flintVec2Scale(v1, 2)).toEqual({ x: 6, y: 8 });
    expect(flintVec2Div(v1, 2)).toEqual({ x: 1.5, y: 2 });
    expect(flintVec2Dot(v1, v2)).toBe(11);
    expect(flintVec2PerpDot(v1, v2)).toBe(2);
    expect(flintVec2LengthSq(v1)).toBe(25);
    expect(flintVec2Length(v1)).toBe(5);
    expect(flintVec2Normalize(v1)).toEqual({ x: 0.6, y: 0.8 });
    expect(flintVec2Project(v1, createFlintVec2(1, 0))).toEqual({ x: 3, y: 0 });

    const v3a = createFlintVec3(1, 0, 0);
    const v3b = createFlintVec3(0, 1, 0);
    expect(flintVec3Dot(v3a, v3b)).toBe(0);
    expect(flintVec3Cross(v3a, v3b)).toEqual({ x: 0, y: 0, z: 1 });
    expect(flintVec3Length(createFlintVec3(0, 3, 4))).toBe(5);
    expect(flintVec3Normalize(createFlintVec3(0, 3, 4))).toEqual({ x: 0, y: 0.6, z: 0.8 });
    expect(flintVec3Project(createFlintVec3(3, 4, 5), v3a)).toEqual({ x: 3, y: 0, z: 0 });

    const v4 = createFlintVec4(1, 2, 3, 4);
    expect(flintVec4Scale(v4, 2)).toEqual({ x: 2, y: 4, z: 6, w: 8 });
    expect(flintVec4Dot(v4, v4)).toBe(30);
    expect(flintVec4Normalize(createFlintVec4(0, 0, 0, 5))).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });

  it('handles matrix transformations and inversions', () => {
    const identity2 = flintMat2Identity();
    expect(flintMat2Determinant(identity2)).toBe(1);

    const m2 = createFlintMat2(createFlintVec2(1, 2), createFlintVec2(3, 4));
    expect(flintMat2Determinant(m2)).toBe(-2);
    const inv2 = flintMat2Inverse(m2);
    expect(inv2.kind).toBe('some');

    const m3Trans = flintMat3Translate2D(createFlintVec2(10, 20));
    const transformed2 = flintMat3TransformVec2(m3Trans, createFlintVec2(5, 5));
    expect(transformed2).toEqual({ x: 15, y: 25 });

    const m4Ident = flintMat4Identity();
    expect(flintMat4Determinant(m4Ident)).toBe(1);
    const m4Trans = flintMat4Translation(createFlintVec3(1, 2, 3));
    const ptTransformed = flintMat4TransformPoint3(m4Trans, createFlintVec3(10, 20, 30));
    expect(ptTransformed).toEqual({ x: 11, y: 22, z: 33 });

    const m4RotZ = flintMat4RotationZ(Math.PI / 2);
    const ptRot = flintMat4TransformPoint3(m4RotZ, createFlintVec3(1, 0, 0));
    expect(ptRot.x).toBeCloseTo(0);
    expect(ptRot.y).toBeCloseTo(1);
  });

  it('manages quaternions and rotations', () => {
    const qIdent = flintQuatIdentity();
    expect(qIdent).toEqual({ x: 0, y: 0, z: 0, w: 1 });

    const qRot = flintQuatFromAxisAngle(createFlintVec3(0, 0, 1), Math.PI / 2);
    const rotated = flintQuatRotateVec3(qRot, createFlintVec3(1, 0, 0));
    expect(rotated.x).toBeCloseTo(0);
    expect(rotated.y).toBeCloseTo(1);
    expect(rotated.z).toBeCloseTo(0);

    const mat4FromQ = flintQuatToMat4(qRot);
    expect(flintMat4Determinant(mat4FromQ)).toBeCloseTo(1);
  });
});

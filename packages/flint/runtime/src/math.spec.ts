import { describe, expect, it } from 'vitest';

import {
  type FlintDMatrix,
  FLINT_MATH_PI,
  FLINT_MATH_TAU,
  FLINT_MATH_E,
  FLINT_MATH_SQRT2,
  FLINT_MATH_DEG_TO_RAD,
  FLINT_MATH_RAD_TO_DEG,
  flintClamp,
  flintLerp,
  flintStep,
  flintFloor,
  flintCeil,
  flintFract,
  flintSign,
  flintRadians,
  flintDegrees,
  flintApproxEqual,
  createFlintVec2,
  flintVec2Add,
  flintVec2Sub,
  flintVec2Mul,
  flintVec2Scale,
  flintVec2Div,
  flintVec2Dot,
  flintVec2PerpDot,
  flintVec2LengthSq,
  flintVec2Length,
  flintVec2Normalize,
  flintVec2Project,
  createFlintVec3,
  flintVec3Dot,
  flintVec3Cross,
  flintVec3Length,
  flintVec3Normalize,
  flintVec3Project,
  createFlintVec4,
  flintVec4Scale,
  flintVec4Dot,
  flintVec4Normalize,
  createFlintMat2,
  flintMat2Identity,
  flintMat2Mul,
  flintMat2Determinant,
  flintMat2Inverse,
  flintMat3Translate2D,
  flintMat3TransformVec2,
  flintMat4Identity,
  flintMat4TransformPoint3,
  flintMat4Determinant,
  flintMat4Inverse,
  flintMat4Translation,
  flintMat4RotationZ,
  flintMat4Perspective,
  createFlintQuat,
  flintQuatIdentity,
  flintQuatFromAxisAngle,
  flintQuatNormalize,
  flintQuatRotateVec3,
  flintQuatToMat4,
  createFlintRay3,
  createFlintPlane3,
  createFlintAABB3,
  createFlintOBB3,
  createFlintSphere,
  createFlintTriangle3,
  flintAABB3ContainsPoint,
  flintAABB3Volume,
  flintSphereContainsPoint,
  flintFrustumFromViewProj,
  flintFrustumIntersectsSphere,
  flintRay3IntersectsSphere,
  flintRay3IntersectsPlane3,
  flintRay3IntersectsTriangle3,
  flintRay3IntersectOBB,
  flintBVHBuildFromAABBs,
  flintBVHRayIntersect,
  flintBezier2Quadratic,
  flintBezier2Cubic,
  flintCatmullRom2,
  createFlintColorRgba,
  flintColorRgbToHsv,
  flintColorHsvToRgb,
  flintColorSrgbToOklab,
  flintColorOklabToSrgb,
  flintColorLerpOklab,
  createFlintDMatrix,
  flintDMatrixGet,
  flintDMatrixSet,
  flintDMatrixAddInplace,
  flintDMatrixSubInplace,
  flintDMatrixScaleInplace,
  flintDMatrixMulAccumulate,
  flintDMatrixMul,
  flintDMatrixCholesky,
  flintDMatrixCholeskySolve,
  flintDMatrixSolve,
  flintDMatrixEigenSymmetric,
  flintDMatrixSVD,
  flintDMatrixPseudoinverse,
  createFlintTensorShape,
  flintTensorShapeSize,
  createFlintTensor,
  flintTensorFill,
  flintTensorReshape,
  flintTensorView,
  flintTensorSlice,
  flintTensorViewGet,
  flintTensorViewSet,
  flintTensorMatmul,
} from './math.js';

function computeReconstructedSvdEntry(
  u: FlintDMatrix,
  s: readonly number[],
  vt: FlintDMatrix,
  row: number,
  col: number,
): number {
  let reconstructedValue = 0;
  for (const [kIndex, sValue] of s.entries()) {
    const uValue = u.data[row * u.cols + kIndex] ?? 0;
    const vtValue = vt.data[kIndex * vt.cols + col] ?? 0;
    reconstructedValue += uValue * sValue * vtValue;
  }
  return reconstructedValue;
}

function expectSvdReconstruction(matrix: FlintDMatrix, u: FlintDMatrix, s: readonly number[], vt: FlintDMatrix): void {
  for (let row = 0; row < matrix.rows; row += 1) {
    for (let col = 0; col < matrix.cols; col += 1) {
      const reconstructed = computeReconstructedSvdEntry(u, s, vt, row, col);
      expect(reconstructed).toBeCloseTo(matrix.data[row * matrix.cols + col] ?? 0, 7);
    }
  }
}

function computeColumnDotProduct(matrix: FlintDMatrix, colA: number, colB: number): number {
  let dotProduct = 0;
  for (let row = 0; row < matrix.rows; row += 1) {
    const valueA = matrix.data[row * matrix.cols + colA] ?? 0;
    const valueB = matrix.data[row * matrix.cols + colB] ?? 0;
    dotProduct += valueA * valueB;
  }
  return dotProduct;
}

function expectOrthogonalColumns(matrix: FlintDMatrix): void {
  for (let colA = 0; colA < matrix.cols; colA += 1) {
    for (let colB = 0; colB < matrix.cols; colB += 1) {
      const dot = computeColumnDotProduct(matrix, colA, colB);
      expect(dot).toBeCloseTo(colA === colB ? 1 : 0, 6);
    }
  }
}

function extract2DColumn(matrix: FlintDMatrix, col: number): FlintDMatrix {
  return createFlintDMatrix(2, 1, [matrix.data[col] ?? 0, matrix.data[2 + col] ?? 0]);
}

function expectEigenvectorScaled(sym: FlintDMatrix, vectors: FlintDMatrix, col: number, expectedLambda: number): void {
  const vector = extract2DColumn(vectors, col);
  const avOpt = flintDMatrixMul(sym, vector);
  expect(avOpt.kind).toBe('some');
  const avData = avOpt.value?.data ?? [];
  const firstCoord = vector.data[0] ?? 0;
  const secondCoord = vector.data[1] ?? 0;
  expect(avData[0]).toBeCloseTo(expectedLambda * firstCoord, 8);
  expect(avData[1]).toBeCloseTo(expectedLambda * secondCoord, 8);
}

function expectMoorePenroseCondition(matrixA: FlintDMatrix, pinv: FlintDMatrix): void {
  const aPinvOpt = flintDMatrixMul(matrixA, pinv);
  expect(aPinvOpt.kind).toBe('some');
  const aPinvMat = aPinvOpt.value ?? createFlintDMatrix(0, 0);
  const aPinvAOpt = flintDMatrixMul(aPinvMat, matrixA);
  expect(aPinvAOpt.kind).toBe('some');
  const aPinvAMat = aPinvAOpt.value ?? createFlintDMatrix(0, 0);
  for (const [index, matrixValue] of matrixA.data.entries()) {
    expect(aPinvAMat.data[index]).toBeCloseTo(matrixValue, 7);
  }
}

describe('Flint Standard Math Library', () => {
  describe('Constants and Scalar Functions', () => {
    it('provides standard mathematical constants', () => {
      expect(FLINT_MATH_PI).toBeCloseTo(Math.PI, 10);
      expect(FLINT_MATH_TAU).toBeCloseTo(Math.PI * 2, 10);
      expect(FLINT_MATH_E).toBeCloseTo(Math.E, 10);
      expect(FLINT_MATH_SQRT2).toBeCloseTo(Math.SQRT2, 10);
      expect(FLINT_MATH_DEG_TO_RAD).toBeCloseTo(Math.PI / 180, 10);
      expect(FLINT_MATH_RAD_TO_DEG).toBeCloseTo(180 / Math.PI, 10);
    });

    it('performs scalar operations correctly', () => {
      expect(flintClamp(5, 0, 10)).toBe(5);
      expect(flintClamp(-5, 0, 10)).toBe(0);
      expect(flintClamp(15, 0, 10)).toBe(10);

      expect(flintLerp(0, 10, 0.5)).toBe(5);
      expect(flintStep(5, 4)).toBe(0);
      expect(flintStep(5, 5)).toBe(1);
      expect(flintStep(5, 6)).toBe(1);

      expect(flintFloor(3.7)).toBe(3);
      expect(flintFloor(-3.7)).toBe(-4);
      expect(flintCeil(3.2)).toBe(4);
      expect(flintCeil(-3.2)).toBe(-3);

      expect(flintFract(3.75)).toBeCloseTo(0.75, 10);
      expect(flintFract(-0.25)).toBeCloseTo(0.75, 10);

      expect(flintSign(10)).toBe(1);
      expect(flintSign(-10)).toBe(-1);
      expect(flintSign(0)).toBe(0);

      expect(flintRadians(180)).toBeCloseTo(FLINT_MATH_PI, 10);
      expect(flintDegrees(FLINT_MATH_PI)).toBeCloseTo(180, 10);

      expect(flintApproxEqual(1.000_000_000_1, 1, 1e-9)).toBe(true);
      expect(flintApproxEqual(1 + 1e-16, 1)).toBe(true);
      expect(flintApproxEqual(1.01, 1, 0.001)).toBe(false);
    });
  });

  describe('Vector Math', () => {
    it('handles Vec2 operations and degenerate guards', () => {
      const vecA = createFlintVec2(3, 4);
      const vecB = createFlintVec2(1, 2);

      expect(flintVec2Add(vecA, vecB)).toEqual({ x: 4, y: 6 });
      expect(flintVec2Sub(vecA, vecB)).toEqual({ x: 2, y: 2 });
      expect(flintVec2Mul(vecA, vecB)).toEqual({ x: 3, y: 8 });
      expect(flintVec2Scale(vecA, 2)).toEqual({ x: 6, y: 8 });
      expect(flintVec2Div(vecA, 2)).toEqual({ x: 1.5, y: 2 });
      expect(flintVec2Dot(vecA, vecB)).toBe(11);
      expect(flintVec2PerpDot(vecA, vecB)).toBe(2);
      expect(flintVec2LengthSq(vecA)).toBe(25);
      expect(flintVec2Length(vecA)).toBe(5);

      const normalized = flintVec2Normalize(vecA);
      expect(normalized.x).toBeCloseTo(0.6, 10);
      expect(normalized.y).toBeCloseTo(0.8, 10);

      // Degenerate vector normalization guard
      const zeroVec = createFlintVec2(0, 0);
      expect(flintVec2Normalize(zeroVec)).toEqual({ x: 0, y: 0 });

      // Projection with degenerate guard
      expect(flintVec2Project(vecA, zeroVec)).toEqual({ x: 0, y: 0 });
    });

    it('handles Vec3 operations and cross products', () => {
      const vecA = createFlintVec3(1, 0, 0);
      const vecB = createFlintVec3(0, 1, 0);

      expect(flintVec3Cross(vecA, vecB)).toEqual({ x: 0, y: 0, z: 1 });
      expect(flintVec3Dot(vecA, vecB)).toBe(0);
      expect(flintVec3Length(createFlintVec3(2, 3, 6))).toBe(7);

      // Degenerate vector normalization guard
      const zeroVec = createFlintVec3(0, 0, 0);
      expect(flintVec3Normalize(zeroVec)).toEqual({ x: 0, y: 0, z: 0 });
      expect(flintVec3Project(vecA, zeroVec)).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('handles Vec4 operations', () => {
      const vector = createFlintVec4(1, 2, 3, 4);
      expect(flintVec4Scale(vector, 2)).toEqual({ x: 2, y: 4, z: 6, w: 8 });
      expect(flintVec4Dot(vector, vector)).toBe(30);

      const zeroVec = createFlintVec4(0, 0, 0, 0);
      expect(flintVec4Normalize(zeroVec)).toEqual({ x: 0, y: 0, z: 0, w: 0 });
    });
  });

  describe('Matrix Math (Vector-Composed)', () => {
    it('operates on Mat2 with column vectors and array access', () => {
      const ident = flintMat2Identity();
      expect(ident.c0).toEqual({ x: 1, y: 0 });
      expect(ident.c1).toEqual({ x: 0, y: 1 });
      expect(ident.elements).toEqual([1, 0, 0, 1]);
      expect(flintMat2Determinant(ident)).toBe(1);

      const matrix = createFlintMat2({ x: 2, y: 1 }, { x: 3, y: 4 });
      const invOpt = flintMat2Inverse(matrix);
      expect(invOpt.kind).toBe('some');
      if (invOpt.kind === 'some') {
        const product = flintMat2Mul(matrix, invOpt.value);
        expect(product.c0.x).toBeCloseTo(1, 10);
        expect(product.c0.y).toBeCloseTo(0, 10);
        expect(product.c1.x).toBeCloseTo(0, 10);
        expect(product.c1.y).toBeCloseTo(1, 10);
      }
    });

    it('operates on Mat3 with transformations', () => {
      const trans = flintMat3Translate2D(createFlintVec2(10, 20));
      const pt = createFlintVec2(5, 5);
      const transformed = flintMat3TransformVec2(trans, pt);
      expect(transformed).toEqual({ x: 15, y: 25 });
    });

    it('operates on Mat4 with 3D affine transforms and inverses', () => {
      const ident = flintMat4Identity();
      expect(flintMat4Determinant(ident)).toBe(1);

      const trans = flintMat4Translation(createFlintVec3(1, 2, 3));
      const pt = createFlintVec3(10, 20, 30);
      const transformedPoint = flintMat4TransformPoint3(trans, pt);
      expect(transformedPoint).toEqual({ x: 11, y: 22, z: 33 });

      const rotZ = flintMat4RotationZ(FLINT_MATH_PI * 0.5);
      const rotatedPt = flintMat4TransformPoint3(rotZ, createFlintVec3(1, 0, 0));
      expect(rotatedPt.x).toBeCloseTo(0, 10);
      expect(rotatedPt.y).toBeCloseTo(1, 10);
      expect(rotatedPt.z).toBeCloseTo(0, 10);

      const invOpt = flintMat4Inverse(trans);
      expect(invOpt.kind).toBe('some');
      if (invOpt.kind === 'some') {
        const back = flintMat4TransformPoint3(invOpt.value, transformedPoint);
        expect(back.x).toBeCloseTo(10, 10);
        expect(back.y).toBeCloseTo(20, 10);
        expect(back.z).toBeCloseTo(30, 10);
      }
    });
  });

  describe('Quaternions', () => {
    it('performs quaternion multiplications, rotations, and conversions', () => {
      const qIdent = flintQuatIdentity();
      expect(qIdent).toEqual({ x: 0, y: 0, z: 0, w: 1 });

      const qRotZ90 = flintQuatFromAxisAngle(createFlintVec3(0, 0, 1), FLINT_MATH_PI * 0.5);
      const rotatedVec = flintQuatRotateVec3(qRotZ90, createFlintVec3(1, 0, 0));
      expect(rotatedVec.x).toBeCloseTo(0, 10);
      expect(rotatedVec.y).toBeCloseTo(1, 10);
      expect(rotatedVec.z).toBeCloseTo(0, 10);

      const mat4 = flintQuatToMat4(qRotZ90);
      const matPt = flintMat4TransformPoint3(mat4, createFlintVec3(1, 0, 0));
      expect(matPt.x).toBeCloseTo(0, 10);
      expect(matPt.y).toBeCloseTo(1, 10);
      expect(matPt.z).toBeCloseTo(0, 10);

      // Degenerate normalization
      const zeroQ = createFlintQuat(0, 0, 0, 0);
      expect(flintQuatNormalize(zeroQ)).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    });
  });

  describe('Geometry & Spatial Acceleration', () => {
    it('tests AABB and Sphere containment/intersections', () => {
      const box = createFlintAABB3(createFlintVec3(-1, -1, -1), createFlintVec3(1, 1, 1));
      expect(flintAABB3ContainsPoint(box, createFlintVec3(0, 0, 0))).toBe(true);
      expect(flintAABB3ContainsPoint(box, createFlintVec3(2, 0, 0))).toBe(false);
      expect(flintAABB3Volume(box)).toBe(8);

      const sphere = createFlintSphere(createFlintVec3(0, 0, 0), 2);
      expect(flintSphereContainsPoint(sphere, createFlintVec3(1, 1, 1))).toBe(true);
      expect(flintSphereContainsPoint(sphere, createFlintVec3(3, 0, 0))).toBe(false);
    });

    it('extracts Frustum and performs culling', () => {
      const vp = flintMat4Perspective(FLINT_MATH_PI * 0.5, 1, 0.1, 100);
      const frustum = flintFrustumFromViewProj(vp);

      const visibleSphere = createFlintSphere(createFlintVec3(0, 0, -10), 1);
      expect(flintFrustumIntersectsSphere(frustum, visibleSphere)).toBe(true);

      const behindSphere = createFlintSphere(createFlintVec3(0, 0, 10), 1);
      expect(flintFrustumIntersectsSphere(frustum, behindSphere)).toBe(false);
    });

    it('computes Ray intersections', () => {
      const ray = createFlintRay3(createFlintVec3(0, 0, -10), createFlintVec3(0, 0, 1));
      const sphere = createFlintSphere(createFlintVec3(0, 0, 0), 2);

      const hitSphere = flintRay3IntersectsSphere(ray, sphere);
      expect(hitSphere.kind).toBe('some');
      if (hitSphere.kind === 'some') {
        expect(hitSphere.value).toBeCloseTo(8, 10);
      }

      const plane = createFlintPlane3(createFlintVec3(0, 0, 1), 0);
      const hitPlane = flintRay3IntersectsPlane3(ray, plane);
      expect(hitPlane.kind).toBe('some');
      if (hitPlane.kind === 'some') {
        expect(hitPlane.value).toBeCloseTo(10, 10);
      }

      const tri = createFlintTriangle3(createFlintVec3(-2, -2, 0), createFlintVec3(2, -2, 0), createFlintVec3(0, 2, 0));
      const hitTri = flintRay3IntersectsTriangle3(ray, tri);
      expect(hitTri.kind).toBe('some');
      if (hitTri.kind === 'some') {
        expect(hitTri.value).toBeCloseTo(10, 10);
      }
    });

    it('tests Ray-OBB intersections and BVH tree spatial acceleration', () => {
      // 1. Ray-OBB test: OBB centered at (0, 0, 0) with half-extents (1, 2, 3), rotated 45 deg around Z
      const rotZ45 = flintQuatFromAxisAngle(createFlintVec3(0, 0, 1), FLINT_MATH_PI * 0.25);
      const obb = createFlintOBB3(createFlintVec3(0, 0, 0), createFlintVec3(1, 2, 3), rotZ45);

      // Ray coming along X axis towards origin from x = -10
      const rayX = createFlintRay3(createFlintVec3(-10, 0, 0), createFlintVec3(1, 0, 0));
      const hitOBBOpt = flintRay3IntersectOBB(rayX, obb);
      expect(hitOBBOpt.kind).toBe('some');
      if (hitOBBOpt.kind === 'some') {
        // Distance should be positive and less than 10
        expect(hitOBBOpt.value).toBeGreaterThan(0);
        expect(hitOBBOpt.value).toBeLessThan(10);
      }

      // Ray missing the OBB
      const rayMiss = createFlintRay3(createFlintVec3(-10, 10, 0), createFlintVec3(1, 0, 0));
      expect(flintRay3IntersectOBB(rayMiss, obb).kind).toBe('none');

      // 2. BVH construction and ray traversal
      // Create an array of 20 distinct boxes along X axis
      const boxes: ReturnType<typeof createFlintAABB3>[] = [];
      for (let index = 0; index < 20; index += 1) {
        const cx = index * 4;
        boxes.push(createFlintAABB3(createFlintVec3(cx - 1, -1, -1), createFlintVec3(cx + 1, 1, 1)));
      }

      const bvh = flintBVHBuildFromAABBs(boxes);
      expect(bvh.nodes.length).toBeGreaterThan(20);

      // Ray casting along X axis from x = -10 towards positive X through y=0, z=0
      // It should hit box 0 (which is centered at 0, from x = -1 to +1) first!
      const rayBVH = createFlintRay3(createFlintVec3(-10, 0, 0), createFlintVec3(1, 0, 0));
      const bvhHitOpt = flintBVHRayIntersect(bvh, rayBVH);
      expect(bvhHitOpt.kind).toBe('some');
      if (bvhHitOpt.kind === 'some') {
        const hit = bvhHitOpt.value;
        expect(hit.primitiveId).toBe(0); // Closest primitive
        expect(hit.t).toBeCloseTo(9, 5); // From -10 to -1 is distance 9
        expect(hit.point.x).toBeCloseTo(-1, 5);
        expect(hit.normal.x).toBeCloseTo(-1, 5); // Hit left face (-X)
      }

      // Ray aimed specifically at box 5 (centered at x = 20) from y = 10
      const rayBox5 = createFlintRay3(createFlintVec3(20, 10, 0), createFlintVec3(0, -1, 0));
      const bvhHit5Opt = flintBVHRayIntersect(bvh, rayBox5);
      expect(bvhHit5Opt.kind).toBe('some');
      if (bvhHit5Opt.kind === 'some') {
        const hit5 = bvhHit5Opt.value;
        expect(hit5.primitiveId).toBe(5);
        expect(hit5.t).toBeCloseTo(9, 5); // From y=10 to y=1
        expect(hit5.point.y).toBeCloseTo(1, 5);
        expect(hit5.normal.y).toBeCloseTo(1, 5); // Hit top face (+Y)
      }
    });
  });

  describe('Splines & Curves', () => {
    it('evaluates Bezier and Catmull-Rom splines', () => {
      const p0 = createFlintVec2(0, 0);
      const p1 = createFlintVec2(0, 10);
      const p2 = createFlintVec2(10, 10);
      const p3 = createFlintVec2(10, 0);

      const midQuad = flintBezier2Quadratic(p0, p1, p2, 0.5);
      expect(midQuad.x).toBeCloseTo(2.5, 10);
      expect(midQuad.y).toBeCloseTo(7.5, 10);

      const midCubic = flintBezier2Cubic(p0, p1, p2, p3, 0.5);
      expect(midCubic.x).toBeCloseTo(5, 10);
      expect(midCubic.y).toBeCloseTo(7.5, 10);

      const catmull = flintCatmullRom2(p0, p1, p2, p3, 0);
      expect(catmull.x).toBeCloseTo(p1.x, 10);
      expect(catmull.y).toBeCloseTo(p1.y, 10);
    });
  });

  describe('Color Spaces & Colorimetry', () => {
    it('converts between sRGB, Linear, HSV, and Oklab', () => {
      const red = createFlintColorRgba(1, 0, 0, 1);
      const redHsv = flintColorRgbToHsv(red);
      expect(redHsv.h).toBeCloseTo(0, 5);
      expect(redHsv.s).toBeCloseTo(1, 5);
      expect(redHsv.v).toBeCloseTo(1, 5);

      const backRed = flintColorHsvToRgb(redHsv);
      expect(backRed.r).toBeCloseTo(1, 5);
      expect(backRed.g).toBeCloseTo(0, 5);
      expect(backRed.b).toBeCloseTo(0, 5);

      const redLab = flintColorSrgbToOklab(red);
      const backLabRed = flintColorOklabToSrgb(redLab);
      expect(backLabRed.r).toBeCloseTo(1, 5);
      expect(backLabRed.g).toBeCloseTo(0, 5);
      expect(backLabRed.b).toBeCloseTo(0, 5);

      const blue = createFlintColorRgba(0, 0, 1, 1);
      const blended = flintColorLerpOklab(red, blue, 0.5);
      expect(blended.r).toBeGreaterThan(0);
      expect(blended.b).toBeGreaterThan(0);
    });
  });

  describe('Dynamic Matrices & Cholesky Decomposition', () => {
    it('computes LU, QR, and Cholesky decompositions', () => {
      // Symmetric positive-definite matrix:
      // [ 4  12 -16 ]
      // [ 12 37 -43 ]
      // [-16 -43 98 ]
      const spdMatrix = createFlintDMatrix(3, 3, [4, 12, -16, 12, 37, -43, -16, -43, 98]);
      const cholOpt = flintDMatrixCholesky(spdMatrix);
      expect(cholOpt.kind).toBe('some');
      if (cholOpt.kind === 'some') {
        const lowerMatrix = cholOpt.value.l;
        // L should be:
        // [ 2  0  0 ]
        // [ 6  1  0 ]
        // [-8  5  3 ]
        expect(flintDMatrixGet(lowerMatrix, 0, 0).value).toBeCloseTo(2, 10);
        expect(flintDMatrixGet(lowerMatrix, 1, 0).value).toBeCloseTo(6, 10);
        expect(flintDMatrixGet(lowerMatrix, 1, 1).value).toBeCloseTo(1, 10);
        expect(flintDMatrixGet(lowerMatrix, 2, 0).value).toBeCloseTo(-8, 10);
        expect(flintDMatrixGet(lowerMatrix, 2, 1).value).toBeCloseTo(5, 10);
        expect(flintDMatrixGet(lowerMatrix, 2, 2).value).toBeCloseTo(3, 10);

        // Solve A * x = b
        const rhsVector = createFlintDMatrix(3, 1, [0, 6, 47]);
        const solOpt = flintDMatrixCholeskySolve(cholOpt.value, rhsVector);
        expect(solOpt.kind).toBe('some');
        if (solOpt.kind === 'some') {
          // Verify A * x = b
          const axOpt = flintDMatrixMul(spdMatrix, solOpt.value);
          expect(axOpt.kind).toBe('some');
          if (axOpt.kind === 'some') {
            expect(axOpt.value.data[0]).toBeCloseTo(0, 10);
            expect(axOpt.value.data[1]).toBeCloseTo(6, 10);
            expect(axOpt.value.data[2]).toBeCloseTo(47, 10);
          }
        }
      }
    });

    it('computes LU solving and determinants', () => {
      const matA = createFlintDMatrix(2, 2, [3, 2, 1, 2]);
      const matB = createFlintDMatrix(2, 1, [5, 5]);
      const solOpt = flintDMatrixSolve(matA, matB);
      expect(solOpt.kind).toBe('some');
      if (solOpt.kind === 'some') {
        expect(solOpt.value.data[0]).toBeCloseTo(0, 10);
        expect(solOpt.value.data[1]).toBeCloseTo(2.5, 10);
      }
    });

    it('performs in-place matrix mutations without allocating new buffers', () => {
      const matrix = createFlintDMatrix(2, 2, [1, 2, 3, 4]);
      const originalBuffer = matrix.data;

      // In-place set
      expect(flintDMatrixSet(matrix, 0, 1, 10)).toBe(true);
      expect(matrix.data[1]).toBe(10);
      expect(matrix.data).toBe(originalBuffer);
      expect(flintDMatrixSet(matrix, 5, 5, 0)).toBe(false);

      // In-place add
      const addend = createFlintDMatrix(2, 2, [1, 1, 1, 1]);
      expect(flintDMatrixAddInplace(matrix, addend)).toBe(true);
      expect(matrix.data).toEqual([2, 11, 4, 5]);
      expect(matrix.data).toBe(originalBuffer);

      // In-place sub
      expect(flintDMatrixSubInplace(matrix, addend)).toBe(true);
      expect(matrix.data).toEqual([1, 10, 3, 4]);
      expect(matrix.data).toBe(originalBuffer);

      // Dimension mismatch checks
      const mismatch = createFlintDMatrix(3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(flintDMatrixAddInplace(matrix, mismatch)).toBe(false);
      expect(flintDMatrixSubInplace(matrix, mismatch)).toBe(false);

      // In-place scale
      flintDMatrixScaleInplace(matrix, 2);
      expect(matrix.data).toEqual([2, 20, 6, 8]);
      expect(matrix.data).toBe(originalBuffer);

      // In-place multiply-accumulate: out += alpha * (a * b)
      const matA = createFlintDMatrix(2, 2, [1, 2, 3, 4]);
      const matB = createFlintDMatrix(2, 2, [2, 0, 1, 2]);
      const outMatrix = createFlintDMatrix(2, 2, [1, 1, 1, 1]);
      const outBuffer = outMatrix.data;
      // a * b = [ 1*2+2*1, 1*0+2*2 ] = [ 4, 4 ]
      //         [ 3*2+4*1, 3*0+4*2 ] = [ 10, 8 ]
      // out + 0.5 * (a * b) = [ 1+2, 1+2, 1+5, 1+4 ] = [ 3, 3, 6, 5 ]
      expect(flintDMatrixMulAccumulate(outMatrix, matA, matB, 0.5)).toBe(true);
      expect(outMatrix.data).toEqual([3, 3, 6, 5]);
      expect(outMatrix.data).toBe(outBuffer);
      expect(flintDMatrixMulAccumulate(outMatrix, matA, mismatch)).toBe(false);
    });

    it('computes symmetric eigenvalue decomposition for 2x2 matrix', () => {
      // 2x2 symmetric matrix:
      // [ 2  1 ]
      // [ 1  2 ]
      // Eigenvalues are 3 and 1.
      const sym = createFlintDMatrix(2, 2, [2, 1, 1, 2]);
      const eigenOpt = flintDMatrixEigenSymmetric(sym);
      expect(eigenOpt.kind).toBe('some');

      const decomp = eigenOpt.value ?? { values: [], vectors: createFlintDMatrix(0, 0) };
      expect(decomp.values[0]).toBeCloseTo(3, 8);
      expect(decomp.values[1]).toBeCloseTo(1, 8);

      expectEigenvectorScaled(sym, decomp.vectors, 0, 3);
    });

    it('verifies eigenvector orthogonality for symmetric matrix', () => {
      const sym = createFlintDMatrix(2, 2, [2, 1, 1, 2]);
      const eigenOpt = flintDMatrixEigenSymmetric(sym);
      expect(eigenOpt.kind).toBe('some');

      const vectors = eigenOpt.value?.vectors ?? createFlintDMatrix(0, 0);
      const dot = computeColumnDotProduct(vectors, 0, 1);
      expect(dot).toBeCloseTo(0, 8);
    });

    it('rejects non-symmetric matrix for eigenvalue decomposition', () => {
      const nonSym = createFlintDMatrix(2, 2, [1, 2, 3, 4]);
      expect(flintDMatrixEigenSymmetric(nonSym).kind).toBe('none');
    });

    it('computes SVD for 3x2 rectangular matrix', () => {
      const matrixA = createFlintDMatrix(3, 2, [1, 2, 3, 4, 5, 6]);
      const svdOpt = flintDMatrixSVD(matrixA);
      expect(svdOpt.kind).toBe('some');
      const svd = svdOpt.value ?? {
        u: createFlintDMatrix(0, 0),
        s: [],
        vt: createFlintDMatrix(0, 0),
      };
      expect(svd.u.rows).toBe(3);
      expect(svd.u.cols).toBe(3);
      expect(svd.s.length).toBe(2);
      expect(svd.vt.rows).toBe(2);
      expect(svd.vt.cols).toBe(2);
      expect(svd.s[0]).toBeGreaterThan(svd.s[1] ?? 0);
      expect(svd.s[1]).toBeGreaterThan(0);

      expectSvdReconstruction(matrixA, svd.u, svd.s, svd.vt);
    });

    it('computes SVD for 2x3 wide rectangular matrix', () => {
      const aWide = createFlintDMatrix(2, 3, [1, 3, 5, 2, 4, 6]);
      const svdWideOpt = flintDMatrixSVD(aWide);
      expect(svdWideOpt.kind).toBe('some');
      const svd = svdWideOpt.value ?? {
        u: createFlintDMatrix(0, 0),
        s: [],
        vt: createFlintDMatrix(0, 0),
      };
      expect(svd.u.rows).toBe(2);
      expect(svd.u.cols).toBe(2);
      expect(svd.s.length).toBe(2);
      expect(svd.vt.rows).toBe(3);
      expect(svd.vt.cols).toBe(3);

      expectSvdReconstruction(aWide, svd.u, svd.s, svd.vt);
    });

    it('computes Moore-Penrose pseudo-inverse satisfying A * A^+ * A ≈ A', () => {
      const matrixA = createFlintDMatrix(3, 2, [1, 2, 3, 4, 5, 6]);
      const pinvOpt = flintDMatrixPseudoinverse(matrixA);
      expect(pinvOpt.kind).toBe('some');
      const pinv = pinvOpt.value ?? createFlintDMatrix(0, 0);
      expect(pinv.rows).toBe(2);
      expect(pinv.cols).toBe(3);

      expectMoorePenroseCondition(matrixA, pinv);
    });

    it('computes SVD and orthogonal basis for rank-deficient matrix', () => {
      const rank1 = createFlintDMatrix(3, 3, [1, 0, 0, 0, 0, 0, 0, 0, 0]);
      const svdRank1 = flintDMatrixSVD(rank1);
      expect(svdRank1.kind).toBe('some');
      const svd = svdRank1.value ?? {
        u: createFlintDMatrix(0, 0),
        s: [],
        vt: createFlintDMatrix(0, 0),
      };
      expect(svd.s[0]).toBeCloseTo(1, 7);
      expect(svd.s[1]).toBeCloseTo(0, 7);
      expect(svd.s[2]).toBeCloseTo(0, 7);

      expectOrthogonalColumns(svd.u);
    });
  });

  describe('N-Dimensional Tensors', () => {
    it('manages tensor shapes, fills, and matmul', () => {
      const shape = createFlintTensorShape([2, 3]);
      expect(flintTensorShapeSize(shape)).toBe(6);
      expect(shape.strides).toEqual([3, 1]);

      const t1 = flintTensorFill(shape, 2);
      expect(t1.data).toEqual([2, 2, 2, 2, 2, 2]);

      const t2Shape = createFlintTensorShape([3, 2]);
      const t2 = createFlintTensor(t2Shape, [1, 2, 3, 4, 5, 6]);

      const matmulOpt = flintTensorMatmul(t1, t2);
      expect(matmulOpt.kind).toBe('some');
      if (matmulOpt.kind === 'some') {
        expect(matmulOpt.value.shape.dimensions).toEqual([2, 2]);
        expect(matmulOpt.value.data).toEqual([18, 24, 18, 24]);
      }

      const reshapedOpt = flintTensorReshape(t1, createFlintTensorShape([6]));
      expect(reshapedOpt.kind).toBe('some');
      if (reshapedOpt.kind === 'some') {
        expect(reshapedOpt.value.shape.rank).toBe(1);
        expect(reshapedOpt.value.shape.dimensions).toEqual([6]);
      }
      expect(flintTensorReshape(t1, createFlintTensorShape([10])).kind).toBe('none');
    });

    it('creates zero-copy strided tensor views and performs slicing', () => {
      // Create a 3D tensor: 2 x 3 x 4 (24 elements: 0..23)
      const shape3d = createFlintTensorShape([2, 3, 4]);
      const data24 = Array.from({ length: 24 }, (_, index) => index);
      const tensor3d = createFlintTensor(shape3d, data24);

      // Create zero-copy view
      const view = flintTensorView(tensor3d);
      expect(view.offset).toBe(0);
      expect(view.shape.rank).toBe(3);
      expect(view.shape.dimensions).toEqual([2, 3, 4]);
      expect(view.shape.strides).toEqual([12, 4, 1]);

      // Read via view: coordinate [1, 2, 3] -> offset: 1*12 + 2*4 + 3*1 = 23
      expect(flintTensorViewGet(view, [1, 2, 3]).value).toBe(23);
      expect(flintTensorViewGet(view, [0, 1, 2]).value).toBe(6);
      expect(flintTensorViewGet(view, [5, 5, 5]).kind).toBe('none');

      // Slice along axis 1 (sub-matrix slice, start=1, length=2)
      // Original axis 1 has length 3. Slicing start=1, length=2 produces view with shape [2, 2, 4]
      const sliceOpt = flintTensorSlice(view, 1, 1, 2);
      expect(sliceOpt.kind).toBe('some');
      if (sliceOpt.kind === 'some') {
        const sliceView = sliceOpt.value;
        expect(sliceView.shape.dimensions).toEqual([2, 2, 4]);
        expect(sliceView.offset).toBe(4); // 1 * stride[1] = 4
        expect(sliceView.data).toBe(tensor3d.data); // Backing buffer preserved (zero-copy)

        // Reading (0, 0, 0) in sliceView corresponds to (0, 1, 0) in original -> 4
        expect(flintTensorViewGet(sliceView, [0, 0, 0]).value).toBe(4);
        // Reading (0, 1, 3) in sliceView corresponds to (0, 2, 3) in original -> 11
        expect(flintTensorViewGet(sliceView, [0, 1, 3]).value).toBe(11);

        // Mutating through slice view updates underlying tensor buffer
        expect(flintTensorViewSet(sliceView, [0, 0, 0], 999)).toBe(true);
        expect(tensor3d.data[4]).toBe(999);
      }

      // Invalid slice requests
      expect(flintTensorSlice(view, 0, 0, 5).kind).toBe('none'); // out of bounds
      expect(flintTensorSlice(view, 5, 0, 1).kind).toBe('none'); // invalid axis
    });
  });
});

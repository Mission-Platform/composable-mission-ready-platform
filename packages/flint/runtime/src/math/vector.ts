import { flintNone, flintSome, type FlintOption } from '../collections.js';

import { FLINT_MATH_EPSILON, flintClamp, flintLerp } from './ieee754.js';

// ==========================================
// 2. Vector Math (Vec2, Vec3, Vec4, IVec2, IVec3)
// ==========================================

/** 2D floating-point vector. */
export interface FlintVec2 {
  readonly x: number;
  readonly y: number;
}

/** 3D floating-point vector. */
export interface FlintVec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** 4D floating-point vector. */
export interface FlintVec4 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

/** 2D integer vector. */
export interface FlintIVec2 {
  readonly x: number;
  readonly y: number;
}

/** 3D integer vector. */
export interface FlintIVec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Perform create flint vec 2 operation. */
export function createFlintVec2(coordX = 0, coordY = 0): FlintVec2 {
  return { x: coordX, y: coordY };
}

/** Perform vec 2 add operation. */
export function flintVec2Add(first: FlintVec2, second: FlintVec2): FlintVec2 {
  return { x: first.x + second.x, y: first.y + second.y };
}

/** Perform vec 2 sub operation. */
export function flintVec2Sub(first: FlintVec2, second: FlintVec2): FlintVec2 {
  return { x: first.x - second.x, y: first.y - second.y };
}

/** Perform vec 2 mul operation. */
export function flintVec2Mul(first: FlintVec2, second: FlintVec2): FlintVec2 {
  return { x: first.x * second.x, y: first.y * second.y };
}

/** Perform vec 2 scale operation. */
export function flintVec2Scale(vector: FlintVec2, scalar: number): FlintVec2 {
  return { x: vector.x * scalar, y: vector.y * scalar };
}

/** Perform vec 2 div operation. */
export function flintVec2Div(vector: FlintVec2, scalar: number): FlintVec2 {
  const inv = 1 / scalar;
  return { x: vector.x * inv, y: vector.y * inv };
}

/** Perform vec 2 neg operation. */
export function flintVec2Neg(vector: FlintVec2): FlintVec2 {
  return { x: -vector.x, y: -vector.y };
}

/** Perform vec 2 dot operation. */
export function flintVec2Dot(first: FlintVec2, second: FlintVec2): number {
  return first.x * second.x + first.y * second.y;
}

/** Perform vec 2 perp dot operation. */
export function flintVec2PerpDot(first: FlintVec2, second: FlintVec2): number {
  return first.x * second.y - first.y * second.x;
}

/** Perform vec 2 length sq operation. */
export function flintVec2LengthSq(vector: FlintVec2): number {
  return vector.x * vector.x + vector.y * vector.y;
}

/** Perform vec 2 length operation. */
export function flintVec2Length(vector: FlintVec2): number {
  return Math.hypot(vector.x, vector.y);
}

/** Perform vec 2 distance operation. */
export function flintVec2Distance(first: FlintVec2, second: FlintVec2): number {
  const dx = first.x - second.x;
  const dy = first.y - second.y;
  return Math.hypot(dx, dy);
}

/** Perform vec 2 distance squared operation. */
export function flintVec2DistanceSquared(first: FlintVec2, second: FlintVec2): number {
  const dx = first.x - second.x;
  const dy = first.y - second.y;
  return dx * dx + dy * dy;
}

/** Perform vec 2 normalize operation. */
export function flintVec2Normalize(vector: FlintVec2): FlintVec2 {
  const lengthSq = vector.x * vector.x + vector.y * vector.y;
  if (lengthSq <= FLINT_MATH_EPSILON) {
    return { x: 0, y: 0 };
  }
  const length = Math.sqrt(lengthSq);
  return { x: vector.x / length, y: vector.y / length };
}

/** Perform vec 2 lerp operation. */
export function flintVec2Lerp(first: FlintVec2, second: FlintVec2, factor: number): FlintVec2 {
  return {
    x: flintLerp(first.x, second.x, factor),
    y: flintLerp(first.y, second.y, factor),
  };
}

/** Perform vec 2 reflect operation. */
export function flintVec2Reflect(vector: FlintVec2, normal: FlintVec2): FlintVec2 {
  const dotFactor = 2 * flintVec2Dot(vector, normal);
  return {
    x: vector.x - dotFactor * normal.x,
    y: vector.y - dotFactor * normal.y,
  };
}

/** Perform vec 2 project operation. */
export function flintVec2Project(vector: FlintVec2, target: FlintVec2): FlintVec2 {
  const lengthSq = flintVec2LengthSq(target);
  if (lengthSq <= FLINT_MATH_EPSILON) {
    return { x: 0, y: 0 };
  }
  const factor = flintVec2Dot(vector, target) / lengthSq;
  return {
    x: target.x * factor,
    y: target.y * factor,
  };
}

/** Perform vec 2 rotate operation. */
export function flintVec2Rotate(vector: FlintVec2, angleRad: number): FlintVec2 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  };
}

/** Perform vec 2 angle operation. */
export function flintVec2Angle(first: FlintVec2, second: FlintVec2): number {
  const dot = flintVec2Dot(first, second);
  const lengthProduct = flintVec2Length(first) * flintVec2Length(second);
  if (lengthProduct <= FLINT_MATH_EPSILON) {
    return 0;
  }
  return Math.acos(flintClamp(dot / lengthProduct, -1, 1));
}

/** Perform create flint vec 3 operation. */
export function createFlintVec3(coordX = 0, coordY = 0, coordZ = 0): FlintVec3 {
  return { x: coordX, y: coordY, z: coordZ };
}

/** Perform vec 3 add operation. */
export function flintVec3Add(first: FlintVec3, second: FlintVec3): FlintVec3 {
  return { x: first.x + second.x, y: first.y + second.y, z: first.z + second.z };
}

/** Perform vec 3 sub operation. */
export function flintVec3Sub(first: FlintVec3, second: FlintVec3): FlintVec3 {
  return { x: first.x - second.x, y: first.y - second.y, z: first.z - second.z };
}

/** Perform vec 3 mul operation. */
export function flintVec3Mul(first: FlintVec3, second: FlintVec3): FlintVec3 {
  return { x: first.x * second.x, y: first.y * second.y, z: first.z * second.z };
}

/** Perform vec 3 scale operation. */
export function flintVec3Scale(vector: FlintVec3, scalar: number): FlintVec3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

/** Perform vec 3 div operation. */
export function flintVec3Div(vector: FlintVec3, scalar: number): FlintVec3 {
  const inv = 1 / scalar;
  return { x: vector.x * inv, y: vector.y * inv, z: vector.z * inv };
}

/** Perform vec 3 neg operation. */
export function flintVec3Neg(vector: FlintVec3): FlintVec3 {
  return { x: -vector.x, y: -vector.y, z: -vector.z };
}

/** Perform vec 3 dot operation. */
export function flintVec3Dot(first: FlintVec3, second: FlintVec3): number {
  return first.x * second.x + first.y * second.y + first.z * second.z;
}

/** Perform vec 3 cross operation. */
export function flintVec3Cross(first: FlintVec3, second: FlintVec3): FlintVec3 {
  return {
    x: first.y * second.z - first.z * second.y,
    y: first.z * second.x - first.x * second.z,
    z: first.x * second.y - first.y * second.x,
  };
}

/** Perform vec 3 length sq operation. */
export function flintVec3LengthSq(vector: FlintVec3): number {
  return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
}

/** Perform vec 3 length operation. */
export function flintVec3Length(vector: FlintVec3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

/** Perform vec 3 distance operation. */
export function flintVec3Distance(first: FlintVec3, second: FlintVec3): number {
  const dx = first.x - second.x;
  const dy = first.y - second.y;
  const dz = first.z - second.z;
  return Math.hypot(dx, dy, dz);
}

/** Perform vec 3 distance squared operation. */
export function flintVec3DistanceSquared(first: FlintVec3, second: FlintVec3): number {
  const dx = first.x - second.x;
  const dy = first.y - second.y;
  const dz = first.z - second.z;
  return dx * dx + dy * dy + dz * dz;
}

/** Perform vec 3 normalize operation. */
export function flintVec3Normalize(vector: FlintVec3): FlintVec3 {
  const lengthSq = vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
  if (lengthSq <= FLINT_MATH_EPSILON) {
    return { x: 0, y: 0, z: 0 };
  }
  const length = Math.sqrt(lengthSq);
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

/** Perform vec 3 lerp operation. */
export function flintVec3Lerp(first: FlintVec3, second: FlintVec3, factor: number): FlintVec3 {
  return {
    x: flintLerp(first.x, second.x, factor),
    y: flintLerp(first.y, second.y, factor),
    z: flintLerp(first.z, second.z, factor),
  };
}

/** Perform vec 3 slerp operation. */
export function flintVec3Slerp(first: FlintVec3, second: FlintVec3, factor: number): FlintVec3 {
  const normFirst = flintVec3Normalize(first);
  const normSecond = flintVec3Normalize(second);
  const dot = flintClamp(flintVec3Dot(normFirst, normSecond), -1, 1);
  if (Math.abs(dot) > 0.9995) {
    return flintVec3Normalize(flintVec3Lerp(normFirst, normSecond, factor));
  }
  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);
  const factorFirst = Math.sin((1 - factor) * theta) / sinTheta;
  const factorSecond = Math.sin(factor * theta) / sinTheta;
  const slerpedNorm = flintVec3Add(flintVec3Scale(normFirst, factorFirst), flintVec3Scale(normSecond, factorSecond));
  const lengthFirst = flintVec3Length(first);
  const lengthSecond = flintVec3Length(second);
  const length = flintLerp(lengthFirst, lengthSecond, factor);
  return flintVec3Scale(slerpedNorm, length);
}

/** Perform vec 3 reflect operation. */
export function flintVec3Reflect(vector: FlintVec3, normal: FlintVec3): FlintVec3 {
  const dotFactor = 2 * flintVec3Dot(vector, normal);
  return {
    x: vector.x - dotFactor * normal.x,
    y: vector.y - dotFactor * normal.y,
    z: vector.z - dotFactor * normal.z,
  };
}

/** Perform vec 3 refract operation. */
export function flintVec3Refract(vector: FlintVec3, normal: FlintVec3, eta: number): FlintVec3 {
  const dot = flintVec3Dot(vector, normal);
  const discriminant = 1 - eta * eta * (1 - dot * dot);
  if (discriminant < 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return flintVec3Sub(flintVec3Scale(vector, eta), flintVec3Scale(normal, eta * dot + Math.sqrt(discriminant)));
}

/** Perform vec 3 project operation. */
export function flintVec3Project(vector: FlintVec3, target: FlintVec3): FlintVec3 {
  const lengthSq = flintVec3LengthSq(target);
  if (lengthSq <= FLINT_MATH_EPSILON) {
    return { x: 0, y: 0, z: 0 };
  }
  const factor = flintVec3Dot(vector, target) / lengthSq;
  return {
    x: target.x * factor,
    y: target.y * factor,
    z: target.z * factor,
  };
}

/** Perform vec 3 reject operation. */
export function flintVec3Reject(vector: FlintVec3, from: FlintVec3): FlintVec3 {
  const proj = flintVec3Project(vector, from);
  return flintVec3Sub(vector, proj);
}

/** Perform vec 3 angle operation. */
export function flintVec3Angle(first: FlintVec3, second: FlintVec3): number {
  const dot = flintVec3Dot(first, second);
  const lengthProduct = flintVec3Length(first) * flintVec3Length(second);
  if (lengthProduct <= FLINT_MATH_EPSILON) {
    return 0;
  }
  return Math.acos(flintClamp(dot / lengthProduct, -1, 1));
}

/** Perform create flint vec 4 operation. */
export function createFlintVec4(coordX = 0, coordY = 0, coordZ = 0, coordW = 0): FlintVec4 {
  return { x: coordX, y: coordY, z: coordZ, w: coordW };
}

/** Perform vec 4 add operation. */
export function flintVec4Add(first: FlintVec4, second: FlintVec4): FlintVec4 {
  return { x: first.x + second.x, y: first.y + second.y, z: first.z + second.z, w: first.w + second.w };
}

/** Perform vec 4 sub operation. */
export function flintVec4Sub(first: FlintVec4, second: FlintVec4): FlintVec4 {
  return { x: first.x - second.x, y: first.y - second.y, z: first.z - second.z, w: first.w - second.w };
}

/** Perform vec 4 scale operation. */
export function flintVec4Scale(vector: FlintVec4, scalar: number): FlintVec4 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar, w: vector.w * scalar };
}

/** Perform vec 4 div operation. */
export function flintVec4Div(vector: FlintVec4, scalar: number): FlintVec4 {
  const inv = 1 / scalar;
  return { x: vector.x * inv, y: vector.y * inv, z: vector.z * inv, w: vector.w * inv };
}

/** Perform vec 4 neg operation. */
export function flintVec4Neg(vector: FlintVec4): FlintVec4 {
  return { x: -vector.x, y: -vector.y, z: -vector.z, w: -vector.w };
}

/** Perform vec 4 dot operation. */
export function flintVec4Dot(first: FlintVec4, second: FlintVec4): number {
  return first.x * second.x + first.y * second.y + first.z * second.z + first.w * second.w;
}

/** Perform vec 4 length operation. */
export function flintVec4Length(vector: FlintVec4): number {
  return Math.hypot(vector.x, vector.y, vector.z, vector.w);
}

/** Perform vec 4 normalize operation. */
export function flintVec4Normalize(vector: FlintVec4): FlintVec4 {
  const lengthSq = vector.x * vector.x + vector.y * vector.y + vector.z * vector.z + vector.w * vector.w;
  if (lengthSq <= FLINT_MATH_EPSILON) {
    return { x: 0, y: 0, z: 0, w: 0 };
  }
  const length = Math.sqrt(lengthSq);
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length, w: vector.w / length };
}

/** Perform vec 4 lerp operation. */
export function flintVec4Lerp(first: FlintVec4, second: FlintVec4, factor: number): FlintVec4 {
  return {
    x: flintLerp(first.x, second.x, factor),
    y: flintLerp(first.y, second.y, factor),
    z: flintLerp(first.z, second.z, factor),
    w: flintLerp(first.w, second.w, factor),
  };
}

/** Perform create flint i vec 2 operation. */
export function createFlintIVec2(coordX = 0, coordY = 0): FlintIVec2 {
  return { x: Math.trunc(coordX), y: Math.trunc(coordY) };
}

/** Perform create flint i vec 3 operation. */
export function createFlintIVec3(coordX = 0, coordY = 0, coordZ = 0): FlintIVec3 {
  return { x: Math.trunc(coordX), y: Math.trunc(coordY), z: Math.trunc(coordZ) };
}

// ==========================================
// 3. Matrix Math (Mat2, Mat3, Mat4) - Vector-Composed Column-Major
// ==========================================

/** Mat 2 representation. */
export interface FlintMat2 {
  readonly c0: FlintVec2;
  readonly c1: FlintVec2;
  readonly elements: readonly [number, number, number, number];
}

/** Mat 3 representation. */
export interface FlintMat3 {
  readonly c0: FlintVec3;
  readonly c1: FlintVec3;
  readonly c2: FlintVec3;
  readonly elements: readonly [number, number, number, number, number, number, number, number, number];
}

/** Mat 4 representation. */
export interface FlintMat4 {
  readonly c0: FlintVec4;
  readonly c1: FlintVec4;
  readonly c2: FlintVec4;
  readonly c3: FlintVec4;
  readonly elements: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
}

/** Create a FlintMat2 matrix from a flat array of numbers. */
function createMat2FromElements(elements: readonly number[]): FlintMat2 {
  const col0 = { x: elements[0] ?? 0, y: elements[1] ?? 0 };
  const col1 = { x: elements[2] ?? 0, y: elements[3] ?? 0 };
  const flatElements: FlintMat2['elements'] = [col0.x, col0.y, col1.x, col1.y];
  return {
    c0: col0,
    c1: col1,
    elements: flatElements,
  };
}

/** Perform create flint mat 2 operation. */
export function createFlintMat2(column0OrElements?: FlintVec2 | readonly number[], column1?: FlintVec2): FlintMat2 {
  if (Array.isArray(column0OrElements)) {
    return createMat2FromElements(column0OrElements);
  }
  const columnZero = column0OrElements && 'x' in column0OrElements ? column0OrElements : { x: 0, y: 0 };
  const columnOne = column1 ?? { x: 0, y: 0 };
  const flatElements: FlintMat2['elements'] = [columnZero.x, columnZero.y, columnOne.x, columnOne.y];
  return {
    c0: columnZero,
    c1: columnOne,
    elements: flatElements,
  };
}

/** Perform mat 2 identity operation. */
export function flintMat2Identity(): FlintMat2 {
  return createFlintMat2({ x: 1, y: 0 }, { x: 0, y: 1 });
}

/** Perform mat 2 from cols operation. */
export function flintMat2FromCols(column0: FlintVec2, column1: FlintVec2): FlintMat2 {
  return createFlintMat2(column0, column1);
}

/** Perform mat 2 add operation. */
export function flintMat2Add(first: FlintMat2, second: FlintMat2): FlintMat2 {
  return createFlintMat2(flintVec2Add(first.c0, second.c0), flintVec2Add(first.c1, second.c1));
}

/** Perform mat 2 sub operation. */
export function flintMat2Sub(first: FlintMat2, second: FlintMat2): FlintMat2 {
  return createFlintMat2(flintVec2Sub(first.c0, second.c0), flintVec2Sub(first.c1, second.c1));
}

/** Perform mat 2 scale operation. */
export function flintMat2Scale(matrix: FlintMat2, scalar: number): FlintMat2 {
  return createFlintMat2(flintVec2Scale(matrix.c0, scalar), flintVec2Scale(matrix.c1, scalar));
}

/** Perform mat 2 mul operation. */
export function flintMat2Mul(first: FlintMat2, second: FlintMat2): FlintMat2 {
  return createFlintMat2(
    {
      x: first.c0.x * second.c0.x + first.c1.x * second.c0.y,
      y: first.c0.y * second.c0.x + first.c1.y * second.c0.y,
    },
    {
      x: first.c0.x * second.c1.x + first.c1.x * second.c1.y,
      y: first.c0.y * second.c1.x + first.c1.y * second.c1.y,
    },
  );
}

/** Perform mat 2 transform vec 2 operation. */
export function flintMat2TransformVec2(matrix: FlintMat2, vector: FlintVec2): FlintVec2 {
  return {
    x: matrix.c0.x * vector.x + matrix.c1.x * vector.y,
    y: matrix.c0.y * vector.x + matrix.c1.y * vector.y,
  };
}

/** Perform mat 2 transpose operation. */
export function flintMat2Transpose(matrix: FlintMat2): FlintMat2 {
  return createFlintMat2({ x: matrix.c0.x, y: matrix.c1.x }, { x: matrix.c0.y, y: matrix.c1.y });
}

/** Perform mat 2 determinant operation. */
export function flintMat2Determinant(matrix: FlintMat2): number {
  return matrix.c0.x * matrix.c1.y - matrix.c1.x * matrix.c0.y;
}

/** Perform mat 2 inverse operation. */
export function flintMat2Inverse(matrix: FlintMat2): FlintOption<FlintMat2> {
  const det = flintMat2Determinant(matrix);
  if (Math.abs(det) <= FLINT_MATH_EPSILON) {
    return flintNone();
  }
  const invDet = 1 / det;
  return flintSome(
    createFlintMat2(
      { x: matrix.c1.y * invDet, y: -matrix.c0.y * invDet },
      { x: -matrix.c1.x * invDet, y: matrix.c0.x * invDet },
    ),
  );
}

/** Perform mat 2 rotation operation. */
export function flintMat2Rotation(angleRad: number): FlintMat2 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return createFlintMat2({ x: cos, y: sin }, { x: -sin, y: cos });
}

/** Perform mat 2 scaling operation. */
export function flintMat2Scaling(scaleVector: FlintVec2): FlintMat2 {
  return createFlintMat2({ x: scaleVector.x, y: 0 }, { x: 0, y: scaleVector.y });
}

/** Extract a 3D vector from a flat array at a given offset. */
function readVec3AtOffset(elements: readonly number[], offset: number): FlintVec3 {
  return {
    x: elements[offset] ?? 0,
    y: elements[offset + 1] ?? 0,
    z: elements[offset + 2] ?? 0,
  };
}

/** Create a FlintMat3 matrix from a flat array of numbers. */
function createMat3FromElements(elements: readonly number[]): FlintMat3 {
  const col0 = readVec3AtOffset(elements, 0);
  const col1 = readVec3AtOffset(elements, 3);
  const col2 = readVec3AtOffset(elements, 6);
  const flatElements: FlintMat3['elements'] = [col0.x, col0.y, col0.z, col1.x, col1.y, col1.z, col2.x, col2.y, col2.z];
  return {
    c0: col0,
    c1: col1,
    c2: col2,
    elements: flatElements,
  };
}

/** Create a FlintMat3 matrix from 3 column vectors. */
function createMat3FromColumns(column0?: FlintVec3, column1?: FlintVec3, column2?: FlintVec3): FlintMat3 {
  const col0 = column0 ?? { x: 0, y: 0, z: 0 };
  const col1 = column1 ?? { x: 0, y: 0, z: 0 };
  const col2 = column2 ?? { x: 0, y: 0, z: 0 };
  const flatElements: FlintMat3['elements'] = [col0.x, col0.y, col0.z, col1.x, col1.y, col1.z, col2.x, col2.y, col2.z];
  return {
    c0: col0,
    c1: col1,
    c2: col2,
    elements: flatElements,
  };
}

/** Coerce input to vector if not an array. */
function toFlintVec3(column?: FlintVec3 | readonly number[]): FlintVec3 | undefined {
  return column && 'x' in column ? column : undefined;
}

/** Perform create flint mat 3 operation. */
export function createFlintMat3(
  column0OrElements?: FlintVec3 | readonly number[],
  column1?: FlintVec3,
  column2?: FlintVec3,
): FlintMat3 {
  if (Array.isArray(column0OrElements)) {
    return createMat3FromElements(column0OrElements);
  }
  return createMat3FromColumns(toFlintVec3(column0OrElements), column1, column2);
}

/** Perform mat 3 identity operation. */
export function flintMat3Identity(): FlintMat3 {
  return createFlintMat3({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 });
}

/** Perform mat 3 from cols operation. */
export function flintMat3FromCols(column0: FlintVec3, column1: FlintVec3, column2: FlintVec3): FlintMat3 {
  return createFlintMat3(column0, column1, column2);
}

/** Perform mat 3 add operation. */
export function flintMat3Add(first: FlintMat3, second: FlintMat3): FlintMat3 {
  return createFlintMat3(
    flintVec3Add(first.c0, second.c0),
    flintVec3Add(first.c1, second.c1),
    flintVec3Add(first.c2, second.c2),
  );
}

/** Perform mat 3 sub operation. */
export function flintMat3Sub(first: FlintMat3, second: FlintMat3): FlintMat3 {
  return createFlintMat3(
    flintVec3Sub(first.c0, second.c0),
    flintVec3Sub(first.c1, second.c1),
    flintVec3Sub(first.c2, second.c2),
  );
}

/** Perform mat 3 scale operation. */
export function flintMat3Scale(matrix: FlintMat3, scalar: number): FlintMat3 {
  return createFlintMat3(
    flintVec3Scale(matrix.c0, scalar),
    flintVec3Scale(matrix.c1, scalar),
    flintVec3Scale(matrix.c2, scalar),
  );
}

/** Perform mat 3 mul operation. */
export function flintMat3Mul(first: FlintMat3, second: FlintMat3): FlintMat3 {
  return createFlintMat3(
    {
      x: first.c0.x * second.c0.x + first.c1.x * second.c0.y + first.c2.x * second.c0.z,
      y: first.c0.y * second.c0.x + first.c1.y * second.c0.y + first.c2.y * second.c0.z,
      z: first.c0.z * second.c0.x + first.c1.z * second.c0.y + first.c2.z * second.c0.z,
    },
    {
      x: first.c0.x * second.c1.x + first.c1.x * second.c1.y + first.c2.x * second.c1.z,
      y: first.c0.y * second.c1.x + first.c1.y * second.c1.y + first.c2.y * second.c1.z,
      z: first.c0.z * second.c1.x + first.c1.z * second.c1.y + first.c2.z * second.c1.z,
    },
    {
      x: first.c0.x * second.c2.x + first.c1.x * second.c2.y + first.c2.x * second.c2.z,
      y: first.c0.y * second.c2.x + first.c1.y * second.c2.y + first.c2.y * second.c2.z,
      z: first.c0.z * second.c2.x + first.c1.z * second.c2.y + first.c2.z * second.c2.z,
    },
  );
}

/** Perform mat 3 transform vec 3 operation. */
export function flintMat3TransformVec3(matrix: FlintMat3, vector: FlintVec3): FlintVec3 {
  return {
    x: matrix.c0.x * vector.x + matrix.c1.x * vector.y + matrix.c2.x * vector.z,
    y: matrix.c0.y * vector.x + matrix.c1.y * vector.y + matrix.c2.y * vector.z,
    z: matrix.c0.z * vector.x + matrix.c1.z * vector.y + matrix.c2.z * vector.z,
  };
}

/** Perform mat 3 transform vec 2 operation. */
export function flintMat3TransformVec2(matrix: FlintMat3, vector: FlintVec2): FlintVec2 {
  return {
    x: matrix.c0.x * vector.x + matrix.c1.x * vector.y + matrix.c2.x,
    y: matrix.c0.y * vector.x + matrix.c1.y * vector.y + matrix.c2.y,
  };
}

/** Perform mat 3 transpose operation. */
export function flintMat3Transpose(matrix: FlintMat3): FlintMat3 {
  return createFlintMat3(
    { x: matrix.c0.x, y: matrix.c1.x, z: matrix.c2.x },
    { x: matrix.c0.y, y: matrix.c1.y, z: matrix.c2.y },
    { x: matrix.c0.z, y: matrix.c1.z, z: matrix.c2.z },
  );
}

/** Perform mat 3 determinant operation. */
export function flintMat3Determinant(matrix: FlintMat3): number {
  return (
    matrix.c0.x * (matrix.c1.y * matrix.c2.z - matrix.c2.y * matrix.c1.z) -
    matrix.c1.x * (matrix.c0.y * matrix.c2.z - matrix.c2.y * matrix.c0.z) +
    matrix.c2.x * (matrix.c0.y * matrix.c1.z - matrix.c1.y * matrix.c0.z)
  );
}

/** Perform mat 3 inverse operation. */
export function flintMat3Inverse(matrix: FlintMat3): FlintOption<FlintMat3> {
  const det = flintMat3Determinant(matrix);
  if (Math.abs(det) <= FLINT_MATH_EPSILON) {
    return flintNone();
  }
  const invDet = 1 / det;
  return flintSome(
    createFlintMat3(
      {
        x: (matrix.c1.y * matrix.c2.z - matrix.c2.y * matrix.c1.z) * invDet,
        y: (matrix.c2.y * matrix.c0.z - matrix.c0.y * matrix.c2.z) * invDet,
        z: (matrix.c0.y * matrix.c1.z - matrix.c1.y * matrix.c0.z) * invDet,
      },
      {
        x: (matrix.c2.x * matrix.c1.z - matrix.c1.x * matrix.c2.z) * invDet,
        y: (matrix.c0.x * matrix.c2.z - matrix.c2.x * matrix.c0.z) * invDet,
        z: (matrix.c1.x * matrix.c0.z - matrix.c0.x * matrix.c1.z) * invDet,
      },
      {
        x: (matrix.c1.x * matrix.c2.y - matrix.c2.x * matrix.c1.y) * invDet,
        y: (matrix.c2.x * matrix.c0.y - matrix.c0.x * matrix.c2.y) * invDet,
        z: (matrix.c0.x * matrix.c1.y - matrix.c1.x * matrix.c0.y) * invDet,
      },
    ),
  );
}

/** Perform mat 3 translate 2 d operation. */
export function flintMat3Translate2D(translation: FlintVec2): FlintMat3 {
  return createFlintMat3({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: translation.x, y: translation.y, z: 1 });
}

/** Perform mat 3 rotate 2 d operation. */
export function flintMat3Rotate2D(angleRad: number): FlintMat3 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return createFlintMat3({ x: cos, y: sin, z: 0 }, { x: -sin, y: cos, z: 0 }, { x: 0, y: 0, z: 1 });
}

/** Perform mat 3 scale 2 d operation. */
export function flintMat3Scale2D(scale: FlintVec2): FlintMat3 {
  return createFlintMat3({ x: scale.x, y: 0, z: 0 }, { x: 0, y: scale.y, z: 0 }, { x: 0, y: 0, z: 1 });
}

/** Extract a 4D vector from a flat array at a given offset. */
function readVec4AtOffset(elements: readonly number[], offset: number): FlintVec4 {
  return {
    x: elements[offset] ?? 0,
    y: elements[offset + 1] ?? 0,
    z: elements[offset + 2] ?? 0,
    w: elements[offset + 3] ?? 0,
  };
}

/** Create a FlintMat4 matrix from a flat array of numbers. */
function createMat4FromElements(elements: readonly number[]): FlintMat4 {
  const col0 = readVec4AtOffset(elements, 0);
  const col1 = readVec4AtOffset(elements, 4);
  const col2 = readVec4AtOffset(elements, 8);
  const col3 = readVec4AtOffset(elements, 12);
  const flatElements: FlintMat4['elements'] = [
    col0.x,
    col0.y,
    col0.z,
    col0.w,
    col1.x,
    col1.y,
    col1.z,
    col1.w,
    col2.x,
    col2.y,
    col2.z,
    col2.w,
    col3.x,
    col3.y,
    col3.z,
    col3.w,
  ];
  return {
    c0: col0,
    c1: col1,
    c2: col2,
    c3: col3,
    elements: flatElements,
  };
}

/** Create a FlintMat4 matrix from 4 column vectors. */
function createMat4FromColumns(
  column0?: FlintVec4,
  column1?: FlintVec4,
  column2?: FlintVec4,
  column3?: FlintVec4,
): FlintMat4 {
  const col0 = column0 ?? { x: 0, y: 0, z: 0, w: 0 };
  const col1 = column1 ?? { x: 0, y: 0, z: 0, w: 0 };
  const col2 = column2 ?? { x: 0, y: 0, z: 0, w: 0 };
  const col3 = column3 ?? { x: 0, y: 0, z: 0, w: 0 };
  const flatElements: FlintMat4['elements'] = [
    col0.x,
    col0.y,
    col0.z,
    col0.w,
    col1.x,
    col1.y,
    col1.z,
    col1.w,
    col2.x,
    col2.y,
    col2.z,
    col2.w,
    col3.x,
    col3.y,
    col3.z,
    col3.w,
  ];
  return {
    c0: col0,
    c1: col1,
    c2: col2,
    c3: col3,
    elements: flatElements,
  };
}

/** Coerce input to vector if not an array. */
function toFlintVec4(column?: FlintVec4 | readonly number[]): FlintVec4 | undefined {
  return column && 'x' in column ? column : undefined;
}

/** Perform create flint mat 4 operation. */
export function createFlintMat4(
  column0OrElements?: FlintVec4 | readonly number[],
  column1?: FlintVec4,
  column2?: FlintVec4,
  column3?: FlintVec4,
): FlintMat4 {
  if (Array.isArray(column0OrElements)) {
    return createMat4FromElements(column0OrElements);
  }
  return createMat4FromColumns(toFlintVec4(column0OrElements), column1, column2, column3);
}

/** Perform mat 4 identity operation. */
export function flintMat4Identity(): FlintMat4 {
  return createFlintMat4(
    { x: 1, y: 0, z: 0, w: 0 },
    { x: 0, y: 1, z: 0, w: 0 },
    { x: 0, y: 0, z: 1, w: 0 },
    { x: 0, y: 0, z: 0, w: 1 },
  );
}

/** Perform mat 4 from cols operation. */
export function flintMat4FromCols(
  column0: FlintVec4,
  column1: FlintVec4,
  column2: FlintVec4,
  column3: FlintVec4,
): FlintMat4 {
  return createFlintMat4(column0, column1, column2, column3);
}

/** Perform mat 4 add operation. */
export function flintMat4Add(first: FlintMat4, second: FlintMat4): FlintMat4 {
  return createFlintMat4(
    flintVec4Add(first.c0, second.c0),
    flintVec4Add(first.c1, second.c1),
    flintVec4Add(first.c2, second.c2),
    flintVec4Add(first.c3, second.c3),
  );
}

/** Perform mat 4 sub operation. */
export function flintMat4Sub(first: FlintMat4, second: FlintMat4): FlintMat4 {
  return createFlintMat4(
    flintVec4Sub(first.c0, second.c0),
    flintVec4Sub(first.c1, second.c1),
    flintVec4Sub(first.c2, second.c2),
    flintVec4Sub(first.c3, second.c3),
  );
}

/** Perform mat 4 scale operation. */
export function flintMat4Scale(matrix: FlintMat4, scalar: number): FlintMat4 {
  return createFlintMat4(
    flintVec4Scale(matrix.c0, scalar),
    flintVec4Scale(matrix.c1, scalar),
    flintVec4Scale(matrix.c2, scalar),
    flintVec4Scale(matrix.c3, scalar),
  );
}

/** Perform mat 4 mul operation. */
export function flintMat4Mul(first: FlintMat4, second: FlintMat4): FlintMat4 {
  return createFlintMat4(
    {
      x: first.c0.x * second.c0.x + first.c1.x * second.c0.y + first.c2.x * second.c0.z + first.c3.x * second.c0.w,
      y: first.c0.y * second.c0.x + first.c1.y * second.c0.y + first.c2.y * second.c0.z + first.c3.y * second.c0.w,
      z: first.c0.z * second.c0.x + first.c1.z * second.c0.y + first.c2.z * second.c0.z + first.c3.z * second.c0.w,
      w: first.c0.w * second.c0.x + first.c1.w * second.c0.y + first.c2.w * second.c0.z + first.c3.w * second.c0.w,
    },
    {
      x: first.c0.x * second.c1.x + first.c1.x * second.c1.y + first.c2.x * second.c1.z + first.c3.x * second.c1.w,
      y: first.c0.y * second.c1.x + first.c1.y * second.c1.y + first.c2.y * second.c1.z + first.c3.y * second.c1.w,
      z: first.c0.z * second.c1.x + first.c1.z * second.c1.y + first.c2.z * second.c1.z + first.c3.z * second.c1.w,
      w: first.c0.w * second.c1.x + first.c1.w * second.c1.y + first.c2.w * second.c1.z + first.c3.w * second.c1.w,
    },
    {
      x: first.c0.x * second.c2.x + first.c1.x * second.c2.y + first.c2.x * second.c2.z + first.c3.x * second.c2.w,
      y: first.c0.y * second.c2.x + first.c1.y * second.c2.y + first.c2.y * second.c2.z + first.c3.y * second.c2.w,
      z: first.c0.z * second.c2.x + first.c1.z * second.c2.y + first.c2.z * second.c2.z + first.c3.z * second.c2.w,
      w: first.c0.w * second.c2.x + first.c1.w * second.c2.y + first.c2.w * second.c2.z + first.c3.w * second.c2.w,
    },
    {
      x: first.c0.x * second.c3.x + first.c1.x * second.c3.y + first.c2.x * second.c3.z + first.c3.x * second.c3.w,
      y: first.c0.y * second.c3.x + first.c1.y * second.c3.y + first.c2.y * second.c3.z + first.c3.y * second.c3.w,
      z: first.c0.z * second.c3.x + first.c1.z * second.c3.y + first.c2.z * second.c3.z + first.c3.z * second.c3.w,
      w: first.c0.w * second.c3.x + first.c1.w * second.c3.y + first.c2.w * second.c3.z + first.c3.w * second.c3.w,
    },
  );
}

/** Perform mat 4 transform vec 4 operation. */
export function flintMat4TransformVec4(matrix: FlintMat4, vector: FlintVec4): FlintVec4 {
  return {
    x: matrix.c0.x * vector.x + matrix.c1.x * vector.y + matrix.c2.x * vector.z + matrix.c3.x * vector.w,
    y: matrix.c0.y * vector.x + matrix.c1.y * vector.y + matrix.c2.y * vector.z + matrix.c3.y * vector.w,
    z: matrix.c0.z * vector.x + matrix.c1.z * vector.y + matrix.c2.z * vector.z + matrix.c3.z * vector.w,
    w: matrix.c0.w * vector.x + matrix.c1.w * vector.y + matrix.c2.w * vector.z + matrix.c3.w * vector.w,
  };
}

/** Perform mat 4 transform point 3 operation. */
export function flintMat4TransformPoint3(matrix: FlintMat4, point: FlintVec3): FlintVec3 {
  const vector4 = flintMat4TransformVec4(matrix, { x: point.x, y: point.y, z: point.z, w: 1 });
  const invW = Math.abs(vector4.w) <= FLINT_MATH_EPSILON ? 1 : 1 / vector4.w;
  return { x: vector4.x * invW, y: vector4.y * invW, z: vector4.z * invW };
}

/** Perform mat 4 transform vector 3 operation. */
export function flintMat4TransformVector3(matrix: FlintMat4, vector: FlintVec3): FlintVec3 {
  const vector4 = flintMat4TransformVec4(matrix, { x: vector.x, y: vector.y, z: vector.z, w: 0 });
  return { x: vector4.x, y: vector4.y, z: vector4.z };
}

/** Perform mat 4 transpose operation. */
export function flintMat4Transpose(matrix: FlintMat4): FlintMat4 {
  return createFlintMat4(
    { x: matrix.c0.x, y: matrix.c1.x, z: matrix.c2.x, w: matrix.c3.x },
    { x: matrix.c0.y, y: matrix.c1.y, z: matrix.c2.y, w: matrix.c3.y },
    { x: matrix.c0.z, y: matrix.c1.z, z: matrix.c2.z, w: matrix.c3.z },
    { x: matrix.c0.w, y: matrix.c1.w, z: matrix.c2.w, w: matrix.c3.w },
  );
}

/** Perform mat 4 determinant operation. */
export function flintMat4Determinant(matrix: FlintMat4): number {
  const a00 = matrix.c0.x;
  const a01 = matrix.c0.y;
  const a02 = matrix.c0.z;
  const a03 = matrix.c0.w;
  const a10 = matrix.c1.x;
  const a11 = matrix.c1.y;
  const a12 = matrix.c1.z;
  const a13 = matrix.c1.w;
  const a20 = matrix.c2.x;
  const a21 = matrix.c2.y;
  const a22 = matrix.c2.z;
  const a23 = matrix.c2.w;
  const a30 = matrix.c3.x;
  const a31 = matrix.c3.y;
  const a32 = matrix.c3.z;
  const a33 = matrix.c3.w;

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}

/** Perform mat 4 inverse operation. */
export function flintMat4Inverse(matrix: FlintMat4): FlintOption<FlintMat4> {
  const a00 = matrix.c0.x;
  const a01 = matrix.c0.y;
  const a02 = matrix.c0.z;
  const a03 = matrix.c0.w;
  const a10 = matrix.c1.x;
  const a11 = matrix.c1.y;
  const a12 = matrix.c1.z;
  const a13 = matrix.c1.w;
  const a20 = matrix.c2.x;
  const a21 = matrix.c2.y;
  const a22 = matrix.c2.z;
  const a23 = matrix.c2.w;
  const a30 = matrix.c3.x;
  const a31 = matrix.c3.y;
  const a32 = matrix.c3.z;
  const a33 = matrix.c3.w;

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (Math.abs(det) <= FLINT_MATH_EPSILON) {
    return flintNone();
  }
  const invDet = 1 / det;

  return flintSome(
    createFlintMat4(
      {
        x: (a11 * b11 - a12 * b10 + a13 * b09) * invDet,
        y: (a02 * b10 - a01 * b11 - a03 * b09) * invDet,
        z: (a31 * b05 - a32 * b04 + a33 * b03) * invDet,
        w: (a22 * b04 - a21 * b05 - a23 * b03) * invDet,
      },
      {
        x: (a12 * b08 - a10 * b11 - a13 * b07) * invDet,
        y: (a00 * b11 - a02 * b08 + a03 * b07) * invDet,
        z: (a32 * b02 - a30 * b05 - a33 * b01) * invDet,
        w: (a20 * b05 - a22 * b02 + a23 * b01) * invDet,
      },
      {
        x: (a10 * b10 - a11 * b08 + a13 * b06) * invDet,
        y: (a01 * b08 - a00 * b10 - a03 * b06) * invDet,
        z: (a30 * b04 - a31 * b02 + a33 * b00) * invDet,
        w: (a21 * b02 - a20 * b04 - a23 * b00) * invDet,
      },
      {
        x: (a11 * b07 - a10 * b09 - a12 * b06) * invDet,
        y: (a00 * b09 - a01 * b07 + a02 * b06) * invDet,
        z: (a31 * b01 - a30 * b03 - a32 * b00) * invDet,
        w: (a20 * b03 - a21 * b01 + a22 * b00) * invDet,
      },
    ),
  );
}

/** Perform mat 4 translation operation. */
export function flintMat4Translation(offset: FlintVec3): FlintMat4 {
  return createFlintMat4(
    { x: 1, y: 0, z: 0, w: 0 },
    { x: 0, y: 1, z: 0, w: 0 },
    { x: 0, y: 0, z: 1, w: 0 },
    { x: offset.x, y: offset.y, z: offset.z, w: 1 },
  );
}

/** Perform mat 4 scaling operation. */
export function flintMat4Scaling(scale: FlintVec3): FlintMat4 {
  return createFlintMat4(
    { x: scale.x, y: 0, z: 0, w: 0 },
    { x: 0, y: scale.y, z: 0, w: 0 },
    { x: 0, y: 0, z: scale.z, w: 0 },
    { x: 0, y: 0, z: 0, w: 1 },
  );
}

/** Perform mat 4 rotation x operation. */
export function flintMat4RotationX(angleRad: number): FlintMat4 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return createFlintMat4(
    { x: 1, y: 0, z: 0, w: 0 },
    { x: 0, y: cos, z: sin, w: 0 },
    { x: 0, y: -sin, z: cos, w: 0 },
    { x: 0, y: 0, z: 0, w: 1 },
  );
}

/** Perform mat 4 rotation y operation. */
export function flintMat4RotationY(angleRad: number): FlintMat4 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return createFlintMat4(
    { x: cos, y: 0, z: -sin, w: 0 },
    { x: 0, y: 1, z: 0, w: 0 },
    { x: sin, y: 0, z: cos, w: 0 },
    { x: 0, y: 0, z: 0, w: 1 },
  );
}

/** Perform mat 4 rotation z operation. */
export function flintMat4RotationZ(angleRad: number): FlintMat4 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return createFlintMat4(
    { x: cos, y: sin, z: 0, w: 0 },
    { x: -sin, y: cos, z: 0, w: 0 },
    { x: 0, y: 0, z: 1, w: 0 },
    { x: 0, y: 0, z: 0, w: 1 },
  );
}

/** Perform mat 4 rotation axis angle operation. */
export function flintMat4RotationAxisAngle(axis: FlintVec3, angleRad: number): FlintMat4 {
  if (flintVec3LengthSq(axis) <= FLINT_MATH_EPSILON) {
    return flintMat4Identity();
  }
  const norm = flintVec3Normalize(axis);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const oneMinusCos = 1 - cos;
  const { x, y, z } = norm;

  return createFlintMat4(
    {
      x: oneMinusCos * x * x + cos,
      y: oneMinusCos * x * y + sin * z,
      z: oneMinusCos * x * z - sin * y,
      w: 0,
    },
    {
      x: oneMinusCos * x * y - sin * z,
      y: oneMinusCos * y * y + cos,
      z: oneMinusCos * y * z + sin * x,
      w: 0,
    },
    {
      x: oneMinusCos * x * z + sin * y,
      y: oneMinusCos * y * z - sin * x,
      z: oneMinusCos * z * z + cos,
      w: 0,
    },
    { x: 0, y: 0, z: 0, w: 1 },
  );
}

/** Perform mat 4 look at operation. */
export function flintMat4LookAt(eye: FlintVec3, target: FlintVec3, up: FlintVec3): FlintMat4 {
  const zAxis = flintVec3Normalize(flintVec3Sub(eye, target));
  const xAxis = flintVec3Normalize(flintVec3Cross(up, zAxis));
  const yAxis = flintVec3Normalize(flintVec3Cross(zAxis, xAxis));

  return createFlintMat4(
    { x: xAxis.x, y: yAxis.x, z: zAxis.x, w: 0 },
    { x: xAxis.y, y: yAxis.y, z: zAxis.y, w: 0 },
    { x: xAxis.z, y: yAxis.z, z: zAxis.z, w: 0 },
    {
      x: -flintVec3Dot(xAxis, eye),
      y: -flintVec3Dot(yAxis, eye),
      z: -flintVec3Dot(zAxis, eye),
      w: 1,
    },
  );
}

/** Perform mat 4 perspective operation. */
export function flintMat4Perspective(fovYRad: number, aspect: number, zNear: number, zFar: number): FlintMat4 {
  const focalLength = 1 / Math.tan(fovYRad * 0.5);
  const rangeInv = 1 / (zNear - zFar);

  return createFlintMat4(
    { x: focalLength / aspect, y: 0, z: 0, w: 0 },
    { x: 0, y: focalLength, z: 0, w: 0 },
    { x: 0, y: 0, z: (zFar + zNear) * rangeInv, w: -1 },
    { x: 0, y: 0, z: 2 * zFar * zNear * rangeInv, w: 0 },
  );
}

/** Perform mat 4 orthographic operation. */
export function flintMat4Orthographic(
  left: number,
  right: number,
  bottom: number,
  top: number,
  zNear: number,
  zFar: number,
): FlintMat4 {
  const lr = 1 / (left - right);
  const bt = 1 / (bottom - top);
  const nf = 1 / (zNear - zFar);

  return createFlintMat4(
    { x: -2 * lr, y: 0, z: 0, w: 0 },
    { x: 0, y: -2 * bt, z: 0, w: 0 },
    { x: 0, y: 0, z: 2 * nf, w: 0 },
    {
      x: (left + right) * lr,
      y: (top + bottom) * bt,
      z: (zFar + zNear) * nf,
      w: 1,
    },
  );
}

// ==========================================
// 4. Quaternions (Quat)
// ==========================================

/** Quat representation. */
export interface FlintQuat {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

/** Perform create flint quat operation. */
export function createFlintQuat(coordX = 0, coordY = 0, coordZ = 0, coordW = 1): FlintQuat {
  return { x: coordX, y: coordY, z: coordZ, w: coordW };
}

/** Perform quat identity operation. */
export function flintQuatIdentity(): FlintQuat {
  return { x: 0, y: 0, z: 0, w: 1 };
}

/** Perform quat from axis angle operation. */
export function flintQuatFromAxisAngle(axis: FlintVec3, angleRad: number): FlintQuat {
  if (flintVec3LengthSq(axis) <= FLINT_MATH_EPSILON) {
    return flintQuatIdentity();
  }
  const norm = flintVec3Normalize(axis);
  const halfAngle = angleRad * 0.5;
  const sin = Math.sin(halfAngle);
  return {
    x: norm.x * sin,
    y: norm.y * sin,
    z: norm.z * sin,
    w: Math.cos(halfAngle),
  };
}

/** Perform quat from euler operation. */
export function flintQuatFromEuler(pitchX: number, yawY: number, rollZ: number): FlintQuat {
  const halfPitch = pitchX * 0.5;
  const halfYaw = yawY * 0.5;
  const halfRoll = rollZ * 0.5;

  const cp = Math.cos(halfPitch);
  const sp = Math.sin(halfPitch);
  const cy = Math.cos(halfYaw);
  const sy = Math.sin(halfYaw);
  const cr = Math.cos(halfRoll);
  const sr = Math.sin(halfRoll);

  return {
    x: sp * cy * cr - cp * sy * sr,
    y: cp * sy * cr + sp * cy * sr,
    z: cp * cy * sr - sp * sy * cr,
    w: cp * cy * cr + sp * sy * sr,
  };
}

/** Perform quat mul operation. */
export function flintQuatMul(first: FlintQuat, second: FlintQuat): FlintQuat {
  return {
    x: first.w * second.x + first.x * second.w + first.y * second.z - first.z * second.y,
    y: first.w * second.y - first.x * second.z + first.y * second.w + first.z * second.x,
    z: first.w * second.z + first.x * second.y - first.y * second.x + first.z * second.w,
    w: first.w * second.w - first.x * second.x - first.y * second.y - first.z * second.z,
  };
}

/** Perform quat conjugate operation. */
export function flintQuatConjugate(quaternion: FlintQuat): FlintQuat {
  return { x: -quaternion.x, y: -quaternion.y, z: -quaternion.z, w: quaternion.w };
}

/** Perform quat norm sq operation. */
export function flintQuatNormSq(quaternion: FlintQuat): number {
  return (
    quaternion.x * quaternion.x +
    quaternion.y * quaternion.y +
    quaternion.z * quaternion.z +
    quaternion.w * quaternion.w
  );
}

/** Perform quat norm operation. */
export function flintQuatNorm(quaternion: FlintQuat): number {
  return Math.hypot(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
}

/** Perform quat normalize operation. */
export function flintQuatNormalize(quaternion: FlintQuat): FlintQuat {
  const normSq = flintQuatNormSq(quaternion);
  if (normSq <= FLINT_MATH_EPSILON) {
    return flintQuatIdentity();
  }
  const invNorm = 1 / Math.sqrt(normSq);
  return {
    x: quaternion.x * invNorm,
    y: quaternion.y * invNorm,
    z: quaternion.z * invNorm,
    w: quaternion.w * invNorm,
  };
}

/** Perform quat inverse operation. */
export function flintQuatInverse(quaternion: FlintQuat): FlintOption<FlintQuat> {
  const normSq = flintQuatNormSq(quaternion);
  if (normSq <= FLINT_MATH_EPSILON) {
    return flintNone();
  }
  const invNormSq = 1 / normSq;
  return flintSome({
    x: -quaternion.x * invNormSq,
    y: -quaternion.y * invNormSq,
    z: -quaternion.z * invNormSq,
    w: quaternion.w * invNormSq,
  });
}

/** Perform quat rotate vec 3 operation. */
export function flintQuatRotateVec3(quaternion: FlintQuat, vector: FlintVec3): FlintVec3 {
  const qv = { x: quaternion.x, y: quaternion.y, z: quaternion.z };
  const uv = flintVec3Cross(qv, vector);
  const uuv = flintVec3Cross(qv, uv);
  const uvW = flintVec3Scale(uv, quaternion.w * 2);
  const uuv2 = flintVec3Scale(uuv, 2);
  return flintVec3Add(vector, flintVec3Add(uvW, uuv2));
}

/** Perform quat to mat 4 operation. */
export function flintQuatToMat4(quaternion: FlintQuat): FlintMat4 {
  const x2 = quaternion.x + quaternion.x;
  const y2 = quaternion.y + quaternion.y;
  const z2 = quaternion.z + quaternion.z;
  const xx = quaternion.x * x2;
  const xy = quaternion.x * y2;
  const xz = quaternion.x * z2;
  const yy = quaternion.y * y2;
  const yz = quaternion.y * z2;
  const zz = quaternion.z * z2;
  const wx = quaternion.w * x2;
  const wy = quaternion.w * y2;
  const wz = quaternion.w * z2;

  return createFlintMat4(
    { x: 1 - (yy + zz), y: xy + wz, z: xz - wy, w: 0 },
    { x: xy - wz, y: 1 - (xx + zz), z: yz + wx, w: 0 },
    { x: xz + wy, y: yz - wx, z: 1 - (xx + yy), w: 0 },
    { x: 0, y: 0, z: 0, w: 1 },
  );
}

/** Perform quat to mat 3 operation. */
export function flintQuatToMat3(quaternion: FlintQuat): FlintMat3 {
  const x2 = quaternion.x + quaternion.x;
  const y2 = quaternion.y + quaternion.y;
  const z2 = quaternion.z + quaternion.z;
  const xx = quaternion.x * x2;
  const xy = quaternion.x * y2;
  const xz = quaternion.x * z2;
  const yy = quaternion.y * y2;
  const yz = quaternion.y * z2;
  const zz = quaternion.z * z2;
  const wx = quaternion.w * x2;
  const wy = quaternion.w * y2;
  const wz = quaternion.w * z2;

  return createFlintMat3(
    { x: 1 - (yy + zz), y: xy + wz, z: xz - wy },
    { x: xy - wz, y: 1 - (xx + zz), z: yz + wx },
    { x: xz + wy, y: yz - wx, z: 1 - (xx + yy) },
  );
}

/** Perform quat slerp operation. */
export function flintQuatSlerp(first: FlintQuat, second: FlintQuat, factor: number): FlintQuat {
  let cosHalfTheta = first.x * second.x + first.y * second.y + first.z * second.z + first.w * second.w;
  let targetSecond = second;

  if (cosHalfTheta < 0) {
    targetSecond = { x: -second.x, y: -second.y, z: -second.z, w: -second.w };
    cosHalfTheta = -cosHalfTheta;
  }

  if (cosHalfTheta >= 1 - FLINT_MATH_EPSILON) {
    return flintQuatNormalize({
      x: flintLerp(first.x, targetSecond.x, factor),
      y: flintLerp(first.y, targetSecond.y, factor),
      z: flintLerp(first.z, targetSecond.z, factor),
      w: flintLerp(first.w, targetSecond.w, factor),
    });
  }

  const halfTheta = Math.acos(cosHalfTheta);
  const sinHalfTheta = Math.sin(halfTheta);
  const ratioA = Math.sin((1 - factor) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(factor * halfTheta) / sinHalfTheta;

  return {
    x: first.x * ratioA + targetSecond.x * ratioB,
    y: first.y * ratioA + targetSecond.y * ratioB,
    z: first.z * ratioA + targetSecond.z * ratioB,
    w: first.w * ratioA + targetSecond.w * ratioB,
  };
}

/** Perform quat dot operation. */
export function flintQuatDot(first: FlintQuat, second: FlintQuat): number {
  return first.x * second.x + first.y * second.y + first.z * second.z + first.w * second.w;
}

import { flintNone, flintSome, type FlintOption } from './collections.js';

/**
 * Standard mathematical constants for Flint runtime.
 */
export const FLINT_MATH_PI = 3.141_592_653_589_793;
/** 2 * PI (tau) circle constant. */
export const FLINT_MATH_TAU = 6.283_185_307_179_586;
/** Euler constant (e). */
export const FLINT_MATH_E = 2.718_281_828_459_045;
/** Square root of 2 constant. */
export const FLINT_MATH_SQRT2 = 1.414_213_562_373_095_1;
/** Euler constant (e). */
export const FLINT_MATH_EPSILON = 1e-15;
/** Machine epsilon for 32-bit floating point operations. */
export const FLINT_MATH_F32_EPSILON = 1e-7;
/** Conversion factor from degrees to radians. */
export const FLINT_MATH_DEG_TO_RAD = 0.017_453_292_519_943_295;
/** Conversion factor from radians to degrees. */
export const FLINT_MATH_RAD_TO_DEG = 57.295_779_513_082_32;

// ==========================================
// 1. Basic & Advanced Scalar Math
// ==========================================

/** Clamp a numeric value between minimum and maximum bounds. */
export function flintClamp(value: number, minimum: number, maximum: number): number {
  if (minimum > maximum) {
    return Math.min(Math.max(value, maximum), minimum);
  }
  return Math.min(Math.max(value, minimum), maximum);
}

/** Linearly interpolate between start and end by factor. */
export function flintLerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/** Step function returning 0 if x < edge, 1 otherwise. */
export function flintStep(edge: number, value: number): number {
  return value < edge ? 0 : 1;
}

/** Smooth Hermite interpolation between edge0 and edge1. */
export function flintSmoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }
  const factor = flintClamp((value - edge0) / (edge1 - edge0), 0, 1);
  return factor * factor * (3 - 2 * factor);
}

/** Compute the largest integer less than or equal to x. */
export function flintFloor(value: number): number {
  return Math.floor(value);
}

/** Compute the smallest integer greater than or equal to x. */
export function flintCeil(value: number): number {
  return Math.ceil(value);
}

/** Compute fractional part: x - floor(x). */
export function flintFract(value: number): number {
  return value - Math.floor(value);
}

/** Return sign of x (1, -1, 0, or NaN). */
export function flintSign(value: number): number {
  if (value === 0 || Number.isNaN(value)) {
    return value;
  }
  return value > 0 ? 1 : -1;
}

/** Convert degrees to radians. */
export function flintRadians(degrees: number): number {
  return degrees * FLINT_MATH_DEG_TO_RAD;
}

/** Convert radians to degrees. */
export function flintDegrees(radians: number): number {
  return radians * FLINT_MATH_RAD_TO_DEG;
}

/** Test approximate equality within specified epsilon. */
export function flintApproxEqual(first: number, second: number, epsilon = FLINT_MATH_EPSILON): boolean {
  if (first === second) {
    return true;
  }
  const difference = Math.abs(first - second);
  return difference <= epsilon || difference <= Math.max(Math.abs(first), Math.abs(second)) * epsilon;
}

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
export function flintVec3Slerp(a: FlintVec3, b: FlintVec3, t: number): FlintVec3 {
  const normA = flintVec3Normalize(a);
  const normB = flintVec3Normalize(b);
  const dot = flintClamp(flintVec3Dot(normA, normB), -1, 1);
  if (Math.abs(dot) > 0.9995) {
    return flintVec3Normalize(flintVec3Lerp(normA, normB, t));
  }
  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);
  const factorA = Math.sin((1 - t) * theta) / sinTheta;
  const factorB = Math.sin(t * theta) / sinTheta;
  const slerpedNorm = flintVec3Add(flintVec3Scale(normA, factorA), flintVec3Scale(normB, factorB));
  const lengthA = flintVec3Length(a);
  const lengthB = flintVec3Length(b);
  const length = flintLerp(lengthA, lengthB, t);
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

/** Perform create flint mat 2 operation. */
export function createFlintMat2(column0OrElements?: FlintVec2 | readonly number[], column1?: FlintVec2): FlintMat2 {
  if (Array.isArray(column0OrElements)) {
    const element = column0OrElements;
    const col0 = { x: element[0] ?? 0, y: element[1] ?? 0 };
    const col1 = { x: element[2] ?? 0, y: element[3] ?? 0 };
    return {
      c0: col0,
      c1: col1,
      elements: [col0.x, col0.y, col1.x, col1.y],
    };
  }
  let col0: FlintVec2 = { x: 0, y: 0 };
  if (column0OrElements && typeof column0OrElements === 'object' && 'x' in column0OrElements) {
    col0 = column0OrElements;
  }
  const col1 = column1 ?? { x: 0, y: 0 };
  return {
    c0: col0,
    c1: col1,
    elements: [col0.x, col0.y, col1.x, col1.y],
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

/** Perform create flint mat 3 operation. */
export function createFlintMat3(
  column0OrElements?: FlintVec3 | readonly number[],
  column1?: FlintVec3,
  column2?: FlintVec3,
): FlintMat3 {
  if (Array.isArray(column0OrElements)) {
    const element = column0OrElements;
    const col0 = { x: element[0] ?? 0, y: element[1] ?? 0, z: element[2] ?? 0 };
    const col1 = { x: element[3] ?? 0, y: element[4] ?? 0, z: element[5] ?? 0 };
    const col2 = { x: element[6] ?? 0, y: element[7] ?? 0, z: element[8] ?? 0 };
    return {
      c0: col0,
      c1: col1,
      c2: col2,
      elements: [col0.x, col0.y, col0.z, col1.x, col1.y, col1.z, col2.x, col2.y, col2.z],
    };
  }
  let col0: FlintVec3 = { x: 0, y: 0, z: 0 };
  if (column0OrElements && typeof column0OrElements === 'object' && 'x' in column0OrElements) {
    col0 = column0OrElements;
  }
  const col1 = column1 ?? { x: 0, y: 0, z: 0 };
  const col2 = column2 ?? { x: 0, y: 0, z: 0 };
  return {
    c0: col0,
    c1: col1,
    c2: col2,
    elements: [col0.x, col0.y, col0.z, col1.x, col1.y, col1.z, col2.x, col2.y, col2.z],
  };
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

/** Perform create flint mat 4 operation. */
export function createFlintMat4(
  column0OrElements?: FlintVec4 | readonly number[],
  column1?: FlintVec4,
  column2?: FlintVec4,
  column3?: FlintVec4,
): FlintMat4 {
  if (Array.isArray(column0OrElements)) {
    const element = column0OrElements;
    const col0 = { x: element[0] ?? 0, y: element[1] ?? 0, z: element[2] ?? 0, w: element[3] ?? 0 };
    const col1 = { x: element[4] ?? 0, y: element[5] ?? 0, z: element[6] ?? 0, w: element[7] ?? 0 };
    const col2 = { x: element[8] ?? 0, y: element[9] ?? 0, z: element[10] ?? 0, w: element[11] ?? 0 };
    const col3 = { x: element[12] ?? 0, y: element[13] ?? 0, z: element[14] ?? 0, w: element[15] ?? 0 };
    return {
      c0: col0,
      c1: col1,
      c2: col2,
      c3: col3,
      elements: [
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
      ],
    };
  }
  let col0: FlintVec4 = { x: 0, y: 0, z: 0, w: 0 };
  if (column0OrElements && typeof column0OrElements === 'object' && 'x' in column0OrElements) {
    col0 = column0OrElements;
  }
  const col1 = column1 ?? { x: 0, y: 0, z: 0, w: 0 };
  const col2 = column2 ?? { x: 0, y: 0, z: 0, w: 0 };
  const col3 = column3 ?? { x: 0, y: 0, z: 0, w: 0 };
  return {
    c0: col0,
    c1: col1,
    c2: col2,
    c3: col3,
    elements: [
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
    ],
  };
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
export function flintMat4TransformPoint3(m: FlintMat4, p: FlintVec3): FlintVec3 {
  const v4 = flintMat4TransformVec4(m, { x: p.x, y: p.y, z: p.z, w: 1 });
  const invW = Math.abs(v4.w) <= FLINT_MATH_EPSILON ? 1 : 1 / v4.w;
  return { x: v4.x * invW, y: v4.y * invW, z: v4.z * invW };
}

/** Perform mat 4 transform vector 3 operation. */
export function flintMat4TransformVector3(m: FlintMat4, v: FlintVec3): FlintVec3 {
  const v4 = flintMat4TransformVec4(m, { x: v.x, y: v.y, z: v.z, w: 0 });
  return { x: v4.x, y: v4.y, z: v4.z };
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
export function flintMat4Inverse(m: FlintMat4): FlintOption<FlintMat4> {
  const a00 = m.c0.x;
  const a01 = m.c0.y;
  const a02 = m.c0.z;
  const a03 = m.c0.w;
  const a10 = m.c1.x;
  const a11 = m.c1.y;
  const a12 = m.c1.z;
  const a13 = m.c1.w;
  const a20 = m.c2.x;
  const a21 = m.c2.y;
  const a22 = m.c2.z;
  const a23 = m.c2.w;
  const a30 = m.c3.x;
  const a31 = m.c3.y;
  const a32 = m.c3.z;
  const a33 = m.c3.w;

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

// ==========================================
// 5. Geometry, Spatial Acceleration & Frustum
// ==========================================

/** Ray 2 representation. */
export interface FlintRay2 {
  readonly origin: FlintVec2;
  readonly direction: FlintVec2;
}

/** Ray 3 representation. */
export interface FlintRay3 {
  readonly origin: FlintVec3;
  readonly direction: FlintVec3;
}

/** Segment 2 representation. */
export interface FlintSegment2 {
  readonly start: FlintVec2;
  readonly end: FlintVec2;
}

/** Segment 3 representation. */
export interface FlintSegment3 {
  readonly start: FlintVec3;
  readonly end: FlintVec3;
}

/** Plane 3 representation. */
export interface FlintPlane3 {
  readonly normal: FlintVec3;
  readonly distance: number;
}

/** A A B B 2 representation. */
export interface FlintAABB2 {
  readonly min: FlintVec2;
  readonly max: FlintVec2;
}

/** A A B B 3 representation. */
export interface FlintAABB3 {
  readonly min: FlintVec3;
  readonly max: FlintVec3;
}

/** Frustum representation. */
export interface FlintFrustum {
  readonly left: FlintPlane3;
  readonly right: FlintPlane3;
  readonly bottom: FlintPlane3;
  readonly top: FlintPlane3;
  readonly near: FlintPlane3;
  readonly far: FlintPlane3;
}

/** O B B 2 representation. */
export interface FlintOBB2 {
  readonly center: FlintVec2;
  readonly halfExtents: FlintVec2;
  readonly half_extents?: FlintVec2;
  readonly angleRad: number;
  readonly angle_rad?: number;
}

/** O B B 3 representation. */
export interface FlintOBB3 {
  readonly center: FlintVec3;
  readonly halfExtents: FlintVec3;
  readonly half_extents?: FlintVec3;
  readonly orientation: FlintQuat;
}

/** Circle representation. */
export interface FlintCircle {
  readonly center: FlintVec2;
  readonly radius: number;
}

/** Sphere representation. */
export interface FlintSphere {
  readonly center: FlintVec3;
  readonly radius: number;
}

/** Triangle 2 representation. */
export interface FlintTriangle2 {
  readonly a: FlintVec2;
  readonly b: FlintVec2;
  readonly c: FlintVec2;
}

/** Triangle 3 representation. */
export interface FlintTriangle3 {
  readonly a: FlintVec3;
  readonly b: FlintVec3;
  readonly c: FlintVec3;
}

/** Ray Hit 3 representation. */
export interface FlintRayHit3 {
  readonly hit: boolean;
  readonly t: number;
  readonly point: FlintVec3;
  readonly normal: FlintVec3;
  readonly primitiveId: number;
  readonly primitive_id?: number;
}

/** B V H Node 3 representation. */
export interface FlintBVHNode3 {
  readonly bounds: FlintAABB3;
  readonly leftChild: number;
  readonly left_child?: number;
  readonly rightChild: number;
  readonly right_child?: number;
  readonly primitiveIndex: number;
  readonly primitive_index?: number;
}

/** B V H Tree 3 representation. */
export interface FlintBVHTree3 {
  readonly nodes: readonly FlintBVHNode3[];
  readonly rootIndex: number;
  readonly root_index?: number;
}

/** Perform create flint ray hit 3 operation. */
export function createFlintRayHit3(
  hit: boolean,
  t: number,
  point: FlintVec3,
  normal: FlintVec3,
  primitiveId: number,
): FlintRayHit3 {
  return { hit, t, point, normal, primitiveId, primitive_id: primitiveId };
}

/** Perform create flint b v h node 3 operation. */
export function createFlintBVHNode3(
  bounds: FlintAABB3,
  leftChild: number,
  rightChild: number,
  primitiveIndex: number,
): FlintBVHNode3 {
  return {
    bounds,
    leftChild,
    left_child: leftChild,
    rightChild,
    right_child: rightChild,
    primitiveIndex,
    primitive_index: primitiveIndex,
  };
}

/** Perform create flint b v h tree 3 operation. */
export function createFlintBVHTree3(nodes: readonly FlintBVHNode3[], rootIndex = 0): FlintBVHTree3 {
  return { nodes: [...nodes], rootIndex, root_index: rootIndex };
}

/** Perform create flint ray 2 operation. */
export function createFlintRay2(origin: FlintVec2, direction: FlintVec2): FlintRay2 {
  return { origin, direction: flintVec2Normalize(direction) };
}

/** Perform create flint ray 3 operation. */
export function createFlintRay3(origin: FlintVec3, direction: FlintVec3): FlintRay3 {
  return { origin, direction: flintVec3Normalize(direction) };
}

/** Perform create flint segment 2 operation. */
export function createFlintSegment2(startPoint: FlintVec2, endPoint: FlintVec2): FlintSegment2 {
  return { start: startPoint, end: endPoint };
}

/** Perform create flint segment 3 operation. */
export function createFlintSegment3(startPoint: FlintVec3, endPoint: FlintVec3): FlintSegment3 {
  return { start: startPoint, end: endPoint };
}

/** Perform create flint plane 3 operation. */
export function createFlintPlane3(normal: FlintVec3, distance: number): FlintPlane3 {
  return { normal: flintVec3Normalize(normal), distance };
}

/** Perform create flint a a b b 2 operation. */
export function createFlintAABB2(minPoint: FlintVec2, maxPoint: FlintVec2): FlintAABB2 {
  return {
    min: { x: Math.min(minPoint.x, maxPoint.x), y: Math.min(minPoint.y, maxPoint.y) },
    max: { x: Math.max(minPoint.x, maxPoint.x), y: Math.max(minPoint.y, maxPoint.y) },
  };
}

/** Perform create flint a a b b 3 operation. */
export function createFlintAABB3(minPoint: FlintVec3, maxPoint: FlintVec3): FlintAABB3 {
  return {
    min: {
      x: Math.min(minPoint.x, maxPoint.x),
      y: Math.min(minPoint.y, maxPoint.y),
      z: Math.min(minPoint.z, maxPoint.z),
    },
    max: {
      x: Math.max(minPoint.x, maxPoint.x),
      y: Math.max(minPoint.y, maxPoint.y),
      z: Math.max(minPoint.z, maxPoint.z),
    },
  };
}

/** Perform create flint o b b 2 operation. */
export function createFlintOBB2(center: FlintVec2, halfExtents: FlintVec2, angleRad = 0): FlintOBB2 {
  return { center, halfExtents, half_extents: halfExtents, angleRad, angle_rad: angleRad };
}

/** Perform create flint o b b 3 operation. */
export function createFlintOBB3(
  center: FlintVec3,
  halfExtents: FlintVec3,
  orientation: FlintQuat = flintQuatIdentity(),
): FlintOBB3 {
  return { center, halfExtents, half_extents: halfExtents, orientation };
}

/** Perform create flint circle operation. */
export function createFlintCircle(center: FlintVec2, radius: number): FlintCircle {
  return { center, radius: Math.max(0, radius) };
}

/** Perform create flint sphere operation. */
export function createFlintSphere(center: FlintVec3, radius: number): FlintSphere {
  return { center, radius: Math.max(0, radius) };
}

/** Perform create flint triangle 2 operation. */
export function createFlintTriangle2(pointA: FlintVec2, pointB: FlintVec2, pointC: FlintVec2): FlintTriangle2 {
  return { a: pointA, b: pointB, c: pointC };
}

/** Perform create flint triangle 3 operation. */
export function createFlintTriangle3(pointA: FlintVec3, pointB: FlintVec3, pointC: FlintVec3): FlintTriangle3 {
  return { a: pointA, b: pointB, c: pointC };
}

/** Perform a a b b 2 contains point operation. */
export function flintAABB2ContainsPoint(box: FlintAABB2, point: FlintVec2): boolean {
  return point.x >= box.min.x && point.x <= box.max.x && point.y >= box.min.y && point.y <= box.max.y;
}

/** Perform a a b b 2 intersects a a b b 2 operation. */
export function flintAABB2IntersectsAABB2(first: FlintAABB2, second: FlintAABB2): boolean {
  return (
    first.min.x <= second.max.x &&
    first.max.x >= second.min.x &&
    first.min.y <= second.max.y &&
    first.max.y >= second.min.y
  );
}

/** Perform a a b b 2 union operation. */
export function flintAABB2Union(first: FlintAABB2, second: FlintAABB2): FlintAABB2 {
  return {
    min: { x: Math.min(first.min.x, second.min.x), y: Math.min(first.min.y, second.min.y) },
    max: { x: Math.max(first.max.x, second.max.x), y: Math.max(first.max.y, second.max.y) },
  };
}

/** Perform a a b b 2 area operation. */
export function flintAABB2Area(box: FlintAABB2): number {
  const boxWidth = box.max.x - box.min.x;
  const boxHeight = box.max.y - box.min.y;
  return boxWidth > 0 && boxHeight > 0 ? boxWidth * boxHeight : 0;
}

/** Perform circle contains point operation. */
export function flintCircleContainsPoint(circle: FlintCircle, point: FlintVec2): boolean {
  return flintVec2DistanceSquared(circle.center, point) <= circle.radius * circle.radius;
}

/** Perform circle intersects circle operation. */
export function flintCircleIntersectsCircle(first: FlintCircle, second: FlintCircle): boolean {
  const totalRadius = first.radius + second.radius;
  return flintVec2DistanceSquared(first.center, second.center) <= totalRadius * totalRadius;
}

/** Perform triangle 2 area operation. */
export function flintTriangle2Area(triangle: FlintTriangle2): number {
  return (
    Math.abs(
      triangle.a.x * (triangle.b.y - triangle.c.y) +
        triangle.b.x * (triangle.c.y - triangle.a.y) +
        triangle.c.x * (triangle.a.y - triangle.b.y),
    ) * 0.5
  );
}

/** Perform a a b b 3 contains point operation. */
export function flintAABB3ContainsPoint(box: FlintAABB3, point: FlintVec3): boolean {
  return (
    point.x >= box.min.x &&
    point.x <= box.max.x &&
    point.y >= box.min.y &&
    point.y <= box.max.y &&
    point.z >= box.min.z &&
    point.z <= box.max.z
  );
}

/** Perform a a b b 3 intersects a a b b 3 operation. */
export function flintAABB3IntersectsAABB3(first: FlintAABB3, second: FlintAABB3): boolean {
  return (
    first.min.x <= second.max.x &&
    first.max.x >= second.min.x &&
    first.min.y <= second.max.y &&
    first.max.y >= second.min.y &&
    first.min.z <= second.max.z &&
    first.max.z >= second.min.z
  );
}

/** Perform a a b b 3 volume operation. */
export function flintAABB3Volume(box: FlintAABB3): number {
  const dx = box.max.x - box.min.x;
  const dy = box.max.y - box.min.y;
  const dz = box.max.z - box.min.z;
  return dx > 0 && dy > 0 && dz > 0 ? dx * dy * dz : 0;
}

/** Perform sphere contains point operation. */
export function flintSphereContainsPoint(sphere: FlintSphere, point: FlintVec3): boolean {
  return flintVec3DistanceSquared(sphere.center, point) <= sphere.radius * sphere.radius;
}

/** Perform sphere intersects sphere operation. */
export function flintSphereIntersectsSphere(first: FlintSphere, second: FlintSphere): boolean {
  const totalRadius = first.radius + second.radius;
  return flintVec3DistanceSquared(first.center, second.center) <= totalRadius * totalRadius;
}

/** Perform plane 3 distance to point operation. */
export function flintPlane3DistanceToPoint(plane: FlintPlane3, point: FlintVec3): number {
  return flintVec3Dot(plane.normal, point) + plane.distance;
}

/** Perform triangle 3 normal operation. */
export function flintTriangle3Normal(triangle: FlintTriangle3): FlintVec3 {
  const ab = flintVec3Sub(triangle.b, triangle.a);
  const ac = flintVec3Sub(triangle.c, triangle.a);
  return flintVec3Normalize(flintVec3Cross(ab, ac));
}

/** Perform frustum from view proj operation. */
export function flintFrustumFromViewProj(viewProj: FlintMat4): FlintFrustum {
  const matrixElements = [
    viewProj.c0.x,
    viewProj.c0.y,
    viewProj.c0.z,
    viewProj.c0.w,
    viewProj.c1.x,
    viewProj.c1.y,
    viewProj.c1.z,
    viewProj.c1.w,
    viewProj.c2.x,
    viewProj.c2.y,
    viewProj.c2.z,
    viewProj.c2.w,
    viewProj.c3.x,
    viewProj.c3.y,
    viewProj.c3.z,
    viewProj.c3.w,
  ];
  // Left: row 3 + row 0
  const leftNormal = flintVec3Normalize({
    x: matrixElements[3] + matrixElements[0],
    y: matrixElements[7] + matrixElements[4],
    z: matrixElements[11] + matrixElements[8],
  });
  const leftDistribution =
    (matrixElements[15] + matrixElements[12]) /
    (flintVec3Length({
      x: matrixElements[3] + matrixElements[0],
      y: matrixElements[7] + matrixElements[4],
      z: matrixElements[11] + matrixElements[8],
    }) || 1);

  // Right: row 3 - row 0
  const rightNormal = flintVec3Normalize({
    x: matrixElements[3] - matrixElements[0],
    y: matrixElements[7] - matrixElements[4],
    z: matrixElements[11] - matrixElements[8],
  });
  const rightDistribution =
    (matrixElements[15] - matrixElements[12]) /
    (flintVec3Length({
      x: matrixElements[3] - matrixElements[0],
      y: matrixElements[7] - matrixElements[4],
      z: matrixElements[11] - matrixElements[8],
    }) || 1);

  // Bottom: row 3 + row 1
  const bottomNormal = flintVec3Normalize({
    x: matrixElements[3] + matrixElements[1],
    y: matrixElements[7] + matrixElements[5],
    z: matrixElements[11] + matrixElements[9],
  });
  const bottomDistribution =
    (matrixElements[15] + matrixElements[13]) /
    (flintVec3Length({
      x: matrixElements[3] + matrixElements[1],
      y: matrixElements[7] + matrixElements[5],
      z: matrixElements[11] + matrixElements[9],
    }) || 1);

  // Top: row 3 - row 1
  const topNormal = flintVec3Normalize({
    x: matrixElements[3] - matrixElements[1],
    y: matrixElements[7] - matrixElements[5],
    z: matrixElements[11] - matrixElements[9],
  });
  const topDistribution =
    (matrixElements[15] - matrixElements[13]) /
    (flintVec3Length({
      x: matrixElements[3] - matrixElements[1],
      y: matrixElements[7] - matrixElements[5],
      z: matrixElements[11] - matrixElements[9],
    }) || 1);

  // Near: row 3 + row 2
  const nearNormal = flintVec3Normalize({
    x: matrixElements[3] + matrixElements[2],
    y: matrixElements[7] + matrixElements[6],
    z: matrixElements[11] + matrixElements[10],
  });
  const nearDistribution =
    (matrixElements[15] + matrixElements[14]) /
    (flintVec3Length({
      x: matrixElements[3] + matrixElements[2],
      y: matrixElements[7] + matrixElements[6],
      z: matrixElements[11] + matrixElements[10],
    }) || 1);

  // Far: row 3 - row 2
  const farNormal = flintVec3Normalize({
    x: matrixElements[3] - matrixElements[2],
    y: matrixElements[7] - matrixElements[6],
    z: matrixElements[11] - matrixElements[10],
  });
  const farDistribution =
    (matrixElements[15] - matrixElements[14]) /
    (flintVec3Length({
      x: matrixElements[3] - matrixElements[2],
      y: matrixElements[7] - matrixElements[6],
      z: matrixElements[11] - matrixElements[10],
    }) || 1);

  return {
    left: { normal: leftNormal, distance: leftDistribution },
    right: { normal: rightNormal, distance: rightDistribution },
    bottom: { normal: bottomNormal, distance: bottomDistribution },
    top: { normal: topNormal, distance: topDistribution },
    near: { normal: nearNormal, distance: nearDistribution },
    far: { normal: farNormal, distance: farDistribution },
  };
}

/** Perform frustum intersects sphere operation. */
export function flintFrustumIntersectsSphere(frustum: FlintFrustum, sphere: FlintSphere): boolean {
  if (flintPlane3DistanceToPoint(frustum.left, sphere.center) < -sphere.radius) {
    return false;
  }
  if (flintPlane3DistanceToPoint(frustum.right, sphere.center) < -sphere.radius) {
    return false;
  }
  if (flintPlane3DistanceToPoint(frustum.bottom, sphere.center) < -sphere.radius) {
    return false;
  }
  if (flintPlane3DistanceToPoint(frustum.top, sphere.center) < -sphere.radius) {
    return false;
  }
  if (flintPlane3DistanceToPoint(frustum.near, sphere.center) < -sphere.radius) {
    return false;
  }
  if (flintPlane3DistanceToPoint(frustum.far, sphere.center) < -sphere.radius) {
    return false;
  }
  return true;
}

/** Perform ray 3 intersects sphere operation. */
export function flintRay3IntersectsSphere(ray: FlintRay3, sphere: FlintSphere): FlintOption<number> {
  const oc = flintVec3Sub(ray.origin, sphere.center);
  const quadA = flintVec3Dot(ray.direction, ray.direction);
  const quadB = 2 * flintVec3Dot(oc, ray.direction);
  const quadC = flintVec3Dot(oc, oc) - sphere.radius * sphere.radius;
  const discriminant = quadB * quadB - 4 * quadA * quadC;

  if (discriminant < 0) {
    return flintNone();
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const t0 = (-quadB - sqrtDisc) / (2 * quadA);
  const t1 = (-quadB + sqrtDisc) / (2 * quadA);

  if (t0 >= 0) {
    return flintSome(t0);
  }
  if (t1 >= 0) {
    return flintSome(t1);
  }
  return flintNone();
}

/** Perform ray 3 intersects a a b b 3 operation. */
export function flintRay3IntersectsAABB3(ray: FlintRay3, box: FlintAABB3): FlintOption<number> {
  let tmin = -Infinity;
  let tmax = Infinity;

  const dims: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];
  for (const axis of dims) {
    const origin = ray.origin[axis];
    const axisDirection = ray.direction[axis];
    const min = box.min[axis];
    const max = box.max[axis];

    if (Math.abs(axisDirection) <= FLINT_MATH_EPSILON) {
      if (origin < min || origin > max) {
        return flintNone();
      }
    } else {
      let t1 = (min - origin) / axisDirection;
      let t2 = (max - origin) / axisDirection;
      if (t1 > t2) {
        const temporary = t1;
        t1 = t2;
        t2 = temporary;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax || tmax < 0) {
        return flintNone();
      }
    }
  }

  return flintSome(tmin >= 0 ? tmin : tmax);
}

/** Perform ray 3 intersects plane 3 operation. */
export function flintRay3IntersectsPlane3(ray: FlintRay3, plane: FlintPlane3): FlintOption<number> {
  const denom = flintVec3Dot(plane.normal, ray.direction);
  if (Math.abs(denom) <= FLINT_MATH_EPSILON) {
    return flintNone();
  }
  const hitT = -(flintVec3Dot(plane.normal, ray.origin) + plane.distance) / denom;
  return hitT >= 0 ? flintSome(hitT) : flintNone();
}

/** Perform ray 3 intersects triangle 3 operation. */
export function flintRay3IntersectsTriangle3(ray: FlintRay3, triangle: FlintTriangle3): FlintOption<number> {
  const edge1 = flintVec3Sub(triangle.b, triangle.a);
  const edge2 = flintVec3Sub(triangle.c, triangle.a);
  const pvec = flintVec3Cross(ray.direction, edge2);
  const det = flintVec3Dot(edge1, pvec);

  if (Math.abs(det) <= FLINT_MATH_EPSILON) {
    return flintNone();
  }
  const invDet = 1 / det;

  const tvec = flintVec3Sub(ray.origin, triangle.a);
  const baryU = flintVec3Dot(tvec, pvec) * invDet;
  if (baryU < 0 || baryU > 1) {
    return flintNone();
  }

  const qvec = flintVec3Cross(tvec, edge1);
  const baryV = flintVec3Dot(ray.direction, qvec) * invDet;
  if (baryV < 0 || baryU + baryV > 1) {
    return flintNone();
  }

  const hitT = flintVec3Dot(edge2, qvec) * invDet;
  return hitT >= 0 ? flintSome(hitT) : flintNone();
}

/** Perform ray 3 intersect o b b operation. */
export function flintRay3IntersectOBB(ray: FlintRay3, obb: FlintOBB3): FlintOption<number> {
  const u0 = flintQuatRotateVec3(obb.orientation, { x: 1, y: 0, z: 0 });
  const u1 = flintQuatRotateVec3(obb.orientation, { x: 0, y: 1, z: 0 });
  const u2 = flintQuatRotateVec3(obb.orientation, { x: 0, y: 0, z: 1 });

  const centerOffset = flintVec3Sub(obb.center, ray.origin);
  const axes = [u0, u1, u2];
  const halfExtension = obb.halfExtents ?? obb.half_extents ?? { x: 0, y: 0, z: 0 };
  const halfExtents = [halfExtension.x, halfExtension.y, halfExtension.z];

  let tmin = -Infinity;
  let tmax = Infinity;

  for (let index = 0; index < 3; index += 1) {
    const axis = axes[index] ?? { x: 0, y: 0, z: 0 };
    const hi = halfExtents[index] ?? 0;
    const centerOffsetDistance = flintVec3Dot(axis, centerOffset);
    const directionDotAxis = flintVec3Dot(axis, ray.direction);

    if (Math.abs(directionDotAxis) > FLINT_MATH_EPSILON) {
      let t1 = (centerOffsetDistance - hi) / directionDotAxis;
      let t2 = (centerOffsetDistance + hi) / directionDotAxis;
      if (t1 > t2) {
        const temporary = t1;
        t1 = t2;
        t2 = temporary;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax || tmax < 0) {
        return flintNone();
      }
    } else if (Math.abs(centerOffsetDistance) > hi) {
      return flintNone();
    }
  }

  const resultT = tmin >= 0 ? tmin : tmax;
  return resultT >= 0 ? flintSome(resultT) : flintNone();
}

/** Internal representation of a bounding primitive during BVH construction. */
interface FlintBVHPrim {
  readonly box: FlintAABB3;
  readonly index: number;
  readonly center: FlintVec3;
}

/** Compute bounding box enclosing an array of BVH primitives. */
function computeBVHBounds(list: readonly FlintBVHPrim[]): FlintAABB3 {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const item of list) {
    if (item.box.min.x < minX) {
      minX = item.box.min.x;
    }
    if (item.box.min.y < minY) {
      minY = item.box.min.y;
    }
    if (item.box.min.z < minZ) {
      minZ = item.box.min.z;
    }
    if (item.box.max.x > maxX) {
      maxX = item.box.max.x;
    }
    if (item.box.max.y > maxY) {
      maxY = item.box.max.y;
    }
    if (item.box.max.z > maxZ) {
      maxZ = item.box.max.z;
    }
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

/** Perform b v h build from a a b bs operation. */
export function flintBVHBuildFromAABBs(boxes: readonly FlintAABB3[]): FlintBVHTree3 {
  if (boxes.length === 0) {
    return { nodes: [], rootIndex: 0 };
  }

  const prims: FlintBVHPrim[] = boxes.map((box, index) => ({
    box,
    index,
    center: {
      x: (box.min.x + box.max.x) * 0.5,
      y: (box.min.y + box.max.y) * 0.5,
      z: (box.min.z + box.max.z) * 0.5,
    },
  }));

  const nodes: FlintBVHNode3[] = [];

  /** Recursively build BVH subtree nodes. */
  function buildSubtree(list: FlintBVHPrim[]): number {
    const bounds = computeBVHBounds(list);

    if (list.length === 1) {
      const nodeIndex = nodes.length;
      nodes.push({
        bounds,
        leftChild: -1,
        rightChild: -1,
        primitiveIndex: list[0]?.index ?? -1,
      });
      return nodeIndex;
    }

    let cminX = Infinity;
    let cminY = Infinity;
    let cminZ = Infinity;
    let cmaxX = -Infinity;
    let cmaxY = -Infinity;
    let cmaxZ = -Infinity;
    for (const item of list) {
      if (item.center.x < cminX) {
        cminX = item.center.x;
      }
      if (item.center.y < cminY) {
        cminY = item.center.y;
      }
      if (item.center.z < cminZ) {
        cminZ = item.center.z;
      }
      if (item.center.x > cmaxX) {
        cmaxX = item.center.x;
      }
      if (item.center.y > cmaxY) {
        cmaxY = item.center.y;
      }
      if (item.center.z > cmaxZ) {
        cmaxZ = item.center.z;
      }
    }

    const extentX = cmaxX - cminX;
    const extentY = cmaxY - cminY;
    const extentZ = cmaxZ - cminZ;

    let axis: 'x' | 'y' | 'z' = 'x';
    if (extentY >= extentX && extentY >= extentZ) {
      axis = 'y';
    } else if (extentZ >= extentX && extentZ >= extentY) {
      axis = 'z';
    }

    list.sort((primA, primB) => primA.center[axis] - primB.center[axis]);
    const mid = Math.floor(list.length / 2);
    const leftList = list.slice(0, mid);
    const rightList = list.slice(mid);

    const currentNodeIndex = nodes.length;
    nodes.push({
      bounds,
      leftChild: -1,
      rightChild: -1,
      primitiveIndex: -1,
    });

    const leftChild = buildSubtree(leftList);
    const rightChild = buildSubtree(rightList);

    nodes[currentNodeIndex] = {
      bounds,
      leftChild,
      rightChild,
      primitiveIndex: -1,
    };

    return currentNodeIndex;
  }

  const rootIndex = buildSubtree(prims);
  return { nodes, rootIndex };
}

/** Perform b v h ray intersect operation. */
export function flintBVHRayIntersect(tree: FlintBVHTree3, ray: FlintRay3): FlintOption<FlintRayHit3> {
  if (tree.nodes.length === 0) {
    return flintNone();
  }

  let closestT = Infinity;
  let closestPrim = -1;
  let closestPoint: FlintVec3 = { x: 0, y: 0, z: 0 };
  let closestNormal: FlintVec3 = { x: 0, y: 0, z: 0 };

  const rootIndex = tree.rootIndex ?? tree.root_index ?? 0;
  const stack: number[] = [rootIndex];

  while (stack.length > 0) {
    const nodeIndex = stack.pop();
    if (nodeIndex === undefined) {
      continue;
    }
    const node = tree.nodes[nodeIndex];
    if (!node) {
      continue;
    }

    const bounds = node.bounds;
    let tmin = -Infinity;
    let tmax = Infinity;
    let intersectsBox = true;

    const dims: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];
    for (const axis of dims) {
      const origin = ray.origin[axis];
      const direction = ray.direction[axis];
      const minValue = bounds.min[axis];
      const maxValue = bounds.max[axis];

      if (Math.abs(direction) <= FLINT_MATH_EPSILON) {
        if (origin < minValue || origin > maxValue) {
          intersectsBox = false;
          break;
        }
      } else {
        let t1 = (minValue - origin) / direction;
        let t2 = (maxValue - origin) / direction;
        if (t1 > t2) {
          const temporary = t1;
          t1 = t2;
          t2 = temporary;
        }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax || tmax < 0) {
          intersectsBox = false;
          break;
        }
      }
    }

    if (!intersectsBox) {
      continue;
    }

    const entryDistribution = Math.max(0, tmin);
    if (entryDistribution >= closestT) {
      continue;
    }

    const primitiveIndex = node.primitiveIndex ?? node.primitive_index ?? -1;
    if (primitiveIndex >= 0) {
      const hitT = entryDistribution;
      if (hitT < closestT) {
        closestT = hitT;
        closestPrim = primitiveIndex;
        const pt = flintVec3Add(ray.origin, flintVec3Scale(ray.direction, closestT));
        closestPoint = pt;

        const eps = 1e-5;
        if (Math.abs(pt.x - bounds.min.x) < eps) {
          closestNormal = { x: -1, y: 0, z: 0 };
        } else if (Math.abs(pt.x - bounds.max.x) < eps) {
          closestNormal = { x: 1, y: 0, z: 0 };
        } else if (Math.abs(pt.y - bounds.min.y) < eps) {
          closestNormal = { x: 0, y: -1, z: 0 };
        } else if (Math.abs(pt.y - bounds.max.y) < eps) {
          closestNormal = { x: 0, y: 1, z: 0 };
        } else if (Math.abs(pt.z - bounds.min.z) < eps) {
          closestNormal = { x: 0, y: 0, z: -1 };
        } else if (Math.abs(pt.z - bounds.max.z) < eps) {
          closestNormal = { x: 0, y: 0, z: 1 };
        } else {
          closestNormal = flintVec3Scale(ray.direction, -1);
        }
      }
    } else {
      const rightChild = node.rightChild ?? node.right_child ?? -1;
      const leftChild = node.leftChild ?? node.left_child ?? -1;
      if (rightChild >= 0) {
        stack.push(rightChild);
      }
      if (leftChild >= 0) {
        stack.push(leftChild);
      }
    }
  }

  if (closestPrim >= 0) {
    return flintSome({
      hit: true,
      t: closestT,
      point: closestPoint,
      normal: closestNormal,
      primitiveId: closestPrim,
      primitive_id: closestPrim,
    });
  }

  return flintNone();
}

// ==========================================
// 6. Splines & Curve Interpolation
// ==========================================

/** Perform bezier 2 quadratic operation. */
export function flintBezier2Quadratic(
  point0: FlintVec2,
  point1: FlintVec2,
  point2: FlintVec2,
  factor: number,
): FlintVec2 {
  const oneMinusT = 1 - factor;
  const tt = factor * factor;
  const uu = oneMinusT * oneMinusT;
  const u2t = 2 * oneMinusT * factor;
  return {
    x: uu * point0.x + u2t * point1.x + tt * point2.x,
    y: uu * point0.y + u2t * point1.y + tt * point2.y,
  };
}

/** Perform bezier 2 cubic operation. */
export function flintBezier2Cubic(
  point0: FlintVec2,
  point1: FlintVec2,
  point2: FlintVec2,
  point3: FlintVec2,
  factor: number,
): FlintVec2 {
  const oneMinusT = 1 - factor;
  const tt = factor * factor;
  const uu = oneMinusT * oneMinusT;
  const uuu = uu * oneMinusT;
  const ttt = tt * factor;
  return {
    x: uuu * point0.x + 3 * uu * factor * point1.x + 3 * oneMinusT * tt * point2.x + ttt * point3.x,
    y: uuu * point0.y + 3 * uu * factor * point1.y + 3 * oneMinusT * tt * point2.y + ttt * point3.y,
  };
}

/** Perform bezier 3 cubic operation. */
export function flintBezier3Cubic(
  point0: FlintVec3,
  point1: FlintVec3,
  point2: FlintVec3,
  point3: FlintVec3,
  factor: number,
): FlintVec3 {
  const oneMinusT = 1 - factor;
  const tt = factor * factor;
  const uu = oneMinusT * oneMinusT;
  const uuu = uu * oneMinusT;
  const ttt = tt * factor;
  return {
    x: uuu * point0.x + 3 * uu * factor * point1.x + 3 * oneMinusT * tt * point2.x + ttt * point3.x,
    y: uuu * point0.y + 3 * uu * factor * point1.y + 3 * oneMinusT * tt * point2.y + ttt * point3.y,
    z: uuu * point0.z + 3 * uu * factor * point1.z + 3 * oneMinusT * tt * point2.z + ttt * point3.z,
  };
}

/** Perform catmull rom 2 operation. */
export function flintCatmullRom2(
  point0: FlintVec2,
  point1: FlintVec2,
  point2: FlintVec2,
  point3: FlintVec2,
  factor: number,
): FlintVec2 {
  const t2 = factor * factor;
  const t3 = t2 * factor;
  const f0 = -0.5 * t3 + t2 - 0.5 * factor;
  const f1 = 1.5 * t3 - 2.5 * t2 + 1;
  const f2 = -1.5 * t3 + 2 * t2 + 0.5 * factor;
  const f3 = 0.5 * t3 - 0.5 * t2;
  return {
    x: point0.x * f0 + point1.x * f1 + point2.x * f2 + point3.x * f3,
    y: point0.y * f0 + point1.y * f1 + point2.y * f2 + point3.y * f3,
  };
}

/** Perform catmull rom 3 operation. */
export function flintCatmullRom3(
  point0: FlintVec3,
  point1: FlintVec3,
  point2: FlintVec3,
  point3: FlintVec3,
  factor: number,
): FlintVec3 {
  const t2 = factor * factor;
  const t3 = t2 * factor;
  const f0 = -0.5 * t3 + t2 - 0.5 * factor;
  const f1 = 1.5 * t3 - 2.5 * t2 + 1;
  const f2 = -1.5 * t3 + 2 * t2 + 0.5 * factor;
  const f3 = 0.5 * t3 - 0.5 * t2;
  return {
    x: point0.x * f0 + point1.x * f1 + point2.x * f2 + point3.x * f3,
    y: point0.y * f0 + point1.y * f1 + point2.y * f2 + point3.y * f3,
    z: point0.z * f0 + point1.z * f1 + point2.z * f2 + point3.z * f3,
  };
}

// ==========================================
// 7. Colorimetry & Perceptual Color Spaces
// ==========================================

/** Color Rgba representation. */
export interface FlintColorRgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/** Color Hsv representation. */
export interface FlintColorHsv {
  readonly h: number;
  readonly s: number;
  readonly v: number;
  readonly a: number;
}

/** Color Oklab representation. */
export interface FlintColorOklab {
  readonly l: number;
  readonly a: number;
  readonly b: number;
  readonly alpha: number;
}

/** Perform create flint color rgba operation. */
export function createFlintColorRgba(red = 0, green = 0, blue = 0, alpha = 1): FlintColorRgba {
  return {
    r: flintClamp(red, 0, 1),
    g: flintClamp(green, 0, 1),
    b: flintClamp(blue, 0, 1),
    a: flintClamp(alpha, 0, 1),
  };
}

/** Convert a single sRGB color channel component to linear space. */
function srgbToLinearChannel(channel: number): number {
  return channel <= 0.040_45 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** Convert a single linear color channel component to sRGB space. */
function linearToSrgbChannel(channel: number): number {
  return channel <= 0.003_130_8 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
}

/** Perform color srgb to linear operation. */
export function flintColorSrgbToLinear(color: FlintColorRgba): FlintColorRgba {
  return {
    r: srgbToLinearChannel(color.r),
    g: srgbToLinearChannel(color.g),
    b: srgbToLinearChannel(color.b),
    a: color.a,
  };
}

/** Perform color linear to srgb operation. */
export function flintColorLinearToSrgb(color: FlintColorRgba): FlintColorRgba {
  return {
    r: linearToSrgbChannel(color.r),
    g: linearToSrgbChannel(color.g),
    b: linearToSrgbChannel(color.b),
    a: color.a,
  };
}

/** Perform color rgb to hsv operation. */
export function flintColorRgbToHsv(color: FlintColorRgba): FlintColorHsv {
  const max = Math.max(color.r, color.g, color.b);
  const min = Math.min(color.r, color.g, color.b);
  const diff = max - min;
  let hue = 0;
  const saturation = max === 0 ? 0 : diff / max;
  const value = max;

  if (diff > 0) {
    if (max === color.r) {
      hue = (color.g - color.b) / diff + (color.g < color.b ? 6 : 0);
    } else if (max === color.g) {
      hue = (color.b - color.r) / diff + 2;
    } else {
      hue = (color.r - color.g) / diff + 4;
    }
    hue *= 60;
  }

  return { h: hue, s: saturation, v: value, a: color.a };
}

/** Perform color hsv to rgb operation. */
export function flintColorHsvToRgb(hsv: FlintColorHsv): FlintColorRgba {
  const hue = ((hsv.h % 360) + 360) % 360;
  const saturation = flintClamp(hsv.s, 0, 1);
  const value = flintClamp(hsv.v, 0, 1);

  const chroma = value * saturation;
  const intermediateX = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const matchValue = value - chroma;

  let rawR = 0;
  let rawG = 0;
  let rawB = 0;
  if (hue < 60) {
    rawR = chroma;
    rawG = intermediateX;
  } else if (hue < 120) {
    rawR = intermediateX;
    rawG = chroma;
  } else if (hue < 180) {
    rawG = chroma;
    rawB = intermediateX;
  } else if (hue < 240) {
    rawG = intermediateX;
    rawB = chroma;
  } else if (hue < 300) {
    rawR = intermediateX;
    rawB = chroma;
  } else {
    rawR = chroma;
    rawB = intermediateX;
  }

  return createFlintColorRgba(rawR + matchValue, rawG + matchValue, rawB + matchValue, hsv.a);
}

/** Perform color srgb to oklab operation. */
export function flintColorSrgbToOklab(color: FlintColorRgba): FlintColorOklab {
  const lin = flintColorSrgbToLinear(color);
  const coneL = 0.412_221_470_8 * lin.r + 0.536_332_536_3 * lin.g + 0.051_445_992_9 * lin.b;
  const coneM = 0.211_903_498_2 * lin.r + 0.680_699_545_1 * lin.g + 0.107_396_956_6 * lin.b;
  const coneS = 0.088_302_461_9 * lin.r + 0.281_718_837_6 * lin.g + 0.629_978_700_5 * lin.b;

  const cubeRootL = Math.cbrt(coneL);
  const cubeRootM = Math.cbrt(coneM);
  const cubeRootS = Math.cbrt(coneS);

  return {
    l: 0.210_454_255_3 * cubeRootL + 0.793_617_785 * cubeRootM - 0.004_072_046_8 * cubeRootS,
    a: 1.977_998_495_1 * cubeRootL - 2.428_592_205 * cubeRootM + 0.450_593_709_9 * cubeRootS,
    b: 0.025_904_037_1 * cubeRootL + 0.782_771_766_2 * cubeRootM - 0.808_675_766 * cubeRootS,
    alpha: color.a,
  };
}

/** Perform color oklab to srgb operation. */
export function flintColorOklabToSrgb(lab: FlintColorOklab): FlintColorRgba {
  const cubeRootL = lab.l + 0.396_337_777_4 * lab.a + 0.215_803_757_3 * lab.b;
  const cubeRootM = lab.l - 0.105_561_345_8 * lab.a - 0.063_854_172_8 * lab.b;
  const cubeRootS = lab.l - 0.089_484_177_5 * lab.a - 1.291_485_548 * lab.b;

  const linearL = cubeRootL * cubeRootL * cubeRootL;
  const linearM = cubeRootM * cubeRootM * cubeRootM;
  const linearS = cubeRootS * cubeRootS * cubeRootS;

  const rLin = +4.076_741_662_1 * linearL - 3.307_711_591_3 * linearM + 0.230_969_929_2 * linearS;
  const gLin = -1.268_438_004_6 * linearL + 2.609_757_401_1 * linearM - 0.341_319_396_5 * linearS;
  const bLin = -0.004_196_086_3 * linearL - 0.703_418_614_7 * linearM + 1.707_614_701 * linearS;

  return createFlintColorRgba(
    linearToSrgbChannel(rLin),
    linearToSrgbChannel(gLin),
    linearToSrgbChannel(bLin),
    lab.alpha,
  );
}

/** Perform color lerp oklab operation. */
export function flintColorLerpOklab(first: FlintColorRgba, second: FlintColorRgba, factor: number): FlintColorRgba {
  const lab1 = flintColorSrgbToOklab(first);
  const lab2 = flintColorSrgbToOklab(second);
  const mixedLab: FlintColorOklab = {
    l: flintLerp(lab1.l, lab2.l, factor),
    a: flintLerp(lab1.a, lab2.a, factor),
    b: flintLerp(lab1.b, lab2.b, factor),
    alpha: flintLerp(lab1.alpha, lab2.alpha, factor),
  };
  return flintColorOklabToSrgb(mixedLab);
}

// ==========================================
// 8. General Linear Algebra & Dynamic Matrix
// ==========================================

/** D Matrix representation. */
export interface FlintDMatrix {
  readonly rows: number;
  readonly cols: number;
  readonly data: number[];
}

/** L U Decomposition representation. */
export interface FlintLUDecomposition {
  readonly lu: FlintDMatrix;
  readonly pivot: readonly number[];
  readonly parity: number;
}

/** Q R Decomposition representation. */
export interface FlintQRDecomposition {
  readonly q: FlintDMatrix;
  readonly r: FlintDMatrix;
}

/** Cholesky Decomposition representation. */
export interface FlintCholeskyDecomposition {
  readonly l: FlintDMatrix;
}

/** S V D Decomposition representation. */
export interface FlintSVDDecomposition {
  readonly u: FlintDMatrix;
  readonly s: readonly number[];
  readonly vt: FlintDMatrix;
}

/** Eigen Decomposition representation. */
export interface FlintEigenDecomposition {
  readonly values: readonly number[];
  readonly vectors: FlintDMatrix;
}

/** Perform create flint d matrix operation. */
export function createFlintDMatrix(rows: number, cols: number, data?: readonly number[]): FlintDMatrix {
  const expectedLength = rows * cols;
  const buffer = new Float64Array(expectedLength);
  if (data) {
    const length = Math.min(data.length, expectedLength);
    for (let index = 0; index < length; index += 1) {
      buffer[index] = data[index] ?? 0;
    }
  }
  return {
    rows,
    cols,
    data: [...buffer],
  };
}

/** Perform d matrix zeros operation. */
export function flintDMatrixZeros(rows: number, cols: number): FlintDMatrix {
  return createFlintDMatrix(rows, cols);
}

/** Perform d matrix identity operation. */
export function flintDMatrixIdentity(size: number): FlintDMatrix {
  const mat = flintDMatrixZeros(size, size);
  const data = [...mat.data];
  for (let index = 0; index < size; index += 1) {
    data[index * size + index] = 1;
  }
  return { rows: size, cols: size, data };
}

/** Perform d matrix get operation. */
export function flintDMatrixGet(matrix: FlintDMatrix, row: number, col: number): FlintOption<number> {
  if (
    row < 0 ||
    row >= matrix.rows ||
    col < 0 ||
    col >= matrix.cols ||
    !Number.isInteger(row) ||
    !Number.isInteger(col)
  ) {
    return flintNone();
  }
  return flintSome(matrix.data[row * matrix.cols + col] ?? 0);
}

/** Perform d matrix set operation. */
export function flintDMatrixSet(matrix: FlintDMatrix, row: number, col: number, value: number): boolean {
  if (
    row < 0 ||
    row >= matrix.rows ||
    col < 0 ||
    col >= matrix.cols ||
    !Number.isInteger(row) ||
    !Number.isInteger(col)
  ) {
    return false;
  }
  matrix.data[row * matrix.cols + col] = value;
  return true;
}

/** Perform d matrix add inplace operation. */
export function flintDMatrixAddInplace(matrixA: FlintDMatrix, matrixB: FlintDMatrix): boolean {
  if (matrixA.rows !== matrixB.rows || matrixA.cols !== matrixB.cols) {
    return false;
  }
  const total = matrixA.rows * matrixA.cols;
  const aData = matrixA.data;
  const bData = matrixB.data;
  for (let index = 0; index < total; index += 1) {
    aData[index] = (aData[index] ?? 0) + (bData[index] ?? 0);
  }
  return true;
}

/** Perform d matrix sub inplace operation. */
export function flintDMatrixSubInplace(matrixA: FlintDMatrix, matrixB: FlintDMatrix): boolean {
  if (matrixA.rows !== matrixB.rows || matrixA.cols !== matrixB.cols) {
    return false;
  }
  const total = matrixA.rows * matrixA.cols;
  const aData = matrixA.data;
  const bData = matrixB.data;
  for (let index = 0; index < total; index += 1) {
    aData[index] = (aData[index] ?? 0) - (bData[index] ?? 0);
  }
  return true;
}

/** Perform d matrix scale inplace operation. */
export function flintDMatrixScaleInplace(matrix: FlintDMatrix, factor: number): void {
  const total = matrix.rows * matrix.cols;
  const mData = matrix.data;
  for (let index = 0; index < total; index += 1) {
    mData[index] = (mData[index] ?? 0) * factor;
  }
}

/** Perform d matrix mul accumulate operation. */
export function flintDMatrixMulAccumulate(
  outMatrix: FlintDMatrix,
  matrixA: FlintDMatrix,
  matrixB: FlintDMatrix,
  alpha = 1,
): boolean {
  if (outMatrix.rows !== matrixA.rows || outMatrix.cols !== matrixB.cols || matrixA.cols !== matrixB.rows) {
    return false;
  }
  const outData = outMatrix.data;
  for (let row = 0; row < matrixA.rows; row += 1) {
    for (let kIndex = 0; kIndex < matrixA.cols; kIndex += 1) {
      const aValue = matrixA.data[row * matrixA.cols + kIndex] ?? 0;
      if (aValue === 0) {
        continue;
      }
      const scaledA = aValue * alpha;
      for (let col = 0; col < matrixB.cols; col += 1) {
        const bValue = matrixB.data[kIndex * matrixB.cols + col] ?? 0;
        outData[row * outMatrix.cols + col] = (outData[row * outMatrix.cols + col] ?? 0) + scaledA * bValue;
      }
    }
  }
  return true;
}

/** Perform d matrix transpose operation. */
export function flintDMatrixTranspose(matrix: FlintDMatrix): FlintDMatrix {
  const resultData = new Float64Array(matrix.rows * matrix.cols);
  for (let row = 0; row < matrix.rows; row += 1) {
    for (let col = 0; col < matrix.cols; col += 1) {
      resultData[col * matrix.rows + row] = matrix.data[row * matrix.cols + col] ?? 0;
    }
  }
  return { rows: matrix.cols, cols: matrix.rows, data: [...resultData] };
}

/** Perform d matrix mul operation. */
export function flintDMatrixMul(matrixA: FlintDMatrix, matrixB: FlintDMatrix): FlintOption<FlintDMatrix> {
  if (matrixA.cols !== matrixB.rows) {
    return flintNone();
  }
  const result = new Float64Array(matrixA.rows * matrixB.cols);
  for (let row = 0; row < matrixA.rows; row += 1) {
    for (let kIndex = 0; kIndex < matrixA.cols; kIndex += 1) {
      const aValue = matrixA.data[row * matrixA.cols + kIndex] ?? 0;
      if (aValue === 0) {
        continue;
      }
      for (let col = 0; col < matrixB.cols; col += 1) {
        result[row * matrixB.cols + col] =
          (result[row * matrixB.cols + col] ?? 0) + aValue * (matrixB.data[kIndex * matrixB.cols + col] ?? 0);
      }
    }
  }
  return flintSome({ rows: matrixA.rows, cols: matrixB.cols, data: [...result] });
}

/** Perform d matrix l u operation. */
export function flintDMatrixLU(matrix: FlintDMatrix): FlintOption<FlintLUDecomposition> {
  if (matrix.rows !== matrix.cols) {
    return flintNone();
  }
  const n = matrix.rows;
  const lu = [...matrix.data];
  const pivot = Array.from({ length: n }, (_, index) => index);
  let parity = 1;

  for (let index = 0; index < n; index += 1) {
    let maxRow = index;
    let maxValue = Math.abs(lu[index * n + index] ?? 0);

    for (let kIndex = index + 1; kIndex < n; kIndex += 1) {
      const value = Math.abs(lu[kIndex * n + index] ?? 0);
      if (value > maxValue) {
        maxValue = value;
        maxRow = kIndex;
      }
    }

    if (maxValue <= FLINT_MATH_EPSILON) {
      return flintNone();
    }

    if (maxRow !== index) {
      const temporaryP = pivot[index] ?? 0;
      pivot[index] = pivot[maxRow] ?? 0;
      pivot[maxRow] = temporaryP;
      parity = -parity;

      for (let kIndex = 0; kIndex < n; kIndex += 1) {
        const temporary = lu[index * n + kIndex] ?? 0;
        lu[index * n + kIndex] = lu[maxRow * n + kIndex] ?? 0;
        lu[maxRow * n + kIndex] = temporary;
      }
    }

    const diag = lu[index * n + index] ?? 1;
    for (let index_ = index + 1; index_ < n; index_ += 1) {
      lu[index_ * n + index] = (lu[index_ * n + index] ?? 0) / diag;
      const factor = lu[index_ * n + index] ?? 0;
      for (let kIndex = index + 1; kIndex < n; kIndex += 1) {
        lu[index_ * n + kIndex] = (lu[index_ * n + kIndex] ?? 0) - factor * (lu[index * n + kIndex] ?? 0);
      }
    }
  }

  return flintSome({
    lu: { rows: n, cols: n, data: lu },
    pivot,
    parity,
  });
}

/** Perform d matrix q r operation. */
export function flintDMatrixQR(matrix: FlintDMatrix): FlintOption<FlintQRDecomposition> {
  const rows = matrix.rows;
  const cols = matrix.cols;
  if (rows < cols) {
    return flintNone();
  }

  const qData = new Float64Array(rows * cols);
  const rData = new Float64Array(cols * cols);

  for (let index = 0; index < cols; index += 1) {
    for (let index_ = 0; index_ < rows; index_ += 1) {
      qData[index_ * cols + index] = matrix.data[index_ * cols + index] ?? 0;
    }

    for (let kIndex = 0; kIndex < index; kIndex += 1) {
      let dot = 0;
      for (let index_ = 0; index_ < rows; index_ += 1) {
        dot += (qData[index_ * cols + kIndex] ?? 0) * (matrix.data[index_ * cols + index] ?? 0);
      }
      rData[kIndex * cols + index] = dot;
      for (let index_ = 0; index_ < rows; index_ += 1) {
        qData[index_ * cols + index] = (qData[index_ * cols + index] ?? 0) - dot * (qData[index_ * cols + kIndex] ?? 0);
      }
    }

    let normSq = 0;
    for (let index_ = 0; index_ < rows; index_ += 1) {
      const value = qData[index_ * cols + index] ?? 0;
      normSq += value * value;
    }

    const norm = Math.sqrt(normSq);
    if (norm <= FLINT_MATH_EPSILON) {
      return flintNone();
    }

    rData[index * cols + index] = norm;
    const invNorm = 1 / norm;
    for (let index_ = 0; index_ < rows; index_ += 1) {
      qData[index_ * cols + index] = (qData[index_ * cols + index] ?? 0) * invNorm;
    }
  }

  return flintSome({
    q: { rows, cols, data: [...qData] },
    r: { rows: cols, cols, data: [...rData] },
  });
}

/** Perform d matrix cholesky operation. */
export function flintDMatrixCholesky(matrix: FlintDMatrix): FlintOption<FlintCholeskyDecomposition> {
  if (matrix.rows !== matrix.cols) {
    return flintNone();
  }
  const n = matrix.rows;

  for (let row = 0; row < n; row += 1) {
    for (let col = row + 1; col < n; col += 1) {
      const a = matrix.data[row * n + col] ?? 0;
      const b = matrix.data[col * n + row] ?? 0;
      if (Math.abs(a - b) > 1e-7 * Math.max(Math.abs(a), Math.abs(b), 1)) {
        return flintNone(); // Not symmetric
      }
    }
  }

  const l = new Float64Array(n * n);

  for (let index = 0; index < n; index += 1) {
    for (let index_ = 0; index_ <= index; index_ += 1) {
      let sum = 0;
      for (let kIndex = 0; kIndex < index_; kIndex += 1) {
        sum += (l[index * n + kIndex] ?? 0) * (l[index_ * n + kIndex] ?? 0);
      }

      if (index === index_) {
        const value = (matrix.data[index * n + index] ?? 0) - sum;
        if (value <= FLINT_MATH_EPSILON) {
          return flintNone(); // Not positive definite
        }
        l[index * n + index_] = Math.sqrt(value);
      } else {
        const diag = l[index_ * n + index_] ?? 1;
        if (diag <= FLINT_MATH_EPSILON) {
          return flintNone();
        }
        l[index * n + index_] = ((matrix.data[index * n + index_] ?? 0) - sum) / diag;
      }
    }
  }

  return flintSome({
    l: { rows: n, cols: n, data: [...l] },
  });
}

/** Perform d matrix cholesky solve operation. */
export function flintDMatrixCholeskySolve(
  chol: FlintCholeskyDecomposition,
  rhsVector: FlintDMatrix,
): FlintOption<FlintDMatrix> {
  const n = chol.l.rows;
  if (rhsVector.rows !== n) {
    return flintNone();
  }

  const l = chol.l.data;
  const bCols = rhsVector.cols;
  const y = new Float64Array(n * bCols);
  const x = new Float64Array(n * bCols);

  // Forward substitution L * y = b
  for (let index = 0; index < n; index += 1) {
    const diag = l[index * n + index] ?? 1;
    if (Math.abs(diag) <= FLINT_MATH_EPSILON) {
      return flintNone();
    }
    for (let col = 0; col < bCols; col += 1) {
      let sum = 0;
      for (let kIndex = 0; kIndex < index; kIndex += 1) {
        sum += (l[index * n + kIndex] ?? 0) * (y[kIndex * bCols + col] ?? 0);
      }
      y[index * bCols + col] = ((rhsVector.data[index * bCols + col] ?? 0) - sum) / diag;
    }
  }

  // Back substitution L^T * x = y
  for (let index = n - 1; index >= 0; index -= 1) {
    const diag = l[index * n + index] ?? 1;
    for (let col = 0; col < bCols; col += 1) {
      let sum = 0;
      for (let kIndex = index + 1; kIndex < n; kIndex += 1) {
        sum += (l[kIndex * n + index] ?? 0) * (x[kIndex * bCols + col] ?? 0);
      }
      x[index * bCols + col] = ((y[index * bCols + col] ?? 0) - sum) / diag;
    }
  }

  return flintSome({ rows: n, cols: bCols, data: [...x] });
}

/** Perform d matrix solve operation. */
export function flintDMatrixSolve(matrixA: FlintDMatrix, rhsVector: FlintDMatrix): FlintOption<FlintDMatrix> {
  if (matrixA.rows !== matrixA.cols || rhsVector.rows !== matrixA.rows) {
    return flintNone();
  }
  const luOpt = flintDMatrixLU(matrixA);
  if (luOpt.kind === 'none' || luOpt.value === undefined) {
    return flintNone();
  }
  const { lu, pivot } = luOpt.value;
  const n = matrixA.rows;
  const bCols = rhsVector.cols;

  const x = new Float64Array(n * bCols);
  for (let col = 0; col < bCols; col += 1) {
    for (let index = 0; index < n; index += 1) {
      x[index * bCols + col] = rhsVector.data[(pivot[index] ?? index) * bCols + col] ?? 0;
      for (let kIndex = 0; kIndex < index; kIndex += 1) {
        x[index * bCols + col] =
          (x[index * bCols + col] ?? 0) - (lu.data[index * n + kIndex] ?? 0) * (x[kIndex * bCols + col] ?? 0);
      }
    }

    for (let index = n - 1; index >= 0; index -= 1) {
      for (let kIndex = index + 1; kIndex < n; kIndex += 1) {
        x[index * bCols + col] =
          (x[index * bCols + col] ?? 0) - (lu.data[index * n + kIndex] ?? 0) * (x[kIndex * bCols + col] ?? 0);
      }
      x[index * bCols + col] = (x[index * bCols + col] ?? 0) / (lu.data[index * n + index] ?? 1);
    }
  }

  return flintSome({ rows: n, cols: bCols, data: [...x] });
}

/** Perform d matrix determinant operation. */
export function flintDMatrixDeterminant(matrix: FlintDMatrix): FlintOption<number> {
  if (matrix.rows !== matrix.cols) {
    return flintNone();
  }
  const luOpt = flintDMatrixLU(matrix);
  if (luOpt.kind === 'none' || luOpt.value === undefined) {
    return flintSome(0);
  }
  const { lu, parity } = luOpt.value;
  let det = parity;
  for (let index = 0; index < matrix.rows; index += 1) {
    det *= lu.data[index * matrix.rows + index] ?? 1;
  }
  return flintSome(det);
}

/** Perform d matrix inverse operation. */
export function flintDMatrixInverse(matrix: FlintDMatrix): FlintOption<FlintDMatrix> {
  if (matrix.rows !== matrix.cols) {
    return flintNone();
  }
  const identity = flintDMatrixIdentity(matrix.rows);
  return flintDMatrixSolve(matrix, identity);
}

/** Perform d matrix eigen symmetric operation. */
export function flintDMatrixEigenSymmetric(
  matrix: FlintDMatrix,
  maxIterations = 100,
  epsilon = FLINT_MATH_EPSILON,
): FlintOption<FlintEigenDecomposition> {
  if (matrix.rows !== matrix.cols || matrix.rows === 0) {
    return flintNone();
  }
  const n = matrix.rows;

  // Verify symmetry
  for (let row = 0; row < n; row += 1) {
    for (let col = row + 1; col < n; col += 1) {
      const a = matrix.data[row * n + col] ?? 0;
      const b = matrix.data[col * n + row] ?? 0;
      if (Math.abs(a - b) > 1e-7 * Math.max(Math.abs(a), Math.abs(b), 1)) {
        return flintNone(); // Not symmetric
      }
    }
  }

  // Copy matrix data
  const a = new Float64Array(matrix.data);
  const v = new Float64Array(n * n);
  for (let index = 0; index < n; index += 1) {
    v[index * n + index] = 1;
  }

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let offDiagNormSq = 0;
    for (let pivotP = 0; pivotP < n; pivotP += 1) {
      for (let pivotQ = pivotP + 1; pivotQ < n; pivotQ += 1) {
        const value = a[pivotP * n + pivotQ] ?? 0;
        offDiagNormSq += value * value;
      }
    }

    if (Math.sqrt(offDiagNormSq) <= epsilon) {
      break;
    }

    for (let pivotP = 0; pivotP < n; pivotP += 1) {
      for (let pivotQ = pivotP + 1; pivotQ < n; pivotQ += 1) {
        const apq = a[pivotP * n + pivotQ] ?? 0;
        if (Math.abs(apq) <= epsilon) {
          continue;
        }

        const app = a[pivotP * n + pivotP] ?? 0;
        const aqq = a[pivotQ * n + pivotQ] ?? 0;
        const thetaValue = (aqq - app) / (2 * apq);
        const tanValue = (thetaValue >= 0 ? 1 : -1) / (Math.abs(thetaValue) + Math.sqrt(1 + thetaValue * thetaValue));
        const cosValue = 1 / Math.sqrt(1 + tanValue * tanValue);
        const sinValue = tanValue * cosValue;
        const tauValue = sinValue / (1 + cosValue);

        a[pivotP * n + pivotP] = app - tanValue * apq;
        a[pivotQ * n + pivotQ] = aqq + tanValue * apq;
        a[pivotP * n + pivotQ] = 0;
        a[pivotQ * n + pivotP] = 0;

        for (let kIndex = 0; kIndex < n; kIndex += 1) {
          if (kIndex !== pivotP && kIndex !== pivotQ) {
            const akp = a[kIndex * n + pivotP] ?? 0;
            const akq = a[kIndex * n + pivotQ] ?? 0;
            const nextAkp = akp - sinValue * (akq + tauValue * akp);
            const nextAkq = akq + sinValue * (akp - tauValue * akq);
            a[kIndex * n + pivotP] = nextAkp;
            a[pivotP * n + kIndex] = nextAkp;
            a[kIndex * n + pivotQ] = nextAkq;
            a[pivotQ * n + kIndex] = nextAkq;
          }
        }

        for (let kIndex = 0; kIndex < n; kIndex += 1) {
          const vkp = v[kIndex * n + pivotP] ?? 0;
          const vkq = v[kIndex * n + pivotQ] ?? 0;
          v[kIndex * n + pivotP] = cosValue * vkp - sinValue * vkq;
          v[kIndex * n + pivotQ] = sinValue * vkp + cosValue * vkq;
        }
      }
    }
  }

  // Extract eigenvalues
  const eigenPairs: Array<{ val: number; vector: number[] }> = [];
  for (let col = 0; col < n; col += 1) {
    const value = a[col * n + col] ?? 0;
    const vector = Array.from({ length: n }, (_, row) => v[row * n + col] ?? 0);
    eigenPairs.push({ val: value, vector });
  }

  // Sort by eigenvalue descending
  eigenPairs.sort((pairA, pairB) => pairB.val - pairA.val);

  const values = eigenPairs.map((pair) => pair.val);
  const sortedV = new Float64Array(n * n);
  for (let col = 0; col < n; col += 1) {
    const vec = eigenPairs[col]?.vector ?? [];
    for (let row = 0; row < n; row += 1) {
      sortedV[row * n + col] = vec[row] ?? 0;
    }
  }

  return flintSome({
    values,
    vectors: { rows: n, cols: n, data: [...sortedV] },
  });
}

/** Perform d matrix s v d operation. */
export function flintDMatrixSVD(
  matrix: FlintDMatrix,
  maxIterations = 100,
  epsilon = FLINT_MATH_EPSILON,
): FlintOption<FlintSVDDecomposition> {
  if (matrix.rows === 0 || matrix.cols === 0) {
    return flintNone();
  }

  if (matrix.rows < matrix.cols) {
    const transposed = flintDMatrixTranspose(matrix);
    const svdOpt = flintDMatrixSVD(transposed, maxIterations, epsilon);
    if (svdOpt.kind === 'none' || svdOpt.value === undefined) {
      return flintNone();
    }
    const { u: uTrans, s, vt: vtTrans } = svdOpt.value;
    const uMat = flintDMatrixTranspose(vtTrans);
    const vtMat = flintDMatrixTranspose(uTrans);
    return flintSome({ u: uMat, s, vt: vtMat });
  }

  const rows = matrix.rows;
  const cols = matrix.cols;
  const b = new Float64Array(matrix.data);
  const v = new Float64Array(cols * cols);
  for (let index = 0; index < cols; index += 1) {
    v[index * cols + index] = 1;
  }

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let converged = true;

    for (let index = 0; index < cols; index += 1) {
      for (let kIndex = index + 1; kIndex < cols; kIndex += 1) {
        let alpha = 0;
        let beta = 0;
        let gamma = 0;

        for (let index_ = 0; index_ < rows; index_ += 1) {
          const bj = b[index_ * cols + index] ?? 0;
          const bk = b[index_ * cols + kIndex] ?? 0;
          alpha += bj * bj;
          beta += bk * bk;
          gamma += bj * bk;
        }

        const denom = Math.sqrt(alpha * beta);
        if (denom > epsilon && Math.abs(gamma) / denom > epsilon) {
          converged = false;

          const zeta = (beta - alpha) / (2 * gamma);
          const tanValue = (zeta >= 0 ? 1 : -1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
          const cosValue = 1 / Math.sqrt(1 + tanValue * tanValue);
          const sinValue = tanValue * cosValue;

          for (let index_ = 0; index_ < rows; index_ += 1) {
            const bj = b[index_ * cols + index] ?? 0;
            const bk = b[index_ * cols + kIndex] ?? 0;
            b[index_ * cols + index] = cosValue * bj - sinValue * bk;
            b[index_ * cols + kIndex] = sinValue * bj + cosValue * bk;
          }

          for (let index_ = 0; index_ < cols; index_ += 1) {
            const vj = v[index_ * cols + index] ?? 0;
            const vk = v[index_ * cols + kIndex] ?? 0;
            v[index_ * cols + index] = cosValue * vj - sinValue * vk;
            v[index_ * cols + kIndex] = sinValue * vj + cosValue * vk;
          }
        }
      }
    }

    if (converged) {
      break;
    }
  }

  // Singular values are Euclidean norms of columns of B
  const sVals = new Float64Array(cols);
  const u = new Float64Array(rows * rows);

  for (let index = 0; index < cols; index += 1) {
    let normSq = 0;
    for (let index_ = 0; index_ < rows; index_ += 1) {
      const value = b[index_ * cols + index] ?? 0;
      normSq += value * value;
    }
    const sigma = Math.sqrt(normSq);
    sVals[index] = sigma;

    if (sigma > epsilon) {
      const invSigma = 1 / sigma;
      for (let index_ = 0; index_ < rows; index_ += 1) {
        u[index_ * rows + index] = (b[index_ * cols + index] ?? 0) * invSigma;
      }
    }
  }

  // Complete U to full orthonormal m x m basis using Gram-Schmidt
  for (let index = 0; index < rows; index += 1) {
    let colNormSq = 0;
    for (let index_ = 0; index_ < rows; index_ += 1) {
      const value = u[index_ * rows + index] ?? 0;
      colNormSq += value * value;
    }

    if (colNormSq < 0.5) {
      for (let basisIndex = 0; basisIndex < rows; basisIndex += 1) {
        const vec = new Float64Array(rows);
        vec[basisIndex] = 1;

        for (let other = 0; other < rows; other += 1) {
          if (other === index) {
            continue;
          }
          let otherNormSq = 0;
          for (let index_ = 0; index_ < rows; index_ += 1) {
            const value = u[index_ * rows + other] ?? 0;
            otherNormSq += value * value;
          }
          if (otherNormSq >= 0.5) {
            let dot = 0;
            for (let index_ = 0; index_ < rows; index_ += 1) {
              dot += (u[index_ * rows + other] ?? 0) * (vec[index_] ?? 0);
            }
            for (let index_ = 0; index_ < rows; index_ += 1) {
              vec[index_] = (vec[index_] ?? 0) - dot * (u[index_ * rows + other] ?? 0);
            }
          }
        }

        let normSq = 0;
        for (let index_ = 0; index_ < rows; index_ += 1) {
          const value = vec[index_] ?? 0;
          normSq += value * value;
        }

        if (normSq > 1e-4) {
          const norm = Math.sqrt(normSq);
          for (let index_ = 0; index_ < rows; index_ += 1) {
            u[index_ * rows + index] = (vec[index_] ?? 0) / norm;
          }
          break;
        }
      }
    }
  }

  interface Triplet {
    s: number;
    uCol: number[];
    vCol: number[];
  }

  const triplets: Triplet[] = [];
  for (let index = 0; index < cols; index += 1) {
    const s = sVals[index] ?? 0;
    const uCol = Array.from({ length: rows }, (_, index_) => u[index_ * rows + index] ?? 0);
    const vCol = Array.from({ length: cols }, (_, index_) => v[index_ * cols + index] ?? 0);
    triplets.push({ s, uCol, vCol });
  }

  triplets.sort((tripA, tripB) => tripB.s - tripA.s);

  const sortedS = triplets.map((item) => item.s);
  for (let index = 0; index < cols; index += 1) {
    const uCol = triplets[index]?.uCol ?? [];
    for (let index_ = 0; index_ < rows; index_ += 1) {
      u[index_ * rows + index] = uCol[index_] ?? 0;
    }
  }

  const vt = new Float64Array(cols * cols);
  for (let index = 0; index < cols; index += 1) {
    const vCol = triplets[index]?.vCol ?? [];
    for (let index_ = 0; index_ < cols; index_ += 1) {
      vt[index * cols + index_] = vCol[index_] ?? 0;
    }
  }

  return flintSome({
    u: { rows, cols: rows, data: [...u] },
    s: sortedS,
    vt: { rows: cols, cols, data: [...vt] },
  });
}

/** Perform d matrix pseudoinverse operation. */
export function flintDMatrixPseudoinverse(
  matrix: FlintDMatrix,
  epsilon = FLINT_MATH_EPSILON,
): FlintOption<FlintDMatrix> {
  const svdOpt = flintDMatrixSVD(matrix, 100, epsilon);
  if (svdOpt.kind === 'none' || svdOpt.value === undefined) {
    return flintNone();
  }
  const { u, s, vt } = svdOpt.value;

  const rows = matrix.cols;
  const cols = matrix.rows;
  const kLength = s.length;
  const result = new Float64Array(rows * cols);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let sum = 0;
      for (let kIndex = 0; kIndex < kLength; kIndex += 1) {
        const singularValue = s[kIndex] ?? 0;
        if (singularValue > epsilon) {
          const invS = 1 / singularValue;
          const vValue = vt.data[kIndex * rows + row] ?? 0;
          const uValue = u.data[col * cols + kIndex] ?? 0;
          sum += vValue * invS * uValue;
        }
      }
      result[row * cols + col] = sum;
    }
  }

  return flintSome({ rows, cols, data: [...result] });
}

// ==========================================
// 9. N-Dimensional Arrays / Tensors
// ==========================================

/** Tensor Shape representation. */
export interface FlintTensorShape {
  readonly rank: number;
  readonly dimensions: readonly number[];
  readonly strides: readonly number[];
}

/** Tensor representation. */
export interface FlintTensor<TValue extends object | number | string | boolean | symbol | bigint> {
  readonly shape: FlintTensorShape;
  readonly data: TValue[];
}

/** Perform create flint tensor shape operation. */
export function createFlintTensorShape(dimensions: readonly number[]): FlintTensorShape {
  const rank = dimensions.length;
  const strides = Array.from<number>({ length: rank }).fill(1);
  let stride = 1;
  for (let index = rank - 1; index >= 0; index -= 1) {
    strides[index] = stride;
    stride *= dimensions[index] ?? 1;
  }
  return { rank, dimensions: [...dimensions], strides };
}

/** Perform tensor shape size operation. */
export function flintTensorShapeSize(shape: FlintTensorShape): number {
  return shape.dimensions.reduce((accumulator, dim) => accumulator * dim, 1);
}

/** Perform create flint tensor operation. */
export function createFlintTensor<TValue extends object | number | string | boolean | symbol | bigint>(
  shape: FlintTensorShape,
  data: readonly TValue[],
): FlintTensor<TValue> {
  return { shape, data: [...data] };
}

/** Perform tensor fill operation. */
export function flintTensorFill<TValue extends object | number | string | boolean | symbol | bigint>(
  shape: FlintTensorShape,
  value: TValue,
): FlintTensor<TValue> {
  const size = flintTensorShapeSize(shape);
  const data = Array.from<TValue>({ length: size }).fill(value);
  return { shape, data };
}

/** Perform tensor reshape operation. */
export function flintTensorReshape<TValue extends object | number | string | boolean | symbol | bigint>(
  tensor: FlintTensor<TValue>,
  newShape: FlintTensorShape,
): FlintOption<FlintTensor<TValue>> {
  if (flintTensorShapeSize(tensor.shape) !== flintTensorShapeSize(newShape)) {
    return flintNone();
  }
  return flintSome({ shape: newShape, data: tensor.data });
}

/** Tensor View representation. */
export interface FlintTensorView<TValue extends object | number | string | boolean | symbol | bigint> {
  readonly shape: FlintTensorShape;
  readonly offset: number;
  readonly data: TValue[];
}

/** Perform create flint tensor view operation. */
export function createFlintTensorView<TValue extends object | number | string | boolean | symbol | bigint>(
  shape: FlintTensorShape,
  data: readonly TValue[],
  offset = 0,
): FlintTensorView<TValue> {
  return { shape, offset, data: [...data] };
}

/** Perform tensor view operation. */
export function flintTensorView<TValue extends object | number | string | boolean | symbol | bigint>(
  tensor: FlintTensor<TValue>,
): FlintTensorView<TValue> {
  return { shape: tensor.shape, offset: 0, data: tensor.data };
}

/** Perform tensor slice operation. */
export function flintTensorSlice<TValue extends object | number | string | boolean | symbol | bigint>(
  view: FlintTensorView<TValue>,
  axis: number,
  start: number,
  length: number,
): FlintOption<FlintTensorView<TValue>> {
  if (axis < 0 || axis >= view.shape.rank || !Number.isInteger(axis)) {
    return flintNone();
  }
  const dim = view.shape.dimensions[axis] ?? 0;
  if (start < 0 || length <= 0 || start + length > dim || !Number.isInteger(start) || !Number.isInteger(length)) {
    return flintNone();
  }

  const stride = view.shape.strides[axis] ?? 1;
  const newOffset = view.offset + start * stride;
  const newDimensions = [...view.shape.dimensions];
  newDimensions[axis] = length;

  return flintSome({
    shape: {
      rank: view.shape.rank,
      dimensions: newDimensions,
      strides: [...view.shape.strides],
    },
    offset: newOffset,
    data: view.data,
  });
}

/** Perform tensor view get operation. */
export function flintTensorViewGet<TValue extends object | number | string | boolean | symbol | bigint>(
  view: FlintTensorView<TValue>,
  indices: readonly number[],
): FlintOption<TValue> {
  if (indices.length !== view.shape.rank) {
    return flintNone();
  }

  let flatIndex = view.offset;
  for (let index = 0; index < view.shape.rank; index += 1) {
    const coord = indices[index] ?? 0;
    const dim = view.shape.dimensions[index] ?? 0;
    if (coord < 0 || coord >= dim || !Number.isInteger(coord)) {
      return flintNone();
    }
    flatIndex += coord * (view.shape.strides[index] ?? 1);
  }

  if (flatIndex < 0 || flatIndex >= view.data.length) {
    return flintNone();
  }

  const item = view.data[flatIndex];
  if (item === undefined) {
    return flintNone();
  }
  return flintSome(item);
}

/** Perform tensor view set operation. */
export function flintTensorViewSet<TValue extends object | number | string | boolean | symbol | bigint>(
  view: FlintTensorView<TValue>,
  indices: readonly number[],
  value: TValue,
): boolean {
  if (indices.length !== view.shape.rank) {
    return false;
  }

  let flatIndex = view.offset;
  for (let index = 0; index < view.shape.rank; index += 1) {
    const coord = indices[index] ?? 0;
    const dim = view.shape.dimensions[index] ?? 0;
    if (coord < 0 || coord >= dim || !Number.isInteger(coord)) {
      return false;
    }
    flatIndex += coord * (view.shape.strides[index] ?? 1);
  }

  if (flatIndex < 0 || flatIndex >= view.data.length) {
    return false;
  }

  view.data[flatIndex] = value;
  return true;
}

/** Perform tensor matmul operation. */
export function flintTensorMatmul(
  tensorA: FlintTensor<number>,
  tensorB: FlintTensor<number>,
): FlintOption<FlintTensor<number>> {
  if (tensorA.shape.rank !== 2 || tensorB.shape.rank !== 2) {
    return flintNone();
  }
  const aRows = tensorA.shape.dimensions[0] ?? 0;
  const aCols = tensorA.shape.dimensions[1] ?? 0;
  const bRows = tensorB.shape.dimensions[0] ?? 0;
  const bCols = tensorB.shape.dimensions[1] ?? 0;

  if (aCols !== bRows) {
    return flintNone();
  }

  const dmatA = createFlintDMatrix(aRows, aCols, tensorA.data);
  const dmatB = createFlintDMatrix(bRows, bCols, tensorB.data);
  const resultMatOpt = flintDMatrixMul(dmatA, dmatB);

  if (resultMatOpt.kind === 'none' || resultMatOpt.value === undefined) {
    return flintNone();
  }
  const resultMatrix = resultMatOpt.value;
  const resultShape = createFlintTensorShape([resultMatrix.rows, resultMatrix.cols]);
  return flintSome({ shape: resultShape, data: resultMatrix.data });
}

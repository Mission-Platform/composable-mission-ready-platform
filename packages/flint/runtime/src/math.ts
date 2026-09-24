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
export function flintStep(edge: number, x: number): number {
  return x < edge ? 0 : 1;
}

/** Smooth Hermite interpolation between edge0 and edge1. */
export function flintSmoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) {
    return x < edge0 ? 0 : 1;
  }
  const factor = flintClamp((x - edge0) / (edge1 - edge0), 0, 1);
  return factor * factor * (3 - 2 * factor);
}

/** Compute the largest integer less than or equal to x. */
export function flintFloor(x: number): number {
  return Math.floor(x);
}

/** Compute the smallest integer greater than or equal to x. */
export function flintCeil(x: number): number {
  return Math.ceil(x);
}

/** Compute fractional part: x - floor(x). */
export function flintFract(x: number): number {
  return x - Math.floor(x);
}

/** Return sign of x (1, -1, 0, or NaN). */
export function flintSign(x: number): number {
  if (x === 0 || Number.isNaN(x)) {
    return x;
  }
  return x > 0 ? 1 : -1;
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
export function flintApproxEqual(a: number, b: number, epsilon = FLINT_MATH_EPSILON): boolean {
  if (a === b) {
    return true;
  }
  const difference = Math.abs(a - b);
  return difference <= epsilon || difference <= Math.max(Math.abs(a), Math.abs(b)) * epsilon;
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
export function createFlintVec2(x = 0, y = 0): FlintVec2 {
  return { x, y };
}

/** Perform vec 2 add operation. */
export function flintVec2Add(a: FlintVec2, b: FlintVec2): FlintVec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Perform vec 2 sub operation. */
export function flintVec2Sub(a: FlintVec2, b: FlintVec2): FlintVec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Perform vec 2 mul operation. */
export function flintVec2Mul(a: FlintVec2, b: FlintVec2): FlintVec2 {
  return { x: a.x * b.x, y: a.y * b.y };
}

/** Perform vec 2 scale operation. */
export function flintVec2Scale(v: FlintVec2, scalar: number): FlintVec2 {
  return { x: v.x * scalar, y: v.y * scalar };
}

/** Perform vec 2 div operation. */
export function flintVec2Div(v: FlintVec2, scalar: number): FlintVec2 {
  const inv = 1 / scalar;
  return { x: v.x * inv, y: v.y * inv };
}

/** Perform vec 2 neg operation. */
export function flintVec2Neg(v: FlintVec2): FlintVec2 {
  return { x: -v.x, y: -v.y };
}

/** Perform vec 2 dot operation. */
export function flintVec2Dot(a: FlintVec2, b: FlintVec2): number {
  return a.x * b.x + a.y * b.y;
}

/** Perform vec 2 perp dot operation. */
export function flintVec2PerpDot(a: FlintVec2, b: FlintVec2): number {
  return a.x * b.y - a.y * b.x;
}

/** Perform vec 2 length sq operation. */
export function flintVec2LengthSq(v: FlintVec2): number {
  return v.x * v.x + v.y * v.y;
}

/** Perform vec 2 length operation. */
export function flintVec2Length(v: FlintVec2): number {
  return Math.hypot(v.x, v.y);
}

/** Perform vec 2 distance operation. */
export function flintVec2Distance(a: FlintVec2, b: FlintVec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/** Perform vec 2 distance squared operation. */
export function flintVec2DistanceSquared(a: FlintVec2, b: FlintVec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Perform vec 2 normalize operation. */
export function flintVec2Normalize(v: FlintVec2): FlintVec2 {
  const lengthSq = v.x * v.x + v.y * v.y;
  if (lengthSq <= FLINT_MATH_EPSILON) {
    return { x: 0, y: 0 };
  }
  const length = Math.sqrt(lengthSq);
  return { x: v.x / length, y: v.y / length };
}

/** Perform vec 2 lerp operation. */
export function flintVec2Lerp(a: FlintVec2, b: FlintVec2, t: number): FlintVec2 {
  return {
    x: flintLerp(a.x, b.x, t),
    y: flintLerp(a.y, b.y, t),
  };
}

/** Perform vec 2 reflect operation. */
export function flintVec2Reflect(v: FlintVec2, normal: FlintVec2): FlintVec2 {
  const d = 2 * flintVec2Dot(v, normal);
  return {
    x: v.x - d * normal.x,
    y: v.y - d * normal.y,
  };
}

/** Perform vec 2 project operation. */
export function flintVec2Project(v: FlintVec2, onto: FlintVec2): FlintVec2 {
  const lengthSq = flintVec2LengthSq(onto);
  if (lengthSq <= FLINT_MATH_EPSILON) {
    return { x: 0, y: 0 };
  }
  const factor = flintVec2Dot(v, onto) / lengthSq;
  return {
    x: onto.x * factor,
    y: onto.y * factor,
  };
}

/** Perform vec 2 rotate operation. */
export function flintVec2Rotate(v: FlintVec2, angleRad: number): FlintVec2 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

/** Perform vec 2 angle operation. */
export function flintVec2Angle(a: FlintVec2, b: FlintVec2): number {
  const dot = flintVec2Dot(a, b);
  const lengthProduct = flintVec2Length(a) * flintVec2Length(b);
  if (lengthProduct <= FLINT_MATH_EPSILON) {
    return 0;
  }
  return Math.acos(flintClamp(dot / lengthProduct, -1, 1));
}

/** Perform create flint vec 3 operation. */
export function createFlintVec3(x = 0, y = 0, z = 0): FlintVec3 {
  return { x, y, z };
}

/** Perform vec 3 add operation. */
export function flintVec3Add(a: FlintVec3, b: FlintVec3): FlintVec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/** Perform vec 3 sub operation. */
export function flintVec3Sub(a: FlintVec3, b: FlintVec3): FlintVec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/** Perform vec 3 mul operation. */
export function flintVec3Mul(a: FlintVec3, b: FlintVec3): FlintVec3 {
  return { x: a.x * b.x, y: a.y * b.y, z: a.z * b.z };
}

/** Perform vec 3 scale operation. */
export function flintVec3Scale(v: FlintVec3, scalar: number): FlintVec3 {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
}

/** Perform vec 3 div operation. */
export function flintVec3Div(v: FlintVec3, scalar: number): FlintVec3 {
  const inv = 1 / scalar;
  return { x: v.x * inv, y: v.y * inv, z: v.z * inv };
}

/** Perform vec 3 neg operation. */
export function flintVec3Neg(v: FlintVec3): FlintVec3 {
  return { x: -v.x, y: -v.y, z: -v.z };
}

/** Perform vec 3 dot operation. */
export function flintVec3Dot(a: FlintVec3, b: FlintVec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Perform vec 3 cross operation. */
export function flintVec3Cross(a: FlintVec3, b: FlintVec3): FlintVec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/** Perform vec 3 length sq operation. */
export function flintVec3LengthSq(v: FlintVec3): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

/** Perform vec 3 length operation. */
export function flintVec3Length(v: FlintVec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

/** Perform vec 3 distance operation. */
export function flintVec3Distance(a: FlintVec3, b: FlintVec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}

/** Perform vec 3 distance squared operation. */
export function flintVec3DistanceSquared(a: FlintVec3, b: FlintVec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

/** Perform vec 3 normalize operation. */
export function flintVec3Normalize(v: FlintVec3): FlintVec3 {
  const lengthSq = v.x * v.x + v.y * v.y + v.z * v.z;
  if (lengthSq <= FLINT_MATH_EPSILON) {
    return { x: 0, y: 0, z: 0 };
  }
  const length = Math.sqrt(lengthSq);
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

/** Perform vec 3 lerp operation. */
export function flintVec3Lerp(a: FlintVec3, b: FlintVec3, t: number): FlintVec3 {
  return {
    x: flintLerp(a.x, b.x, t),
    y: flintLerp(a.y, b.y, t),
    z: flintLerp(a.z, b.z, t),
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
export function flintVec3Reflect(v: FlintVec3, normal: FlintVec3): FlintVec3 {
  const d = 2 * flintVec3Dot(v, normal);
  return {
    x: v.x - d * normal.x,
    y: v.y - d * normal.y,
    z: v.z - d * normal.z,
  };
}

/** Perform vec 3 refract operation. */
export function flintVec3Refract(v: FlintVec3, normal: FlintVec3, eta: number): FlintVec3 {
  const dot = flintVec3Dot(v, normal);
  const k = 1 - eta * eta * (1 - dot * dot);
  if (k < 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return flintVec3Sub(flintVec3Scale(v, eta), flintVec3Scale(normal, eta * dot + Math.sqrt(k)));
}

/** Perform vec 3 project operation. */
export function flintVec3Project(v: FlintVec3, onto: FlintVec3): FlintVec3 {
  const lengthSq = flintVec3LengthSq(onto);
  if (lengthSq <= FLINT_MATH_EPSILON) {
    return { x: 0, y: 0, z: 0 };
  }
  const factor = flintVec3Dot(v, onto) / lengthSq;
  return {
    x: onto.x * factor,
    y: onto.y * factor,
    z: onto.z * factor,
  };
}

/** Perform vec 3 reject operation. */
export function flintVec3Reject(v: FlintVec3, from: FlintVec3): FlintVec3 {
  const proj = flintVec3Project(v, from);
  return flintVec3Sub(v, proj);
}

/** Perform vec 3 angle operation. */
export function flintVec3Angle(a: FlintVec3, b: FlintVec3): number {
  const dot = flintVec3Dot(a, b);
  const lengthProduct = flintVec3Length(a) * flintVec3Length(b);
  if (lengthProduct <= FLINT_MATH_EPSILON) {
    return 0;
  }
  return Math.acos(flintClamp(dot / lengthProduct, -1, 1));
}

/** Perform create flint vec 4 operation. */
export function createFlintVec4(x = 0, y = 0, z = 0, w = 0): FlintVec4 {
  return { x, y, z, w };
}

/** Perform vec 4 add operation. */
export function flintVec4Add(a: FlintVec4, b: FlintVec4): FlintVec4 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z, w: a.w + b.w };
}

/** Perform vec 4 sub operation. */
export function flintVec4Sub(a: FlintVec4, b: FlintVec4): FlintVec4 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z, w: a.w - b.w };
}

/** Perform vec 4 scale operation. */
export function flintVec4Scale(v: FlintVec4, scalar: number): FlintVec4 {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar, w: v.w * scalar };
}

/** Perform vec 4 div operation. */
export function flintVec4Div(v: FlintVec4, scalar: number): FlintVec4 {
  const inv = 1 / scalar;
  return { x: v.x * inv, y: v.y * inv, z: v.z * inv, w: v.w * inv };
}

/** Perform vec 4 neg operation. */
export function flintVec4Neg(v: FlintVec4): FlintVec4 {
  return { x: -v.x, y: -v.y, z: -v.z, w: -v.w };
}

/** Perform vec 4 dot operation. */
export function flintVec4Dot(a: FlintVec4, b: FlintVec4): number {
  return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
}

/** Perform vec 4 length operation. */
export function flintVec4Length(v: FlintVec4): number {
  return Math.hypot(v.x, v.y, v.z, v.w);
}

/** Perform vec 4 normalize operation. */
export function flintVec4Normalize(v: FlintVec4): FlintVec4 {
  const lengthSq = v.x * v.x + v.y * v.y + v.z * v.z + v.w * v.w;
  if (lengthSq <= FLINT_MATH_EPSILON) {
    return { x: 0, y: 0, z: 0, w: 0 };
  }
  const length = Math.sqrt(lengthSq);
  return { x: v.x / length, y: v.y / length, z: v.z / length, w: v.w / length };
}

/** Perform vec 4 lerp operation. */
export function flintVec4Lerp(a: FlintVec4, b: FlintVec4, t: number): FlintVec4 {
  return {
    x: flintLerp(a.x, b.x, t),
    y: flintLerp(a.y, b.y, t),
    z: flintLerp(a.z, b.z, t),
    w: flintLerp(a.w, b.w, t),
  };
}

/** Perform create flint i vec 2 operation. */
export function createFlintIVec2(x = 0, y = 0): FlintIVec2 {
  return { x: Math.trunc(x), y: Math.trunc(y) };
}

/** Perform create flint i vec 3 operation. */
export function createFlintIVec3(x = 0, y = 0, z = 0): FlintIVec3 {
  return { x: Math.trunc(x), y: Math.trunc(y), z: Math.trunc(z) };
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
export function createFlintMat2(c0OrElements?: FlintVec2 | readonly number[], c1?: FlintVec2): FlintMat2 {
  if (Array.isArray(c0OrElements)) {
    const element = c0OrElements;
    const col0 = { x: element[0] ?? 0, y: element[1] ?? 0 };
    const col1 = { x: element[2] ?? 0, y: element[3] ?? 0 };
    return {
      c0: col0,
      c1: col1,
      elements: [col0.x, col0.y, col1.x, col1.y],
    };
  }
  let col0: FlintVec2 = { x: 0, y: 0 };
  if (c0OrElements && typeof c0OrElements === 'object' && 'x' in c0OrElements) {
    col0 = c0OrElements;
  }
  const col1 = c1 ?? { x: 0, y: 0 };
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
export function flintMat2FromCols(c0: FlintVec2, c1: FlintVec2): FlintMat2 {
  return createFlintMat2(c0, c1);
}

/** Perform mat 2 add operation. */
export function flintMat2Add(a: FlintMat2, b: FlintMat2): FlintMat2 {
  return createFlintMat2(flintVec2Add(a.c0, b.c0), flintVec2Add(a.c1, b.c1));
}

/** Perform mat 2 sub operation. */
export function flintMat2Sub(a: FlintMat2, b: FlintMat2): FlintMat2 {
  return createFlintMat2(flintVec2Sub(a.c0, b.c0), flintVec2Sub(a.c1, b.c1));
}

/** Perform mat 2 scale operation. */
export function flintMat2Scale(m: FlintMat2, scalar: number): FlintMat2 {
  return createFlintMat2(flintVec2Scale(m.c0, scalar), flintVec2Scale(m.c1, scalar));
}

/** Perform mat 2 mul operation. */
export function flintMat2Mul(a: FlintMat2, b: FlintMat2): FlintMat2 {
  return createFlintMat2(
    {
      x: a.c0.x * b.c0.x + a.c1.x * b.c0.y,
      y: a.c0.y * b.c0.x + a.c1.y * b.c0.y,
    },
    {
      x: a.c0.x * b.c1.x + a.c1.x * b.c1.y,
      y: a.c0.y * b.c1.x + a.c1.y * b.c1.y,
    },
  );
}

/** Perform mat 2 transform vec 2 operation. */
export function flintMat2TransformVec2(m: FlintMat2, v: FlintVec2): FlintVec2 {
  return {
    x: m.c0.x * v.x + m.c1.x * v.y,
    y: m.c0.y * v.x + m.c1.y * v.y,
  };
}

/** Perform mat 2 transpose operation. */
export function flintMat2Transpose(m: FlintMat2): FlintMat2 {
  return createFlintMat2({ x: m.c0.x, y: m.c1.x }, { x: m.c0.y, y: m.c1.y });
}

/** Perform mat 2 determinant operation. */
export function flintMat2Determinant(m: FlintMat2): number {
  return m.c0.x * m.c1.y - m.c1.x * m.c0.y;
}

/** Perform mat 2 inverse operation. */
export function flintMat2Inverse(m: FlintMat2): FlintOption<FlintMat2> {
  const det = flintMat2Determinant(m);
  if (Math.abs(det) <= FLINT_MATH_EPSILON) {
    return flintNone();
  }
  const invDet = 1 / det;
  return flintSome(
    createFlintMat2({ x: m.c1.y * invDet, y: -m.c0.y * invDet }, { x: -m.c1.x * invDet, y: m.c0.x * invDet }),
  );
}

/** Perform mat 2 rotation operation. */
export function flintMat2Rotation(angleRad: number): FlintMat2 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return createFlintMat2({ x: cos, y: sin }, { x: -sin, y: cos });
}

/** Perform mat 2 scaling operation. */
export function flintMat2Scaling(s: FlintVec2): FlintMat2 {
  return createFlintMat2({ x: s.x, y: 0 }, { x: 0, y: s.y });
}

/** Perform create flint mat 3 operation. */
export function createFlintMat3(
  c0OrElements?: FlintVec3 | readonly number[],
  c1?: FlintVec3,
  c2?: FlintVec3,
): FlintMat3 {
  if (Array.isArray(c0OrElements)) {
    const element = c0OrElements;
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
  if (c0OrElements && typeof c0OrElements === 'object' && 'x' in c0OrElements) {
    col0 = c0OrElements;
  }
  const col1 = c1 ?? { x: 0, y: 0, z: 0 };
  const col2 = c2 ?? { x: 0, y: 0, z: 0 };
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
export function flintMat3FromCols(c0: FlintVec3, c1: FlintVec3, c2: FlintVec3): FlintMat3 {
  return createFlintMat3(c0, c1, c2);
}

/** Perform mat 3 add operation. */
export function flintMat3Add(a: FlintMat3, b: FlintMat3): FlintMat3 {
  return createFlintMat3(flintVec3Add(a.c0, b.c0), flintVec3Add(a.c1, b.c1), flintVec3Add(a.c2, b.c2));
}

/** Perform mat 3 sub operation. */
export function flintMat3Sub(a: FlintMat3, b: FlintMat3): FlintMat3 {
  return createFlintMat3(flintVec3Sub(a.c0, b.c0), flintVec3Sub(a.c1, b.c1), flintVec3Sub(a.c2, b.c2));
}

/** Perform mat 3 scale operation. */
export function flintMat3Scale(m: FlintMat3, scalar: number): FlintMat3 {
  return createFlintMat3(flintVec3Scale(m.c0, scalar), flintVec3Scale(m.c1, scalar), flintVec3Scale(m.c2, scalar));
}

/** Perform mat 3 mul operation. */
export function flintMat3Mul(a: FlintMat3, b: FlintMat3): FlintMat3 {
  return createFlintMat3(
    {
      x: a.c0.x * b.c0.x + a.c1.x * b.c0.y + a.c2.x * b.c0.z,
      y: a.c0.y * b.c0.x + a.c1.y * b.c0.y + a.c2.y * b.c0.z,
      z: a.c0.z * b.c0.x + a.c1.z * b.c0.y + a.c2.z * b.c0.z,
    },
    {
      x: a.c0.x * b.c1.x + a.c1.x * b.c1.y + a.c2.x * b.c1.z,
      y: a.c0.y * b.c1.x + a.c1.y * b.c1.y + a.c2.y * b.c1.z,
      z: a.c0.z * b.c1.x + a.c1.z * b.c1.y + a.c2.z * b.c1.z,
    },
    {
      x: a.c0.x * b.c2.x + a.c1.x * b.c2.y + a.c2.x * b.c2.z,
      y: a.c0.y * b.c2.x + a.c1.y * b.c2.y + a.c2.y * b.c2.z,
      z: a.c0.z * b.c2.x + a.c1.z * b.c2.y + a.c2.z * b.c2.z,
    },
  );
}

/** Perform mat 3 transform vec 3 operation. */
export function flintMat3TransformVec3(m: FlintMat3, v: FlintVec3): FlintVec3 {
  return {
    x: m.c0.x * v.x + m.c1.x * v.y + m.c2.x * v.z,
    y: m.c0.y * v.x + m.c1.y * v.y + m.c2.y * v.z,
    z: m.c0.z * v.x + m.c1.z * v.y + m.c2.z * v.z,
  };
}

/** Perform mat 3 transform vec 2 operation. */
export function flintMat3TransformVec2(m: FlintMat3, v: FlintVec2): FlintVec2 {
  return {
    x: m.c0.x * v.x + m.c1.x * v.y + m.c2.x,
    y: m.c0.y * v.x + m.c1.y * v.y + m.c2.y,
  };
}

/** Perform mat 3 transpose operation. */
export function flintMat3Transpose(m: FlintMat3): FlintMat3 {
  return createFlintMat3(
    { x: m.c0.x, y: m.c1.x, z: m.c2.x },
    { x: m.c0.y, y: m.c1.y, z: m.c2.y },
    { x: m.c0.z, y: m.c1.z, z: m.c2.z },
  );
}

/** Perform mat 3 determinant operation. */
export function flintMat3Determinant(m: FlintMat3): number {
  return (
    m.c0.x * (m.c1.y * m.c2.z - m.c2.y * m.c1.z) -
    m.c1.x * (m.c0.y * m.c2.z - m.c2.y * m.c0.z) +
    m.c2.x * (m.c0.y * m.c1.z - m.c1.y * m.c0.z)
  );
}

/** Perform mat 3 inverse operation. */
export function flintMat3Inverse(m: FlintMat3): FlintOption<FlintMat3> {
  const det = flintMat3Determinant(m);
  if (Math.abs(det) <= FLINT_MATH_EPSILON) {
    return flintNone();
  }
  const invDet = 1 / det;
  return flintSome(
    createFlintMat3(
      {
        x: (m.c1.y * m.c2.z - m.c2.y * m.c1.z) * invDet,
        y: (m.c2.y * m.c0.z - m.c0.y * m.c2.z) * invDet,
        z: (m.c0.y * m.c1.z - m.c1.y * m.c0.z) * invDet,
      },
      {
        x: (m.c2.x * m.c1.z - m.c1.x * m.c2.z) * invDet,
        y: (m.c0.x * m.c2.z - m.c2.x * m.c0.z) * invDet,
        z: (m.c1.x * m.c0.z - m.c0.x * m.c1.z) * invDet,
      },
      {
        x: (m.c1.x * m.c2.y - m.c2.x * m.c1.y) * invDet,
        y: (m.c2.x * m.c0.y - m.c0.x * m.c2.y) * invDet,
        z: (m.c0.x * m.c1.y - m.c1.x * m.c0.y) * invDet,
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
  c0OrElements?: FlintVec4 | readonly number[],
  c1?: FlintVec4,
  c2?: FlintVec4,
  c3?: FlintVec4,
): FlintMat4 {
  if (Array.isArray(c0OrElements)) {
    const element = c0OrElements;
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
  if (c0OrElements && typeof c0OrElements === 'object' && 'x' in c0OrElements) {
    col0 = c0OrElements;
  }
  const col1 = c1 ?? { x: 0, y: 0, z: 0, w: 0 };
  const col2 = c2 ?? { x: 0, y: 0, z: 0, w: 0 };
  const col3 = c3 ?? { x: 0, y: 0, z: 0, w: 0 };
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
export function flintMat4FromCols(c0: FlintVec4, c1: FlintVec4, c2: FlintVec4, c3: FlintVec4): FlintMat4 {
  return createFlintMat4(c0, c1, c2, c3);
}

/** Perform mat 4 add operation. */
export function flintMat4Add(a: FlintMat4, b: FlintMat4): FlintMat4 {
  return createFlintMat4(
    flintVec4Add(a.c0, b.c0),
    flintVec4Add(a.c1, b.c1),
    flintVec4Add(a.c2, b.c2),
    flintVec4Add(a.c3, b.c3),
  );
}

/** Perform mat 4 sub operation. */
export function flintMat4Sub(a: FlintMat4, b: FlintMat4): FlintMat4 {
  return createFlintMat4(
    flintVec4Sub(a.c0, b.c0),
    flintVec4Sub(a.c1, b.c1),
    flintVec4Sub(a.c2, b.c2),
    flintVec4Sub(a.c3, b.c3),
  );
}

/** Perform mat 4 scale operation. */
export function flintMat4Scale(m: FlintMat4, scalar: number): FlintMat4 {
  return createFlintMat4(
    flintVec4Scale(m.c0, scalar),
    flintVec4Scale(m.c1, scalar),
    flintVec4Scale(m.c2, scalar),
    flintVec4Scale(m.c3, scalar),
  );
}

/** Perform mat 4 mul operation. */
export function flintMat4Mul(a: FlintMat4, b: FlintMat4): FlintMat4 {
  return createFlintMat4(
    {
      x: a.c0.x * b.c0.x + a.c1.x * b.c0.y + a.c2.x * b.c0.z + a.c3.x * b.c0.w,
      y: a.c0.y * b.c0.x + a.c1.y * b.c0.y + a.c2.y * b.c0.z + a.c3.y * b.c0.w,
      z: a.c0.z * b.c0.x + a.c1.z * b.c0.y + a.c2.z * b.c0.z + a.c3.z * b.c0.w,
      w: a.c0.w * b.c0.x + a.c1.w * b.c0.y + a.c2.w * b.c0.z + a.c3.w * b.c0.w,
    },
    {
      x: a.c0.x * b.c1.x + a.c1.x * b.c1.y + a.c2.x * b.c1.z + a.c3.x * b.c1.w,
      y: a.c0.y * b.c1.x + a.c1.y * b.c1.y + a.c2.y * b.c1.z + a.c3.y * b.c1.w,
      z: a.c0.z * b.c1.x + a.c1.z * b.c1.y + a.c2.z * b.c1.z + a.c3.z * b.c1.w,
      w: a.c0.w * b.c1.x + a.c1.w * b.c1.y + a.c2.w * b.c1.z + a.c3.w * b.c1.w,
    },
    {
      x: a.c0.x * b.c2.x + a.c1.x * b.c2.y + a.c2.x * b.c2.z + a.c3.x * b.c2.w,
      y: a.c0.y * b.c2.x + a.c1.y * b.c2.y + a.c2.y * b.c2.z + a.c3.y * b.c2.w,
      z: a.c0.z * b.c2.x + a.c1.z * b.c2.y + a.c2.z * b.c2.z + a.c3.z * b.c2.w,
      w: a.c0.w * b.c2.x + a.c1.w * b.c2.y + a.c2.w * b.c2.z + a.c3.w * b.c2.w,
    },
    {
      x: a.c0.x * b.c3.x + a.c1.x * b.c3.y + a.c2.x * b.c3.z + a.c3.x * b.c3.w,
      y: a.c0.y * b.c3.x + a.c1.y * b.c3.y + a.c2.y * b.c3.z + a.c3.y * b.c3.w,
      z: a.c0.z * b.c3.x + a.c1.z * b.c3.y + a.c2.z * b.c3.z + a.c3.z * b.c3.w,
      w: a.c0.w * b.c3.x + a.c1.w * b.c3.y + a.c2.w * b.c3.z + a.c3.w * b.c3.w,
    },
  );
}

/** Perform mat 4 transform vec 4 operation. */
export function flintMat4TransformVec4(m: FlintMat4, v: FlintVec4): FlintVec4 {
  return {
    x: m.c0.x * v.x + m.c1.x * v.y + m.c2.x * v.z + m.c3.x * v.w,
    y: m.c0.y * v.x + m.c1.y * v.y + m.c2.y * v.z + m.c3.y * v.w,
    z: m.c0.z * v.x + m.c1.z * v.y + m.c2.z * v.z + m.c3.z * v.w,
    w: m.c0.w * v.x + m.c1.w * v.y + m.c2.w * v.z + m.c3.w * v.w,
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
export function flintMat4Transpose(m: FlintMat4): FlintMat4 {
  return createFlintMat4(
    { x: m.c0.x, y: m.c1.x, z: m.c2.x, w: m.c3.x },
    { x: m.c0.y, y: m.c1.y, z: m.c2.y, w: m.c3.y },
    { x: m.c0.z, y: m.c1.z, z: m.c2.z, w: m.c3.z },
    { x: m.c0.w, y: m.c1.w, z: m.c2.w, w: m.c3.w },
  );
}

/** Perform mat 4 determinant operation. */
export function flintMat4Determinant(m: FlintMat4): number {
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
  const t = 1 - cos;
  const { x, y, z } = norm;

  return createFlintMat4(
    {
      x: t * x * x + cos,
      y: t * x * y + sin * z,
      z: t * x * z - sin * y,
      w: 0,
    },
    {
      x: t * x * y - sin * z,
      y: t * y * y + cos,
      z: t * y * z + sin * x,
      w: 0,
    },
    {
      x: t * x * z + sin * y,
      y: t * y * z - sin * x,
      z: t * z * z + cos,
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
  const f = 1 / Math.tan(fovYRad * 0.5);
  const rangeInv = 1 / (zNear - zFar);

  return createFlintMat4(
    { x: f / aspect, y: 0, z: 0, w: 0 },
    { x: 0, y: f, z: 0, w: 0 },
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
export function createFlintQuat(x = 0, y = 0, z = 0, w = 1): FlintQuat {
  return { x, y, z, w };
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
  const p = pitchX * 0.5;
  const y = yawY * 0.5;
  const r = rollZ * 0.5;

  const cp = Math.cos(p);
  const sp = Math.sin(p);
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const cr = Math.cos(r);
  const sr = Math.sin(r);

  return {
    x: sp * cy * cr - cp * sy * sr,
    y: cp * sy * cr + sp * cy * sr,
    z: cp * cy * sr - sp * sy * cr,
    w: cp * cy * cr + sp * sy * sr,
  };
}

/** Perform quat mul operation. */
export function flintQuatMul(a: FlintQuat, b: FlintQuat): FlintQuat {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

/** Perform quat conjugate operation. */
export function flintQuatConjugate(q: FlintQuat): FlintQuat {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}

/** Perform quat norm sq operation. */
export function flintQuatNormSq(q: FlintQuat): number {
  return q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w;
}

/** Perform quat norm operation. */
export function flintQuatNorm(q: FlintQuat): number {
  return Math.hypot(q.x, q.y, q.z, q.w);
}

/** Perform quat normalize operation. */
export function flintQuatNormalize(q: FlintQuat): FlintQuat {
  const normSq = flintQuatNormSq(q);
  if (normSq <= FLINT_MATH_EPSILON) {
    return flintQuatIdentity();
  }
  const invNorm = 1 / Math.sqrt(normSq);
  return {
    x: q.x * invNorm,
    y: q.y * invNorm,
    z: q.z * invNorm,
    w: q.w * invNorm,
  };
}

/** Perform quat inverse operation. */
export function flintQuatInverse(q: FlintQuat): FlintOption<FlintQuat> {
  const normSq = flintQuatNormSq(q);
  if (normSq <= FLINT_MATH_EPSILON) {
    return flintNone();
  }
  const invNormSq = 1 / normSq;
  return flintSome({
    x: -q.x * invNormSq,
    y: -q.y * invNormSq,
    z: -q.z * invNormSq,
    w: q.w * invNormSq,
  });
}

/** Perform quat rotate vec 3 operation. */
export function flintQuatRotateVec3(q: FlintQuat, v: FlintVec3): FlintVec3 {
  const qv = { x: q.x, y: q.y, z: q.z };
  const uv = flintVec3Cross(qv, v);
  const uuv = flintVec3Cross(qv, uv);
  const uvW = flintVec3Scale(uv, q.w * 2);
  const uuv2 = flintVec3Scale(uuv, 2);
  return flintVec3Add(v, flintVec3Add(uvW, uuv2));
}

/** Perform quat to mat 4 operation. */
export function flintQuatToMat4(q: FlintQuat): FlintMat4 {
  const x2 = q.x + q.x;
  const y2 = q.y + q.y;
  const z2 = q.z + q.z;
  const xx = q.x * x2;
  const xy = q.x * y2;
  const xz = q.x * z2;
  const yy = q.y * y2;
  const yz = q.y * z2;
  const zz = q.z * z2;
  const wx = q.w * x2;
  const wy = q.w * y2;
  const wz = q.w * z2;

  return createFlintMat4(
    { x: 1 - (yy + zz), y: xy + wz, z: xz - wy, w: 0 },
    { x: xy - wz, y: 1 - (xx + zz), z: yz + wx, w: 0 },
    { x: xz + wy, y: yz - wx, z: 1 - (xx + yy), w: 0 },
    { x: 0, y: 0, z: 0, w: 1 },
  );
}

/** Perform quat to mat 3 operation. */
export function flintQuatToMat3(q: FlintQuat): FlintMat3 {
  const x2 = q.x + q.x;
  const y2 = q.y + q.y;
  const z2 = q.z + q.z;
  const xx = q.x * x2;
  const xy = q.x * y2;
  const xz = q.x * z2;
  const yy = q.y * y2;
  const yz = q.y * z2;
  const zz = q.z * z2;
  const wx = q.w * x2;
  const wy = q.w * y2;
  const wz = q.w * z2;

  return createFlintMat3(
    { x: 1 - (yy + zz), y: xy + wz, z: xz - wy },
    { x: xy - wz, y: 1 - (xx + zz), z: yz + wx },
    { x: xz + wy, y: yz - wx, z: 1 - (xx + yy) },
  );
}

/** Perform quat slerp operation. */
export function flintQuatSlerp(a: FlintQuat, b: FlintQuat, t: number): FlintQuat {
  let cosHalfTheta = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  let targetB = b;

  if (cosHalfTheta < 0) {
    targetB = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
    cosHalfTheta = -cosHalfTheta;
  }

  if (cosHalfTheta >= 1 - FLINT_MATH_EPSILON) {
    return flintQuatNormalize({
      x: flintLerp(a.x, targetB.x, t),
      y: flintLerp(a.y, targetB.y, t),
      z: flintLerp(a.z, targetB.z, t),
      w: flintLerp(a.w, targetB.w, t),
    });
  }

  const halfTheta = Math.acos(cosHalfTheta);
  const sinHalfTheta = Math.sin(halfTheta);
  const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

  return {
    x: a.x * ratioA + targetB.x * ratioB,
    y: a.y * ratioA + targetB.y * ratioB,
    z: a.z * ratioA + targetB.z * ratioB,
    w: a.w * ratioA + targetB.w * ratioB,
  };
}

/** Perform quat dot operation. */
export function flintQuatDot(a: FlintQuat, b: FlintQuat): number {
  return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
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

/** O B B 2 representation. */
export interface FlintOBB2 {
  readonly center: FlintVec2;
  readonly halfExtents: FlintVec2;
  readonly angleRad: number;
}

/** O B B 3 representation. */
export interface FlintOBB3 {
  readonly center: FlintVec3;
  readonly halfExtents: FlintVec3;
  readonly orientation: FlintQuat;
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
export function createFlintSegment2(start: FlintVec2, end: FlintVec2): FlintSegment2 {
  return { start, end };
}

/** Perform create flint segment 3 operation. */
export function createFlintSegment3(start: FlintVec3, end: FlintVec3): FlintSegment3 {
  return { start, end };
}

/** Perform create flint plane 3 operation. */
export function createFlintPlane3(normal: FlintVec3, distance: number): FlintPlane3 {
  return { normal: flintVec3Normalize(normal), distance };
}

/** Perform create flint a a b b 2 operation. */
export function createFlintAABB2(min: FlintVec2, max: FlintVec2): FlintAABB2 {
  return {
    min: { x: Math.min(min.x, max.x), y: Math.min(min.y, max.y) },
    max: { x: Math.max(min.x, max.x), y: Math.max(min.y, max.y) },
  };
}

/** Perform create flint a a b b 3 operation. */
export function createFlintAABB3(min: FlintVec3, max: FlintVec3): FlintAABB3 {
  return {
    min: {
      x: Math.min(min.x, max.x),
      y: Math.min(min.y, max.y),
      z: Math.min(min.z, max.z),
    },
    max: {
      x: Math.max(min.x, max.x),
      y: Math.max(min.y, max.y),
      z: Math.max(min.z, max.z),
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
export function createFlintTriangle2(a: FlintVec2, b: FlintVec2, c: FlintVec2): FlintTriangle2 {
  return { a, b, c };
}

/** Perform create flint triangle 3 operation. */
export function createFlintTriangle3(a: FlintVec3, b: FlintVec3, c: FlintVec3): FlintTriangle3 {
  return { a, b, c };
}

/** Perform a a b b 2 contains point operation. */
export function flintAABB2ContainsPoint(box: FlintAABB2, point: FlintVec2): boolean {
  return point.x >= box.min.x && point.x <= box.max.x && point.y >= box.min.y && point.y <= box.max.y;
}

/** Perform a a b b 2 intersects a a b b 2 operation. */
export function flintAABB2IntersectsAABB2(a: FlintAABB2, b: FlintAABB2): boolean {
  return a.min.x <= b.max.x && a.max.x >= b.min.x && a.min.y <= b.max.y && a.max.y >= b.min.y;
}

/** Perform a a b b 2 union operation. */
export function flintAABB2Union(a: FlintAABB2, b: FlintAABB2): FlintAABB2 {
  return {
    min: { x: Math.min(a.min.x, b.min.x), y: Math.min(a.min.y, b.min.y) },
    max: { x: Math.max(a.max.x, b.max.x), y: Math.max(a.max.y, b.max.y) },
  };
}

/** Perform a a b b 2 area operation. */
export function flintAABB2Area(box: FlintAABB2): number {
  const w = box.max.x - box.min.x;
  const h = box.max.y - box.min.y;
  return w > 0 && h > 0 ? w * h : 0;
}

/** Perform circle contains point operation. */
export function flintCircleContainsPoint(c: FlintCircle, p: FlintVec2): boolean {
  return flintVec2DistanceSquared(c.center, p) <= c.radius * c.radius;
}

/** Perform circle intersects circle operation. */
export function flintCircleIntersectsCircle(a: FlintCircle, b: FlintCircle): boolean {
  const r = a.radius + b.radius;
  return flintVec2DistanceSquared(a.center, b.center) <= r * r;
}

/** Perform triangle 2 area operation. */
export function flintTriangle2Area(tri: FlintTriangle2): number {
  return Math.abs(tri.a.x * (tri.b.y - tri.c.y) + tri.b.x * (tri.c.y - tri.a.y) + tri.c.x * (tri.a.y - tri.b.y)) * 0.5;
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
export function flintAABB3IntersectsAABB3(a: FlintAABB3, b: FlintAABB3): boolean {
  return (
    a.min.x <= b.max.x &&
    a.max.x >= b.min.x &&
    a.min.y <= b.max.y &&
    a.max.y >= b.min.y &&
    a.min.z <= b.max.z &&
    a.max.z >= b.min.z
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
export function flintSphereContainsPoint(s: FlintSphere, p: FlintVec3): boolean {
  return flintVec3DistanceSquared(s.center, p) <= s.radius * s.radius;
}

/** Perform sphere intersects sphere operation. */
export function flintSphereIntersectsSphere(a: FlintSphere, b: FlintSphere): boolean {
  const r = a.radius + b.radius;
  return flintVec3DistanceSquared(a.center, b.center) <= r * r;
}

/** Perform plane 3 distance to point operation. */
export function flintPlane3DistanceToPoint(plane: FlintPlane3, point: FlintVec3): number {
  return flintVec3Dot(plane.normal, point) + plane.distance;
}

/** Perform triangle 3 normal operation. */
export function flintTriangle3Normal(tri: FlintTriangle3): FlintVec3 {
  const ab = flintVec3Sub(tri.b, tri.a);
  const ac = flintVec3Sub(tri.c, tri.a);
  return flintVec3Normalize(flintVec3Cross(ab, ac));
}

/** Perform frustum from view proj operation. */
export function flintFrustumFromViewProj(vp: FlintMat4): FlintFrustum {
  const m = [
    vp.c0.x,
    vp.c0.y,
    vp.c0.z,
    vp.c0.w,
    vp.c1.x,
    vp.c1.y,
    vp.c1.z,
    vp.c1.w,
    vp.c2.x,
    vp.c2.y,
    vp.c2.z,
    vp.c2.w,
    vp.c3.x,
    vp.c3.y,
    vp.c3.z,
    vp.c3.w,
  ];
  // Left: row 3 + row 0
  const leftNormal = flintVec3Normalize({ x: m[3] + m[0], y: m[7] + m[4], z: m[11] + m[8] });
  const leftDistribution =
    (m[15] + m[12]) / (flintVec3Length({ x: m[3] + m[0], y: m[7] + m[4], z: m[11] + m[8] }) || 1);

  // Right: row 3 - row 0
  const rightNormal = flintVec3Normalize({ x: m[3] - m[0], y: m[7] - m[4], z: m[11] - m[8] });
  const rightDistribution =
    (m[15] - m[12]) / (flintVec3Length({ x: m[3] - m[0], y: m[7] - m[4], z: m[11] - m[8] }) || 1);

  // Bottom: row 3 + row 1
  const bottomNormal = flintVec3Normalize({ x: m[3] + m[1], y: m[7] + m[5], z: m[11] + m[9] });
  const bottomDistribution =
    (m[15] + m[13]) / (flintVec3Length({ x: m[3] + m[1], y: m[7] + m[5], z: m[11] + m[9] }) || 1);

  // Top: row 3 - row 1
  const topNormal = flintVec3Normalize({ x: m[3] - m[1], y: m[7] - m[5], z: m[11] - m[9] });
  const topDistribution = (m[15] - m[13]) / (flintVec3Length({ x: m[3] - m[1], y: m[7] - m[5], z: m[11] - m[9] }) || 1);

  // Near: row 3 + row 2
  const nearNormal = flintVec3Normalize({ x: m[3] + m[2], y: m[7] + m[6], z: m[11] + m[10] });
  const nearDistribution =
    (m[15] + m[14]) / (flintVec3Length({ x: m[3] + m[2], y: m[7] + m[6], z: m[11] + m[10] }) || 1);

  // Far: row 3 - row 2
  const farNormal = flintVec3Normalize({ x: m[3] - m[2], y: m[7] - m[6], z: m[11] - m[10] });
  const farDistribution =
    (m[15] - m[14]) / (flintVec3Length({ x: m[3] - m[2], y: m[7] - m[6], z: m[11] - m[10] }) || 1);

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
export function flintFrustumIntersectsSphere(f: FlintFrustum, s: FlintSphere): boolean {
  if (flintPlane3DistanceToPoint(f.left, s.center) < -s.radius) {
    return false;
  }
  if (flintPlane3DistanceToPoint(f.right, s.center) < -s.radius) {
    return false;
  }
  if (flintPlane3DistanceToPoint(f.bottom, s.center) < -s.radius) {
    return false;
  }
  if (flintPlane3DistanceToPoint(f.top, s.center) < -s.radius) {
    return false;
  }
  if (flintPlane3DistanceToPoint(f.near, s.center) < -s.radius) {
    return false;
  }
  if (flintPlane3DistanceToPoint(f.far, s.center) < -s.radius) {
    return false;
  }
  return true;
}

/** Perform ray 3 intersects sphere operation. */
export function flintRay3IntersectsSphere(ray: FlintRay3, sphere: FlintSphere): FlintOption<number> {
  const oc = flintVec3Sub(ray.origin, sphere.center);
  const a = flintVec3Dot(ray.direction, ray.direction);
  const b = 2 * flintVec3Dot(oc, ray.direction);
  const c = flintVec3Dot(oc, oc) - sphere.radius * sphere.radius;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return flintNone();
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const t0 = (-b - sqrtDisc) / (2 * a);
  const t1 = (-b + sqrtDisc) / (2 * a);

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
  const t = -(flintVec3Dot(plane.normal, ray.origin) + plane.distance) / denom;
  return t >= 0 ? flintSome(t) : flintNone();
}

/** Perform ray 3 intersects triangle 3 operation. */
export function flintRay3IntersectsTriangle3(ray: FlintRay3, tri: FlintTriangle3): FlintOption<number> {
  const edge1 = flintVec3Sub(tri.b, tri.a);
  const edge2 = flintVec3Sub(tri.c, tri.a);
  const pvec = flintVec3Cross(ray.direction, edge2);
  const det = flintVec3Dot(edge1, pvec);

  if (Math.abs(det) <= FLINT_MATH_EPSILON) {
    return flintNone();
  }
  const invDet = 1 / det;

  const tvec = flintVec3Sub(ray.origin, tri.a);
  const u = flintVec3Dot(tvec, pvec) * invDet;
  if (u < 0 || u > 1) {
    return flintNone();
  }

  const qvec = flintVec3Cross(tvec, edge1);
  const v = flintVec3Dot(ray.direction, qvec) * invDet;
  if (v < 0 || u + v > 1) {
    return flintNone();
  }

  const t = flintVec3Dot(edge2, qvec) * invDet;
  return t >= 0 ? flintSome(t) : flintNone();
}

/** Perform ray 3 intersect o b b operation. */
export function flintRay3IntersectOBB(ray: FlintRay3, obb: FlintOBB3): FlintOption<number> {
  const u0 = flintQuatRotateVec3(obb.orientation, { x: 1, y: 0, z: 0 });
  const u1 = flintQuatRotateVec3(obb.orientation, { x: 0, y: 1, z: 0 });
  const u2 = flintQuatRotateVec3(obb.orientation, { x: 0, y: 0, z: 1 });

  const p = flintVec3Sub(obb.center, ray.origin);
  const axes = [u0, u1, u2];
  const halfExtension = obb.halfExtents ?? obb.half_extents ?? { x: 0, y: 0, z: 0 };
  const halfExtents = [halfExtension.x, halfExtension.y, halfExtension.z];

  let tmin = -Infinity;
  let tmax = Infinity;

  for (let index = 0; index < 3; index += 1) {
    const axis = axes[index] ?? { x: 0, y: 0, z: 0 };
    const hi = halfExtents[index] ?? 0;
    const centerOffsetDistance = flintVec3Dot(axis, p);
    const f = flintVec3Dot(axis, ray.direction);

    if (Math.abs(f) > FLINT_MATH_EPSILON) {
      let t1 = (centerOffsetDistance - hi) / f;
      let t2 = (centerOffsetDistance + hi) / f;
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

    const b = node.bounds;
    let tmin = -Infinity;
    let tmax = Infinity;
    let intersectsBox = true;

    const dims: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];
    for (const axis of dims) {
      const origin = ray.origin[axis];
      const direction = ray.direction[axis];
      const minValue = b.min[axis];
      const maxValue = b.max[axis];

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
        if (Math.abs(pt.x - b.min.x) < eps) {
          closestNormal = { x: -1, y: 0, z: 0 };
        } else if (Math.abs(pt.x - b.max.x) < eps) {
          closestNormal = { x: 1, y: 0, z: 0 };
        } else if (Math.abs(pt.y - b.min.y) < eps) {
          closestNormal = { x: 0, y: -1, z: 0 };
        } else if (Math.abs(pt.y - b.max.y) < eps) {
          closestNormal = { x: 0, y: 1, z: 0 };
        } else if (Math.abs(pt.z - b.min.z) < eps) {
          closestNormal = { x: 0, y: 0, z: -1 };
        } else if (Math.abs(pt.z - b.max.z) < eps) {
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
export function flintBezier2Quadratic(p0: FlintVec2, p1: FlintVec2, p2: FlintVec2, t: number): FlintVec2 {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const u2t = 2 * u * t;
  return {
    x: uu * p0.x + u2t * p1.x + tt * p2.x,
    y: uu * p0.y + u2t * p1.y + tt * p2.y,
  };
}

/** Perform bezier 2 cubic operation. */
export function flintBezier2Cubic(p0: FlintVec2, p1: FlintVec2, p2: FlintVec2, p3: FlintVec2, t: number): FlintVec2 {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

/** Perform bezier 3 cubic operation. */
export function flintBezier3Cubic(p0: FlintVec3, p1: FlintVec3, p2: FlintVec3, p3: FlintVec3, t: number): FlintVec3 {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
    z: uuu * p0.z + 3 * uu * t * p1.z + 3 * u * tt * p2.z + ttt * p3.z,
  };
}

/** Perform catmull rom 2 operation. */
export function flintCatmullRom2(p0: FlintVec2, p1: FlintVec2, p2: FlintVec2, p3: FlintVec2, t: number): FlintVec2 {
  const t2 = t * t;
  const t3 = t2 * t;
  const f0 = -0.5 * t3 + t2 - 0.5 * t;
  const f1 = 1.5 * t3 - 2.5 * t2 + 1;
  const f2 = -1.5 * t3 + 2 * t2 + 0.5 * t;
  const f3 = 0.5 * t3 - 0.5 * t2;
  return {
    x: p0.x * f0 + p1.x * f1 + p2.x * f2 + p3.x * f3,
    y: p0.y * f0 + p1.y * f1 + p2.y * f2 + p3.y * f3,
  };
}

/** Perform catmull rom 3 operation. */
export function flintCatmullRom3(p0: FlintVec3, p1: FlintVec3, p2: FlintVec3, p3: FlintVec3, t: number): FlintVec3 {
  const t2 = t * t;
  const t3 = t2 * t;
  const f0 = -0.5 * t3 + t2 - 0.5 * t;
  const f1 = 1.5 * t3 - 2.5 * t2 + 1;
  const f2 = -1.5 * t3 + 2 * t2 + 0.5 * t;
  const f3 = 0.5 * t3 - 0.5 * t2;
  return {
    x: p0.x * f0 + p1.x * f1 + p2.x * f2 + p3.x * f3,
    y: p0.y * f0 + p1.y * f1 + p2.y * f2 + p3.y * f3,
    z: p0.z * f0 + p1.z * f1 + p2.z * f2 + p3.z * f3,
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
export function createFlintColorRgba(r = 0, g = 0, b = 0, a = 1): FlintColorRgba {
  return {
    r: flintClamp(r, 0, 1),
    g: flintClamp(g, 0, 1),
    b: flintClamp(b, 0, 1),
    a: flintClamp(a, 0, 1),
  };
}

/** Convert a single sRGB color channel component to linear space. */
function srgbToLinearChannel(c: number): number {
  return c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Convert a single linear color channel component to sRGB space. */
function linearToSrgbChannel(c: number): number {
  return c <= 0.003_130_8 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** Perform color srgb to linear operation. */
export function flintColorSrgbToLinear(c: FlintColorRgba): FlintColorRgba {
  return {
    r: srgbToLinearChannel(c.r),
    g: srgbToLinearChannel(c.g),
    b: srgbToLinearChannel(c.b),
    a: c.a,
  };
}

/** Perform color linear to srgb operation. */
export function flintColorLinearToSrgb(c: FlintColorRgba): FlintColorRgba {
  return {
    r: linearToSrgbChannel(c.r),
    g: linearToSrgbChannel(c.g),
    b: linearToSrgbChannel(c.b),
    a: c.a,
  };
}

/** Perform color rgb to hsv operation. */
export function flintColorRgbToHsv(c: FlintColorRgba): FlintColorHsv {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d > 0) {
    if (max === c.r) {
      h = (c.g - c.b) / d + (c.g < c.b ? 6 : 0);
    } else if (max === c.g) {
      h = (c.b - c.r) / d + 2;
    } else {
      h = (c.r - c.g) / d + 4;
    }
    h *= 60;
  }

  return { h, s, v, a: c.a };
}

/** Perform color hsv to rgb operation. */
export function flintColorHsvToRgb(hsv: FlintColorHsv): FlintColorRgba {
  const h = ((hsv.h % 360) + 360) % 360;
  const s = flintClamp(hsv.s, 0, 1);
  const v = flintClamp(hsv.v, 0, 1);

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return createFlintColorRgba(r + m, g + m, b + m, hsv.a);
}

/** Perform color srgb to oklab operation. */
export function flintColorSrgbToOklab(c: FlintColorRgba): FlintColorOklab {
  const lin = flintColorSrgbToLinear(c);
  const l = 0.412_221_470_8 * lin.r + 0.536_332_536_3 * lin.g + 0.051_445_992_9 * lin.b;
  const m = 0.211_903_498_2 * lin.r + 0.680_699_545_1 * lin.g + 0.107_396_956_6 * lin.b;
  const s = 0.088_302_461_9 * lin.r + 0.281_718_837_6 * lin.g + 0.629_978_700_5 * lin.b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    l: 0.210_454_255_3 * l_ + 0.793_617_785 * m_ - 0.004_072_046_8 * s_,
    a: 1.977_998_495_1 * l_ - 2.428_592_205 * m_ + 0.450_593_709_9 * s_,
    b: 0.025_904_037_1 * l_ + 0.782_771_766_2 * m_ - 0.808_675_766 * s_,
    alpha: c.a,
  };
}

/** Perform color oklab to srgb operation. */
export function flintColorOklabToSrgb(lab: FlintColorOklab): FlintColorRgba {
  const l_ = lab.l + 0.396_337_777_4 * lab.a + 0.215_803_757_3 * lab.b;
  const m_ = lab.l - 0.105_561_345_8 * lab.a - 0.063_854_172_8 * lab.b;
  const s_ = lab.l - 0.089_484_177_5 * lab.a - 1.291_485_548 * lab.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.076_741_662_1 * l - 3.307_711_591_3 * m + 0.230_969_929_2 * s;
  const gLin = -1.268_438_004_6 * l + 2.609_757_401_1 * m - 0.341_319_396_5 * s;
  const bLin = -0.004_196_086_3 * l - 0.703_418_614_7 * m + 1.707_614_701 * s;

  return createFlintColorRgba(
    linearToSrgbChannel(rLin),
    linearToSrgbChannel(gLin),
    linearToSrgbChannel(bLin),
    lab.alpha,
  );
}

/** Perform color lerp oklab operation. */
export function flintColorLerpOklab(c1: FlintColorRgba, c2: FlintColorRgba, t: number): FlintColorRgba {
  const lab1 = flintColorSrgbToOklab(c1);
  const lab2 = flintColorSrgbToOklab(c2);
  const mixedLab: FlintColorOklab = {
    l: flintLerp(lab1.l, lab2.l, t),
    a: flintLerp(lab1.a, lab2.a, t),
    b: flintLerp(lab1.b, lab2.b, t),
    alpha: flintLerp(lab1.alpha, lab2.alpha, t),
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
export function flintDMatrixGet(m: FlintDMatrix, row: number, col: number): FlintOption<number> {
  if (row < 0 || row >= m.rows || col < 0 || col >= m.cols || !Number.isInteger(row) || !Number.isInteger(col)) {
    return flintNone();
  }
  return flintSome(m.data[row * m.cols + col] ?? 0);
}

/** Perform d matrix set operation. */
export function flintDMatrixSet(m: FlintDMatrix, row: number, col: number, value: number): boolean {
  if (row < 0 || row >= m.rows || col < 0 || col >= m.cols || !Number.isInteger(row) || !Number.isInteger(col)) {
    return false;
  }
  m.data[row * m.cols + col] = value;
  return true;
}

/** Perform d matrix add inplace operation. */
export function flintDMatrixAddInplace(a: FlintDMatrix, b: FlintDMatrix): boolean {
  if (a.rows !== b.rows || a.cols !== b.cols) {
    return false;
  }
  const total = a.rows * a.cols;
  const aData = a.data;
  const bData = b.data;
  for (let index = 0; index < total; index += 1) {
    aData[index] = (aData[index] ?? 0) + (bData[index] ?? 0);
  }
  return true;
}

/** Perform d matrix sub inplace operation. */
export function flintDMatrixSubInplace(a: FlintDMatrix, b: FlintDMatrix): boolean {
  if (a.rows !== b.rows || a.cols !== b.cols) {
    return false;
  }
  const total = a.rows * a.cols;
  const aData = a.data;
  const bData = b.data;
  for (let index = 0; index < total; index += 1) {
    aData[index] = (aData[index] ?? 0) - (bData[index] ?? 0);
  }
  return true;
}

/** Perform d matrix scale inplace operation. */
export function flintDMatrixScaleInplace(m: FlintDMatrix, factor: number): void {
  const total = m.rows * m.cols;
  const mData = m.data;
  for (let index = 0; index < total; index += 1) {
    mData[index] = (mData[index] ?? 0) * factor;
  }
}

/** Perform d matrix mul accumulate operation. */
export function flintDMatrixMulAccumulate(out: FlintDMatrix, a: FlintDMatrix, b: FlintDMatrix, alpha = 1): boolean {
  if (out.rows !== a.rows || out.cols !== b.cols || a.cols !== b.rows) {
    return false;
  }
  const outData = out.data;
  for (let r = 0; r < a.rows; r += 1) {
    for (let k = 0; k < a.cols; k += 1) {
      const aValue = a.data[r * a.cols + k] ?? 0;
      if (aValue === 0) {
        continue;
      }
      const scaledA = aValue * alpha;
      for (let c = 0; c < b.cols; c += 1) {
        const bValue = b.data[k * b.cols + c] ?? 0;
        outData[r * out.cols + c] = (outData[r * out.cols + c] ?? 0) + scaledA * bValue;
      }
    }
  }
  return true;
}

/** Perform d matrix transpose operation. */
export function flintDMatrixTranspose(m: FlintDMatrix): FlintDMatrix {
  const resultData = new Float64Array(m.rows * m.cols);
  for (let r = 0; r < m.rows; r += 1) {
    for (let c = 0; c < m.cols; c += 1) {
      resultData[c * m.rows + r] = m.data[r * m.cols + c] ?? 0;
    }
  }
  return { rows: m.cols, cols: m.rows, data: [...resultData] };
}

/** Perform d matrix mul operation. */
export function flintDMatrixMul(a: FlintDMatrix, b: FlintDMatrix): FlintOption<FlintDMatrix> {
  if (a.cols !== b.rows) {
    return flintNone();
  }
  const result = new Float64Array(a.rows * b.cols);
  for (let index = 0; index < a.rows; index += 1) {
    for (let k = 0; k < a.cols; k += 1) {
      const aValue = a.data[index * a.cols + k] ?? 0;
      if (aValue === 0) {
        continue;
      }
      for (let index_ = 0; index_ < b.cols; index_ += 1) {
        result[index * b.cols + index_] =
          (result[index * b.cols + index_] ?? 0) + aValue * (b.data[k * b.cols + index_] ?? 0);
      }
    }
  }
  return flintSome({ rows: a.rows, cols: b.cols, data: [...result] });
}

/** Perform d matrix l u operation. */
export function flintDMatrixLU(m: FlintDMatrix): FlintOption<FlintLUDecomposition> {
  if (m.rows !== m.cols) {
    return flintNone();
  }
  const n = m.rows;
  const lu = [...m.data];
  const pivot = Array.from({ length: n }, (_, index) => index);
  let parity = 1;

  for (let index = 0; index < n; index += 1) {
    let maxRow = index;
    let maxValue = Math.abs(lu[index * n + index] ?? 0);

    for (let k = index + 1; k < n; k += 1) {
      const value = Math.abs(lu[k * n + index] ?? 0);
      if (value > maxValue) {
        maxValue = value;
        maxRow = k;
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

      for (let k = 0; k < n; k += 1) {
        const temporary = lu[index * n + k] ?? 0;
        lu[index * n + k] = lu[maxRow * n + k] ?? 0;
        lu[maxRow * n + k] = temporary;
      }
    }

    const diag = lu[index * n + index] ?? 1;
    for (let index_ = index + 1; index_ < n; index_ += 1) {
      lu[index_ * n + index] = (lu[index_ * n + index] ?? 0) / diag;
      const factor = lu[index_ * n + index] ?? 0;
      for (let k = index + 1; k < n; k += 1) {
        lu[index_ * n + k] = (lu[index_ * n + k] ?? 0) - factor * (lu[index * n + k] ?? 0);
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
export function flintDMatrixQR(m: FlintDMatrix): FlintOption<FlintQRDecomposition> {
  const rows = m.rows;
  const cols = m.cols;
  if (rows < cols) {
    return flintNone();
  }

  const qData = new Float64Array(rows * cols);
  const rData = new Float64Array(cols * cols);

  for (let index = 0; index < cols; index += 1) {
    for (let index_ = 0; index_ < rows; index_ += 1) {
      qData[index_ * cols + index] = m.data[index_ * cols + index] ?? 0;
    }

    for (let k = 0; k < index; k += 1) {
      let dot = 0;
      for (let index_ = 0; index_ < rows; index_ += 1) {
        dot += (qData[index_ * cols + k] ?? 0) * (m.data[index_ * cols + index] ?? 0);
      }
      rData[k * cols + index] = dot;
      for (let index_ = 0; index_ < rows; index_ += 1) {
        qData[index_ * cols + index] = (qData[index_ * cols + index] ?? 0) - dot * (qData[index_ * cols + k] ?? 0);
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
export function flintDMatrixCholesky(m: FlintDMatrix): FlintOption<FlintCholeskyDecomposition> {
  if (m.rows !== m.cols) {
    return flintNone();
  }
  const n = m.rows;

  for (let r = 0; r < n; r += 1) {
    for (let c = r + 1; c < n; c += 1) {
      const a = m.data[r * n + c] ?? 0;
      const b = m.data[c * n + r] ?? 0;
      if (Math.abs(a - b) > 1e-7 * Math.max(Math.abs(a), Math.abs(b), 1)) {
        return flintNone(); // Not symmetric
      }
    }
  }

  const l = new Float64Array(n * n);

  for (let index = 0; index < n; index += 1) {
    for (let index_ = 0; index_ <= index; index_ += 1) {
      let sum = 0;
      for (let k = 0; k < index_; k += 1) {
        sum += (l[index * n + k] ?? 0) * (l[index_ * n + k] ?? 0);
      }

      if (index === index_) {
        const value = (m.data[index * n + index] ?? 0) - sum;
        if (value <= FLINT_MATH_EPSILON) {
          return flintNone(); // Not positive definite
        }
        l[index * n + index_] = Math.sqrt(value);
      } else {
        const diag = l[index_ * n + index_] ?? 1;
        if (diag <= FLINT_MATH_EPSILON) {
          return flintNone();
        }
        l[index * n + index_] = ((m.data[index * n + index_] ?? 0) - sum) / diag;
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
  b: FlintDMatrix,
): FlintOption<FlintDMatrix> {
  const n = chol.l.rows;
  if (b.rows !== n) {
    return flintNone();
  }

  const l = chol.l.data;
  const bCols = b.cols;
  const y = new Float64Array(n * bCols);
  const x = new Float64Array(n * bCols);

  // Forward substitution L * y = b
  for (let index = 0; index < n; index += 1) {
    const diag = l[index * n + index] ?? 1;
    if (Math.abs(diag) <= FLINT_MATH_EPSILON) {
      return flintNone();
    }
    for (let c = 0; c < bCols; c += 1) {
      let sum = 0;
      for (let k = 0; k < index; k += 1) {
        sum += (l[index * n + k] ?? 0) * (y[k * bCols + c] ?? 0);
      }
      y[index * bCols + c] = ((b.data[index * bCols + c] ?? 0) - sum) / diag;
    }
  }

  // Back substitution L^T * x = y
  for (let index = n - 1; index >= 0; index -= 1) {
    const diag = l[index * n + index] ?? 1;
    for (let c = 0; c < bCols; c += 1) {
      let sum = 0;
      for (let k = index + 1; k < n; k += 1) {
        sum += (l[k * n + index] ?? 0) * (x[k * bCols + c] ?? 0);
      }
      x[index * bCols + c] = ((y[index * bCols + c] ?? 0) - sum) / diag;
    }
  }

  return flintSome({ rows: n, cols: bCols, data: [...x] });
}

/** Perform d matrix solve operation. */
export function flintDMatrixSolve(a: FlintDMatrix, b: FlintDMatrix): FlintOption<FlintDMatrix> {
  if (a.rows !== a.cols || b.rows !== a.rows) {
    return flintNone();
  }
  const luOpt = flintDMatrixLU(a);
  if (luOpt.kind === 'none' || luOpt.value === undefined) {
    return flintNone();
  }
  const { lu, pivot } = luOpt.value;
  const n = a.rows;
  const bCols = b.cols;

  const x = new Float64Array(n * bCols);
  for (let c = 0; c < bCols; c += 1) {
    for (let index = 0; index < n; index += 1) {
      x[index * bCols + c] = b.data[(pivot[index] ?? index) * bCols + c] ?? 0;
      for (let k = 0; k < index; k += 1) {
        x[index * bCols + c] = (x[index * bCols + c] ?? 0) - (lu.data[index * n + k] ?? 0) * (x[k * bCols + c] ?? 0);
      }
    }

    for (let index = n - 1; index >= 0; index -= 1) {
      for (let k = index + 1; k < n; k += 1) {
        x[index * bCols + c] = (x[index * bCols + c] ?? 0) - (lu.data[index * n + k] ?? 0) * (x[k * bCols + c] ?? 0);
      }
      x[index * bCols + c] = (x[index * bCols + c] ?? 0) / (lu.data[index * n + index] ?? 1);
    }
  }

  return flintSome({ rows: n, cols: bCols, data: [...x] });
}

/** Perform d matrix determinant operation. */
export function flintDMatrixDeterminant(m: FlintDMatrix): FlintOption<number> {
  if (m.rows !== m.cols) {
    return flintNone();
  }
  const luOpt = flintDMatrixLU(m);
  if (luOpt.kind === 'none' || luOpt.value === undefined) {
    return flintSome(0);
  }
  const { lu, parity } = luOpt.value;
  let det = parity;
  for (let index = 0; index < m.rows; index += 1) {
    det *= lu.data[index * m.rows + index] ?? 1;
  }
  return flintSome(det);
}

/** Perform d matrix inverse operation. */
export function flintDMatrixInverse(m: FlintDMatrix): FlintOption<FlintDMatrix> {
  if (m.rows !== m.cols) {
    return flintNone();
  }
  const identity = flintDMatrixIdentity(m.rows);
  return flintDMatrixSolve(m, identity);
}

/** Perform d matrix eigen symmetric operation. */
export function flintDMatrixEigenSymmetric(
  m: FlintDMatrix,
  maxIterations = 100,
  epsilon = FLINT_MATH_EPSILON,
): FlintOption<FlintEigenDecomposition> {
  if (m.rows !== m.cols || m.rows === 0) {
    return flintNone();
  }
  const n = m.rows;

  // Verify symmetry
  for (let r = 0; r < n; r += 1) {
    for (let c = r + 1; c < n; c += 1) {
      const a = m.data[r * n + c] ?? 0;
      const b = m.data[c * n + r] ?? 0;
      if (Math.abs(a - b) > 1e-7 * Math.max(Math.abs(a), Math.abs(b), 1)) {
        return flintNone(); // Not symmetric
      }
    }
  }

  // Copy matrix data
  const a = new Float64Array(m.data);
  const v = new Float64Array(n * n);
  for (let index = 0; index < n; index += 1) {
    v[index * n + index] = 1;
  }

  for (let iter = 0; iter < maxIterations; iter += 1) {
    let offDiagNormSq = 0;
    for (let p = 0; p < n; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        const value = a[p * n + q] ?? 0;
        offDiagNormSq += value * value;
      }
    }

    if (Math.sqrt(offDiagNormSq) <= epsilon) {
      break;
    }

    for (let p = 0; p < n; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        const apq = a[p * n + q] ?? 0;
        if (Math.abs(apq) <= epsilon) {
          continue;
        }

        const app = a[p * n + p] ?? 0;
        const aqq = a[q * n + q] ?? 0;
        const theta = (aqq - app) / (2 * apq);
        const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(1 + theta * theta));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;
        const tau = s / (1 + c);

        a[p * n + p] = app - t * apq;
        a[q * n + q] = aqq + t * apq;
        a[p * n + q] = 0;
        a[q * n + p] = 0;

        for (let k = 0; k < n; k += 1) {
          if (k !== p && k !== q) {
            const akp = a[k * n + p] ?? 0;
            const akq = a[k * n + q] ?? 0;
            const nextAkp = akp - s * (akq + tau * akp);
            const nextAkq = akq + s * (akp - tau * akq);
            a[k * n + p] = nextAkp;
            a[p * n + k] = nextAkp;
            a[k * n + q] = nextAkq;
            a[q * n + k] = nextAkq;
          }
        }

        for (let k = 0; k < n; k += 1) {
          const vkp = v[k * n + p] ?? 0;
          const vkq = v[k * n + q] ?? 0;
          v[k * n + p] = c * vkp - s * vkq;
          v[k * n + q] = s * vkp + c * vkq;
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
  m: FlintDMatrix,
  maxIterations = 100,
  epsilon = FLINT_MATH_EPSILON,
): FlintOption<FlintSVDDecomposition> {
  if (m.rows === 0 || m.cols === 0) {
    return flintNone();
  }

  if (m.rows < m.cols) {
    const transposed = flintDMatrixTranspose(m);
    const svdOpt = flintDMatrixSVD(transposed, maxIterations, epsilon);
    if (svdOpt.kind === 'none' || svdOpt.value === undefined) {
      return flintNone();
    }
    const { u: uTrans, s, vt: vtTrans } = svdOpt.value;
    const uMat = flintDMatrixTranspose(vtTrans);
    const vtMat = flintDMatrixTranspose(uTrans);
    return flintSome({ u: uMat, s, vt: vtMat });
  }

  const rows = m.rows;
  const cols = m.cols;
  const b = new Float64Array(m.data);
  const v = new Float64Array(cols * cols);
  for (let index = 0; index < cols; index += 1) {
    v[index * cols + index] = 1;
  }

  for (let iter = 0; iter < maxIterations; iter += 1) {
    let converged = true;

    for (let index = 0; index < cols; index += 1) {
      for (let k = index + 1; k < cols; k += 1) {
        let alpha = 0;
        let beta = 0;
        let gamma = 0;

        for (let index_ = 0; index_ < rows; index_ += 1) {
          const bj = b[index_ * cols + index] ?? 0;
          const bk = b[index_ * cols + k] ?? 0;
          alpha += bj * bj;
          beta += bk * bk;
          gamma += bj * bk;
        }

        const denom = Math.sqrt(alpha * beta);
        if (denom > epsilon && Math.abs(gamma) / denom > epsilon) {
          converged = false;

          const zeta = (beta - alpha) / (2 * gamma);
          const t = (zeta >= 0 ? 1 : -1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
          const c = 1 / Math.sqrt(1 + t * t);
          const s = t * c;

          for (let index_ = 0; index_ < rows; index_ += 1) {
            const bj = b[index_ * cols + index] ?? 0;
            const bk = b[index_ * cols + k] ?? 0;
            b[index_ * cols + index] = c * bj - s * bk;
            b[index_ * cols + k] = s * bj + c * bk;
          }

          for (let index_ = 0; index_ < cols; index_ += 1) {
            const vj = v[index_ * cols + index] ?? 0;
            const vk = v[index_ * cols + k] ?? 0;
            v[index_ * cols + index] = c * vj - s * vk;
            v[index_ * cols + k] = s * vj + c * vk;
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

        for (let previous = 0; previous < index; previous += 1) {
          let dot = 0;
          for (let index_ = 0; index_ < rows; index_ += 1) {
            dot += (u[index_ * rows + previous] ?? 0) * (vec[index_] ?? 0);
          }
          for (let index_ = 0; index_ < rows; index_ += 1) {
            vec[index_] = (vec[index_] ?? 0) - dot * (u[index_ * rows + previous] ?? 0);
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

  const sortedS = triplets.map((t) => t.s);
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
export function flintDMatrixPseudoinverse(m: FlintDMatrix, epsilon = FLINT_MATH_EPSILON): FlintOption<FlintDMatrix> {
  const svdOpt = flintDMatrixSVD(m, 100, epsilon);
  if (svdOpt.kind === 'none' || svdOpt.value === undefined) {
    return flintNone();
  }
  const { u, s, vt } = svdOpt.value;

  const rows = m.cols;
  const cols = m.rows;
  const kLength = s.length;
  const result = new Float64Array(rows * cols);

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      let sum = 0;
      for (let k = 0; k < kLength; k += 1) {
        const singularValue = s[k] ?? 0;
        if (singularValue > epsilon) {
          const invS = 1 / singularValue;
          const vValue = vt.data[k * rows + r] ?? 0;
          const uValue = u.data[c * cols + k] ?? 0;
          sum += vValue * invS * uValue;
        }
      }
      result[r * cols + c] = sum;
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
export function flintTensorMatmul(a: FlintTensor<number>, b: FlintTensor<number>): FlintOption<FlintTensor<number>> {
  if (a.shape.rank !== 2 || b.shape.rank !== 2) {
    return flintNone();
  }
  const aRows = a.shape.dimensions[0] ?? 0;
  const aCols = a.shape.dimensions[1] ?? 0;
  const bRows = b.shape.dimensions[0] ?? 0;
  const bCols = b.shape.dimensions[1] ?? 0;

  if (aCols !== bRows) {
    return flintNone();
  }

  const dmatA = createFlintDMatrix(aRows, aCols, a.data);
  const dmatB = createFlintDMatrix(bRows, bCols, b.data);
  const resultMatOpt = flintDMatrixMul(dmatA, dmatB);

  if (resultMatOpt.kind === 'none' || resultMatOpt.value === undefined) {
    return flintNone();
  }
  const resultMatrix = resultMatOpt.value;
  const resultShape = createFlintTensorShape([resultMatrix.rows, resultMatrix.cols]);
  return flintSome({ shape: resultShape, data: resultMatrix.data });
}

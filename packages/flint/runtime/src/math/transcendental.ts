import { flintNone, flintSome, type FlintOption } from '../collections.js';

import { FLINT_MATH_EPSILON } from './ieee754.js';
import {
  type FlintMat4,
  type FlintQuat,
  type FlintVec2,
  type FlintVec3,
  flintQuatIdentity,
  flintQuatRotateVec3,
  flintVec2DistanceSquared,
  flintVec2Normalize,
  flintVec3Add,
  flintVec3Cross,
  flintVec3DistanceSquared,
  flintVec3Dot,
  flintVec3Length,
  flintVec3Normalize,
  flintVec3Scale,
  flintVec3Sub,
} from './vector.js';

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

/** Check whether a value falls within the inclusive interval [minimum, maximum]. */
function isValueInRange(value: number, minimum: number, maximum: number): boolean {
  return value >= minimum && value <= maximum;
}

/** Check whether two 1D intervals [minA, maxA] and [minB, maxB] overlap. */
function areIntervalsOverlapping(minA: number, maxA: number, minB: number, maxB: number): boolean {
  return minA <= maxB && maxA >= minB;
}

/** Perform a a b b 3 contains point operation. */
export function flintAABB3ContainsPoint(box: FlintAABB3, point: FlintVec3): boolean {
  return (
    isValueInRange(point.x, box.min.x, box.max.x) &&
    isValueInRange(point.y, box.min.y, box.max.y) &&
    isValueInRange(point.z, box.min.z, box.max.z)
  );
}

/** Perform a a b b 3 intersects a a b b 3 operation. */
export function flintAABB3IntersectsAABB3(first: FlintAABB3, second: FlintAABB3): boolean {
  return (
    areIntervalsOverlapping(first.min.x, first.max.x, second.min.x, second.max.x) &&
    areIntervalsOverlapping(first.min.y, first.max.y, second.min.y, second.max.y) &&
    areIntervalsOverlapping(first.min.z, first.max.z, second.min.z, second.max.z)
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

/** Create a normalized plane from matrix row combinations. */
function createNormalizedFrustumPlane(normalVec: FlintVec3, rawDistribution: number): FlintPlane3 {
  const length = flintVec3Length(normalVec) || 1;
  return {
    normal: { x: normalVec.x / length, y: normalVec.y / length, z: normalVec.z / length },
    distance: rawDistribution / length,
  };
}

/** Perform frustum from view proj operation. */
export function flintFrustumFromViewProj(viewProj: FlintMat4): FlintFrustum {
  const elements = [
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
  return {
    left: createNormalizedFrustumPlane(
      { x: elements[3] + elements[0], y: elements[7] + elements[4], z: elements[11] + elements[8] },
      elements[15] + elements[12],
    ),
    right: createNormalizedFrustumPlane(
      { x: elements[3] - elements[0], y: elements[7] - elements[4], z: elements[11] - elements[8] },
      elements[15] - elements[12],
    ),
    bottom: createNormalizedFrustumPlane(
      { x: elements[3] + elements[1], y: elements[7] + elements[5], z: elements[11] + elements[9] },
      elements[15] + elements[13],
    ),
    top: createNormalizedFrustumPlane(
      { x: elements[3] - elements[1], y: elements[7] - elements[5], z: elements[11] - elements[9] },
      elements[15] - elements[13],
    ),
    near: createNormalizedFrustumPlane(
      { x: elements[3] + elements[2], y: elements[7] + elements[6], z: elements[11] + elements[10] },
      elements[15] + elements[14],
    ),
    far: createNormalizedFrustumPlane(
      { x: elements[3] - elements[2], y: elements[7] - elements[6], z: elements[11] - elements[10] },
      elements[15] - elements[14],
    ),
  };
}

/** Perform frustum intersects sphere operation. */
export function flintFrustumIntersectsSphere(frustum: FlintFrustum, sphere: FlintSphere): boolean {
  const planes = [frustum.left, frustum.right, frustum.bottom, frustum.top, frustum.near, frustum.far];
  return planes.every((plane) => flintPlane3DistanceToPoint(plane, sphere.center) >= -sphere.radius);
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

interface SlabInterval {
  readonly valid: boolean;
  readonly tmin: number;
  readonly tmax: number;
}

/** Compute 1D ray slab clipping interval along a single coordinate axis. */
function computeAxisSlabInterval(
  origin: number,
  axisDirection: number,
  minimum: number,
  maximum: number,
): SlabInterval {
  if (Math.abs(axisDirection) <= FLINT_MATH_EPSILON) {
    return { valid: origin >= minimum && origin <= maximum, tmin: -Infinity, tmax: Infinity };
  }
  const timeA = (minimum - origin) / axisDirection;
  const timeB = (maximum - origin) / axisDirection;
  return {
    valid: true,
    tmin: Math.min(timeA, timeB),
    tmax: Math.max(timeA, timeB),
  };
}

/** Intersect a 3D ray with an Axis-Aligned Bounding Box (AABB) using slab clipping. */
function intersectRayAABBInterval(
  ray: FlintRay3,
  box: FlintAABB3,
): { readonly hit: boolean; readonly tmin: number; readonly tmax: number } {
  let currentTmin = -Infinity;
  let currentTmax = Infinity;
  const dimensions: readonly ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];
  for (const axis of dimensions) {
    const slab = computeAxisSlabInterval(ray.origin[axis], ray.direction[axis], box.min[axis], box.max[axis]);
    if (!slab.valid) {
      return { hit: false, tmin: currentTmin, tmax: currentTmax };
    }
    currentTmin = Math.max(currentTmin, slab.tmin);
    currentTmax = Math.min(currentTmax, slab.tmax);
    if (currentTmin > currentTmax || currentTmax < 0) {
      return { hit: false, tmin: currentTmin, tmax: currentTmax };
    }
  }
  return { hit: true, tmin: currentTmin, tmax: currentTmax };
}

/** Perform ray 3 intersects a a b b 3 operation. */
export function flintRay3IntersectsAABB3(ray: FlintRay3, box: FlintAABB3): FlintOption<number> {
  const result = intersectRayAABBInterval(ray, box);
  if (!result.hit) {
    return flintNone();
  }
  const resultDistance = result.tmin >= 0 ? result.tmin : result.tmax;
  return resultDistance >= 0 ? flintSome(resultDistance) : flintNone();
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

/** Validate barycentric coordinates within triangle bounds. */
function isValidBarycentric(baryU: number, baryV: number): boolean {
  return baryU >= 0 && baryV >= 0 && baryU + baryV <= 1;
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
  const qvec = flintVec3Cross(tvec, edge1);
  const baryV = flintVec3Dot(ray.direction, qvec) * invDet;

  if (!isValidBarycentric(baryU, baryV)) {
    return flintNone();
  }
  const hitT = flintVec3Dot(edge2, qvec) * invDet;
  return hitT >= 0 ? flintSome(hitT) : flintNone();
}

/** Compute 1D ray clipping interval against an Oriented Bounding Box axis. */
function computeOBBSlabInterval(
  centerOffsetDistance: number,
  directionDotAxis: number,
  halfExtent: number,
): SlabInterval {
  if (Math.abs(directionDotAxis) <= FLINT_MATH_EPSILON) {
    return { valid: Math.abs(centerOffsetDistance) <= halfExtent, tmin: -Infinity, tmax: Infinity };
  }
  const timeA = (centerOffsetDistance - halfExtent) / directionDotAxis;
  const timeB = (centerOffsetDistance + halfExtent) / directionDotAxis;
  return {
    valid: true,
    tmin: Math.min(timeA, timeB),
    tmax: Math.max(timeA, timeB),
  };
}

/** Test ray against a single OBB local coordinate axis. */
function testOBBAxis(
  axis: FlintVec3,
  halfExtent: number,
  centerOffset: FlintVec3,
  rayDirection: FlintVec3,
): SlabInterval {
  const centerOffsetDistance = flintVec3Dot(axis, centerOffset);
  const directionDotAxis = flintVec3Dot(axis, rayDirection);
  return computeOBBSlabInterval(centerOffsetDistance, directionDotAxis, halfExtent);
}

/** Extract local coordinate axes of an Oriented Bounding Box. */
function extractOBBAxes(orientation: FlintQuat): readonly [FlintVec3, FlintVec3, FlintVec3] {
  return [
    flintQuatRotateVec3(orientation, { x: 1, y: 0, z: 0 }),
    flintQuatRotateVec3(orientation, { x: 0, y: 1, z: 0 }),
    flintQuatRotateVec3(orientation, { x: 0, y: 0, z: 1 }),
  ];
}

/** Extract half extents from an OBB struct. */
function extractOBBExtents(obb: FlintOBB3): readonly [number, number, number] {
  const halfExtension = obb.halfExtents ?? obb.half_extents ?? { x: 0, y: 0, z: 0 };
  return [halfExtension.x, halfExtension.y, halfExtension.z];
}

/** Update running slab interval with a single axis interval, returning false if invalid. */
function clipSlabInterval(running: { tmin: number; tmax: number }, slab: SlabInterval): boolean {
  if (!slab.valid) {
    return false;
  }
  const nextMin = Math.max(running.tmin, slab.tmin);
  const nextMax = Math.min(running.tmax, slab.tmax);
  if (nextMin > nextMax) {
    return false;
  }
  running.tmin = nextMin;
  running.tmax = nextMax;
  return true;
}

/** Intersect ray with three OBB slabs and return bounded interval. */
function intersectOBBSlabs(
  axes: readonly [FlintVec3, FlintVec3, FlintVec3],
  extents: readonly [number, number, number],
  centerOffset: FlintVec3,
  rayDirection: FlintVec3,
): { readonly hit: boolean; readonly tmin: number; readonly tmax: number } {
  const running = { tmin: -Infinity, tmax: Infinity };
  for (let index = 0; index < 3; index += 1) {
    const slab = testOBBAxis(axes[index], extents[index] ?? 0, centerOffset, rayDirection);
    if (!clipSlabInterval(running, slab)) {
      return { hit: false, tmin: 0, tmax: 0 };
    }
  }
  if (running.tmax < 0) {
    return { hit: false, tmin: 0, tmax: 0 };
  }
  return { hit: true, tmin: running.tmin, tmax: running.tmax };
}

/** Resolve final hit distance from 1D ray interval. */
function resolveIntervalDistance(tmin: number, tmax: number): FlintOption<number> {
  const resultT = tmin >= 0 ? tmin : tmax;
  return resultT >= 0 ? flintSome(resultT) : flintNone();
}

/** Perform ray 3 intersect o b b operation. */
export function flintRay3IntersectOBB(ray: FlintRay3, obb: FlintOBB3): FlintOption<number> {
  const axes = extractOBBAxes(obb.orientation);
  const extents = extractOBBExtents(obb);
  const centerOffset = flintVec3Sub(obb.center, ray.origin);
  const interval = intersectOBBSlabs(axes, extents, centerOffset, ray.direction);
  if (!interval.hit) {
    return flintNone();
  }
  return resolveIntervalDistance(interval.tmin, interval.tmax);
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
    minX = Math.min(minX, item.box.min.x);
    minY = Math.min(minY, item.box.min.y);
    minZ = Math.min(minZ, item.box.min.z);
    maxX = Math.max(maxX, item.box.max.x);
    maxY = Math.max(maxY, item.box.max.y);
    maxZ = Math.max(maxZ, item.box.max.z);
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

/** Determine the axis with the largest spatial extent across primitives. */
function findLongestCenterAxis(list: readonly FlintBVHPrim[]): 'x' | 'y' | 'z' {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const item of list) {
    minX = Math.min(minX, item.center.x);
    minY = Math.min(minY, item.center.y);
    minZ = Math.min(minZ, item.center.z);
    maxX = Math.max(maxX, item.center.x);
    maxY = Math.max(maxY, item.center.y);
    maxZ = Math.max(maxZ, item.center.z);
  }

  const extents = [
    { axis: 'x' as const, extent: maxX - minX },
    { axis: 'y' as const, extent: maxY - minY },
    { axis: 'z' as const, extent: maxZ - minZ },
  ];
  extents.sort((first, second) => second.extent - first.extent);
  return extents[0]?.axis ?? 'x';
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

    const axis = findLongestCenterAxis(list);
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

/** Compute surface normal of an AABB bounding box at a given hit point. */
function computeAABBSurfaceNormal(hitPoint: FlintVec3, bounds: FlintAABB3, rayDirection: FlintVec3): FlintVec3 {
  const epsilon = 1e-5;
  const faces: readonly { readonly diff: number; readonly normal: FlintVec3 }[] = [
    { diff: Math.abs(hitPoint.x - bounds.min.x), normal: { x: -1, y: 0, z: 0 } },
    { diff: Math.abs(hitPoint.x - bounds.max.x), normal: { x: 1, y: 0, z: 0 } },
    { diff: Math.abs(hitPoint.y - bounds.min.y), normal: { x: 0, y: -1, z: 0 } },
    { diff: Math.abs(hitPoint.y - bounds.max.y), normal: { x: 0, y: 1, z: 0 } },
    { diff: Math.abs(hitPoint.z - bounds.min.z), normal: { x: 0, y: 0, z: -1 } },
    { diff: Math.abs(hitPoint.z - bounds.max.z), normal: { x: 0, y: 0, z: 1 } },
  ];
  const matched = faces.find((face) => face.diff < epsilon);
  return matched ? matched.normal : flintVec3Scale(rayDirection, -1);
}

interface BVHHitCandidate {
  readonly primitiveIndex: number;
  readonly distance: number;
}

/** Push a single child index onto the BVH traversal stack if valid. */
function pushValidChild(childIndex: number | undefined, stack: number[]): void {
  if (childIndex !== undefined && childIndex >= 0) {
    stack.push(childIndex);
  }
}

/** Push valid BVH child indices onto the traversal stack. */
function pushBVHChildren(node: FlintBVHNode3, stack: number[]): void {
  pushValidChild(node.rightChild ?? node.right_child, stack);
  pushValidChild(node.leftChild ?? node.left_child, stack);
}

/** Extract primitive index from BVH node if present and valid. */
function extractNodePrimitiveIndex(node: FlintBVHNode3): number | undefined {
  const primitiveIndex = node.primitiveIndex ?? node.primitive_index;
  return primitiveIndex !== undefined && primitiveIndex >= 0 ? primitiveIndex : undefined;
}

/** Check if ray intersection with node bounds is closer than current closest hit. */
function isIntersectionCloser(
  intersection: { readonly hit: boolean; readonly tmin: number },
  closestT: number,
): boolean {
  return intersection.hit && Math.max(0, intersection.tmin) < closestT;
}

/** Test ray intersection against a single BVH node and update traversal stack. */
function processBVHNode(
  node: FlintBVHNode3,
  ray: FlintRay3,
  closestT: number,
  stack: number[],
): BVHHitCandidate | undefined {
  const intersection = intersectRayAABBInterval(ray, node.bounds);
  if (!isIntersectionCloser(intersection, closestT)) {
    return undefined;
  }
  const primitiveIndex = extractNodePrimitiveIndex(node);
  if (primitiveIndex !== undefined) {
    return { primitiveIndex, distance: Math.max(0, intersection.tmin) };
  }
  pushBVHChildren(node, stack);
  return undefined;
}

/** Construct a ray hit result for closest BVH primitive intersection. */
function createBVHRayHit(ray: FlintRay3, closestT: number, closestPrim: number, bounds: FlintAABB3): FlintRayHit3 {
  const closestPoint = flintVec3Add(ray.origin, flintVec3Scale(ray.direction, closestT));
  const closestNormal = computeAABBSurfaceNormal(closestPoint, bounds, ray.direction);
  return {
    hit: true,
    t: closestT,
    point: closestPoint,
    normal: closestNormal,
    primitiveId: closestPrim,
    primitive_id: closestPrim,
  };
}

/** Get root index of BVH tree. */
function getBVHRootIndex(tree: FlintBVHTree3): number {
  return tree.rootIndex ?? tree.root_index ?? 0;
}

/** Traverse BVH stack to find the closest primitive hit. */
function traverseBVHStack(
  nodes: readonly FlintBVHNode3[],
  ray: FlintRay3,
  rootIndex: number,
): { closestT: number; closestPrim: number; closestBounds: FlintAABB3 | undefined } {
  let closestT = Infinity;
  let closestPrim = -1;
  let closestBounds: FlintAABB3 | undefined;
  const stack: number[] = [rootIndex];

  while (stack.length > 0) {
    const nodeIndex = stack.pop();
    const node = typeof nodeIndex === 'number' ? nodes[nodeIndex] : undefined;
    if (node) {
      const hit = processBVHNode(node, ray, closestT, stack);
      if (hit) {
        closestT = hit.distance;
        closestPrim = hit.primitiveIndex;
        closestBounds = node.bounds;
      }
    }
  }
  return { closestT, closestPrim, closestBounds };
}

/** Perform b v h ray intersect operation. */
export function flintBVHRayIntersect(tree: FlintBVHTree3, ray: FlintRay3): FlintOption<FlintRayHit3> {
  if (tree.nodes.length === 0) {
    return flintNone();
  }
  const { closestT, closestPrim, closestBounds } = traverseBVHStack(tree.nodes, ray, getBVHRootIndex(tree));

  if (closestPrim >= 0 && closestBounds) {
    return flintSome(createBVHRayHit(ray, closestT, closestPrim, closestBounds));
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

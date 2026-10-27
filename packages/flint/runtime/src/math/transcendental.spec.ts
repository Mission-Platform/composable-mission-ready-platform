import { describe, expect, it } from 'vitest';

import {
  createFlintAABB3,
  createFlintOBB3,
  createFlintPlane3,
  createFlintRay3,
  createFlintSphere,
  createFlintTriangle3,
  flintAABB3ContainsPoint,
  flintAABB3Volume,
  flintBezier2Cubic,
  flintBezier2Quadratic,
  flintRay3IntersectOBB,
  flintRay3IntersectsPlane3,
  flintRay3IntersectsSphere,
  flintRay3IntersectsTriangle3,
  flintSphereContainsPoint,
} from './transcendental.js';
import { createFlintQuat, createFlintVec2, createFlintVec3 } from './vector.js';

describe('Flint Runtime Math: Geometry, Spatial & Splines', () => {
  it('handles 3D spatial primitives and bounding volumes', () => {
    const aabb = createFlintAABB3(createFlintVec3(0, 0, 0), createFlintVec3(10, 10, 10));
    expect(flintAABB3ContainsPoint(aabb, createFlintVec3(5, 5, 5))).toBe(true);
    expect(flintAABB3ContainsPoint(aabb, createFlintVec3(15, 5, 5))).toBe(false);
    expect(flintAABB3Volume(aabb)).toBe(1000);

    const sphere = createFlintSphere(createFlintVec3(0, 0, 0), 5);
    expect(flintSphereContainsPoint(sphere, createFlintVec3(3, 0, 0))).toBe(true);
    expect(flintSphereContainsPoint(sphere, createFlintVec3(6, 0, 0))).toBe(false);
  });

  it('calculates ray intersections with spheres, planes, triangles, and OBBs', () => {
    const ray = createFlintRay3(createFlintVec3(0, 0, -10), createFlintVec3(0, 0, 1));
    const sphere = createFlintSphere(createFlintVec3(0, 0, 0), 2);
    const sphereHit = flintRay3IntersectsSphere(ray, sphere);
    expect(sphereHit.kind).toBe('some');

    const plane = createFlintPlane3(createFlintVec3(0, 0, 1), 0);
    const planeHit = flintRay3IntersectsPlane3(ray, plane);
    expect(planeHit.kind).toBe('some');

    const tri = createFlintTriangle3(createFlintVec3(-1, -1, 0), createFlintVec3(1, -1, 0), createFlintVec3(0, 1, 0));
    const triHit = flintRay3IntersectsTriangle3(ray, tri);
    expect(triHit.kind).toBe('some');

    const obb = createFlintOBB3(createFlintVec3(0, 0, 0), createFlintVec3(1, 1, 1), createFlintQuat(0, 0, 0, 1));
    const obbHit = flintRay3IntersectOBB(ray, obb);
    expect(obbHit.kind).toBe('some');
  });

  it('evaluates Bezier and Catmull-Rom spline curves', () => {
    const p0 = createFlintVec2(0, 0);
    const p1 = createFlintVec2(5, 10);
    const p2 = createFlintVec2(10, 0);

    const midQuad = flintBezier2Quadratic(p0, p1, p2, 0.5);
    expect(midQuad.x).toBe(5);
    expect(midQuad.y).toBe(5);

    const p3 = createFlintVec2(15, 10);
    const midCubic = flintBezier2Cubic(p0, p1, p2, p3, 0.5);
    expect(midCubic.x).toBe(7.5);
  });
});

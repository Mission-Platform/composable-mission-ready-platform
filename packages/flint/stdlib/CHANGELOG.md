# @mission-platform/flint-stdlib

## 1.0.0

### Major Changes

- 94a694a: migrate Forge Web Script (FWS) packages and downstream integrations to Flint
  
  BREAKING CHANGE: The systems programming language formerly known as Forge Web Script (FWS) is now Flint. All package names have migrated to `@mission-platform/flint*`, primary source files now use `.flint` (with `.flt` supported as compact), diagnostic codes now emit `FLINT-*` prefixes, and compiler executables have been renamed to `flint` and `flint-lsp`.

### Minor Changes

- 9e54a30: Implement Flint math standard library optimizations and extended mathematical capabilities:
  - Vector-composed matrix structs (`Mat2`, `Mat3`, `Mat4`) for zero-heap stack allocation and SIMD-friendly layout.
  - Degenerate geometry guards and defensive normalization routines preventing division-by-zero/NaN propagation.
  - Robust scalar `floor`, `ceil`, and `fract` standard implementations.
  - Viewing Frustum extraction and 3D bounding sphere culling.
  - Ray intersections (Plane, Sphere, AABB, Triangle via Möller-Trumbore).
  - Bézier and Catmull-Rom spline curves.
  - Color space representations and conversions (sRGB, Linear, HSV, perceptual Oklab interpolation).
  - Cholesky decomposition ($A = L L^T$) and linear solver for symmetric positive-definite systems.
  - In-place dynamic matrix mutation routines (`dmat_set`, `dmat_add_inplace`, `dmat_sub_inplace`, `dmat_scale_inplace`, `dmat_mul_accumulate`) eliminating heap reallocations.
  - Strided zero-copy sub-tensor views and multi-dimensional slicing (`TensorView<T>`, `tensor_view`, `tensor_slice`, `tensor_view_get`).
  - Singular Value Decomposition (SVD), symmetric eigenvalue/eigenvector factorization (Jacobi algorithm), and Moore-Penrose pseudoinverse.
  - 3D spatial acceleration structures with Ray-OBB intersections (`ray3_intersect_obb`) and Bounding Volume Hierarchy construction and ray traversal (`BVHTree3`, `bvh_build_from_aabbs`, `bvh_ray_intersect`).
  - Tensor striding and 2D matrix multiplication.

### Patch Changes

- 8be0da7: optimize turbo pipeline, standardize type-check task, and consolidate package build scripts
- Updated dependencies [26de5ea]
- Updated dependencies [6c683ae]
- Updated dependencies [94a694a]
- Updated dependencies [f3b344d]
- Updated dependencies [9e54a30]
- Updated dependencies [6c683ae]
- Updated dependencies [8be0da7]
  - @mission-platform/flint-runtime@1.0.0

## 0.2.2

### Patch Changes

- cb5f5ca: configure packages for public access
- Updated dependencies [cb5f5ca]
  - @mission-platform/flint-runtime@0.3.1

## 0.2.1
### Patch Changes

- 7e3cc9d: ignore generated package files during formatting
- Updated dependencies [7788642]
- Updated dependencies [ff73b42]
  - @mission-platform/flint-runtime@0.3.0

## 0.2.0

### Minor Changes

- 9774a09: add the Forge Web Script compiler, runtime, language tooling, and test harness

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- e0c66e1: update package build task dependencies
- Updated dependencies [c32bb83]
- Updated dependencies [9996e65]
- Updated dependencies [9774a09]
- Updated dependencies [e0c66e1]
  - @mission-platform/flint-runtime@0.2.0

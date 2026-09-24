---
"@mission-platform/flint-runtime": minor
"@mission-platform/flint-stdlib": minor
---

Implement Flint math standard library optimizations and extended mathematical capabilities:
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

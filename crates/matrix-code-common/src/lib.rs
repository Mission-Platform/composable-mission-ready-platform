//! Shared 2D matrix barcode primitives used by both the encoder and the
//! decoder.
//!
//! This holds the Reed-Solomon error-correction arithmetic — the GF(256)
//! variant ([`reed_solomon`]) that Data Matrix ECC 200 builds on, and the
//! configurable GF(2^m) variant ([`galois`]) that Aztec Code needs across its
//! GF(16) / GF(64) / GF(256) / GF(1024) / GF(4096) fields — plus the shared
//! Data Matrix data-region layout maths ([`datamatrix_layout`]). It lives here
//! so the `mission-platform-matrix-code-encode` and
//! `mission-platform-matrix-code-decode` crates share exactly one
//! implementation.

pub mod datamatrix_layout;
pub mod galois;
pub mod reed_solomon;

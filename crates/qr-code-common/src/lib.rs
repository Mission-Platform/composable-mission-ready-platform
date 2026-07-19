//! Shared QR Code primitives used by both the encoder and the decoder.
//!
//! This crate holds the parts of the ISO/IEC 18004 pipeline that are common to
//! encoding and decoding — the version/capacity tables ([`tables`]), the
//! Reed-Solomon / Galois-field arithmetic ([`gf`]) and the matrix builder that
//! draws the function patterns and lays out data modules ([`builder`]). The
//! `mission-platform-qr-code-encode` and `mission-platform-qr-code-decode`
//! crates depend on it so the shared logic lives in exactly one place.

pub mod builder;
pub mod gf;
pub mod micro_qr;
pub mod rmqr;
pub mod tables;

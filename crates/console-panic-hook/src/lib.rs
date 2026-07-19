//! A tiny panic hook that reports Rust panic messages through `tracing::error!`.
//!
//! This is an in-house replacement for the archived, unmaintained
//! `console_error_panic_hook` crate. It installs (at most once) a panic hook
//! that formats the panic payload and location and emits it as a `tracing`
//! error event — so whatever subscriber the host installs (e.g. `tracing-wasm`,
//! which forwards to `console.error`) surfaces readable diagnostics for
//! `wasm32-unknown-unknown` builds where the default hook prints nothing useful.

use std::panic;
use std::sync::Once;

// Build-time metadata captured by `shadow-rs` (see `build.rs`): crate version,
// git commit, build timestamp, Rust toolchain, …
shadow_rs::shadow!(build);

/// A human-readable build stamp: `"<version> (<commit>) built <time> with <rustc>"`.
/// Sourced from `shadow-rs` build-time information.
// #[wasm_bindgen]
// #[tracing::instrument(skip_all)]
// pub fn build_info() -> String {
//     format!(
//         "{} ({}) built {} with {}",
//         build::PKG_VERSION,
//         build::SHORT_COMMIT,
//         build::BUILD_TIME,
//         build::RUST_VERSION,
//     )
// }

static SET_HOOK: Once = Once::new();

/// The panic hook: emit the panic message + location as a `tracing` error event.
#[tracing::instrument(skip_all)]
fn hook(info: &panic::PanicHookInfo<'_>) {
    tracing::error!("{info}");
}

/// Install the console panic hook. Safe to call repeatedly — only the first
/// call takes effect, so it is a no-op on subsequent calls.
#[tracing::instrument(skip_all)]
pub fn set_once() {
    SET_HOOK.call_once(|| {
        panic::set_hook(Box::new(hook));
    });
}

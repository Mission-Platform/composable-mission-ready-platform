// Capture build-time information (crate version, git commit, build timestamp,
// Rust toolchain, …) via `shadow-rs`. The generated `shadow.rs` is included by
// `shadow_rs::shadow!(build)` in `src/lib.rs` and surfaced through `build_info`.

fn main() {
    shadow_rs::ShadowBuilder::builder()
        .build()
        .expect("shadow-rs should generate build information");
}

//! Temporary Step-4 triage tool: measure how many real ZXING corpus PDF417
//! images decode correctly at rotation 0.
//!
//! Run with:
//! ```text
//! cargo test -p mission-platform-code-scan --release \
//!   --test pdf417_diag diag -- --ignored --nocapture
//! ```

#![cfg(not(target_arch = "wasm32"))]

use std::fs;

use mission_platform_code_scan::scan_and_decode;

#[path = "support/png.rs"]
mod png;

const CORPUS: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/zxing-blackbox");

#[test]
#[ignore = "diagnostic; run with --ignored --nocapture"]
fn diag() {
    for folder in ["pdf417-1", "pdf417-2", "pdf417-3", "pdf417-4"] {
        let dir = format!("{CORPUS}/{folder}");
        let mut pngs: Vec<std::path::PathBuf> = fs::read_dir(&dir)
            .unwrap()
            .filter_map(|e| {
                let p = e.ok()?.path();
                (p.extension().and_then(|x| x.to_str()) == Some("png")).then_some(p)
            })
            .collect();
        pngs.sort();

        let mut ok = 0usize;
        let mut wrong = 0usize;
        let mut miss = 0usize;
        let total = pngs.len();
        for p in &pngs {
            let Ok(expected) = fs::read_to_string(p.with_extension("txt")) else {
                continue;
            };
            let expected = expected.trim().to_string();
            let (w, h, luma) = png::load_png_luma(p.to_str().unwrap());
            match scan_and_decode(w, h, &luma).and_then(|o| o.value()) {
                Some(v) if v == expected => ok += 1,
                Some(v) => {
                    wrong += 1;
                    let name = p.file_name().unwrap().to_str().unwrap();
                    println!("{folder}/{name}: WRONG got={v:?} want={expected:?}");
                }
                None => {
                    miss += 1;
                    let name = p.file_name().unwrap().to_str().unwrap();
                    println!("{folder}/{name}: MISS want={expected:?}");
                }
            }
        }
        println!("== {folder}: {ok}/{total} OK, {wrong} wrong, {miss} miss ==");
    }
}

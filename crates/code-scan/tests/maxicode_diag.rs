//! Diagnostic: report how many MaxiCode corpus images decode to their sidecar
//! value at each rotation. Not a pass/fail gate (the blackbox baseline is), just
//! a `--nocapture` readout used while tuning the locator.

#![cfg(not(target_arch = "wasm32"))]

use std::fs;
use std::path::Path;

use mission_platform_code_scan::scan_and_decode;

#[path = "support/png.rs"]
mod png;

const CORPUS: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/zxing-blackbox");

fn expected_value(png_path: &Path) -> Option<String> {
    let txt = png_path.with_extension("txt");
    let raw = fs::read_to_string(&txt).ok()?;
    Some(raw.trim_end_matches(['\r', '\n']).to_string())
}

#[test]
#[ignore = "diagnostic; run with --ignored --nocapture"]
fn diag() {
    let dir = format!("{CORPUS}/maxicode-1");
    let mut pngs: Vec<std::path::PathBuf> = fs::read_dir(&dir)
        .unwrap()
        .filter_map(|e| {
            let p = e.ok()?.path();
            (p.extension().and_then(|x| x.to_str()) == Some("png")).then_some(p)
        })
        .collect();
    pngs.sort();

    let mut total_ok = 0usize;
    for p in &pngs {
        let Some(expected) = expected_value(p) else {
            continue;
        };
        let (w, h, luma) = png::load_png_luma(p.to_str().unwrap());
        let mut oks = [false; 4];
        for (slot, rot) in [0u8, 1, 2, 3].iter().enumerate() {
            let (rw, rh, rl) = png::rotate(*rot, w, h, &luma);
            let out = scan_and_decode(rw, rh, &rl).and_then(|o| o.value());
            oks[slot] = out.as_deref() == Some(expected.as_str());
            if oks[slot] {
                total_ok += 1;
            }
        }
        println!(
            "{:32} {}x{}  rot[0/90/180/270] = {} {} {} {}",
            p.file_name().unwrap().to_str().unwrap(),
            w,
            h,
            oks[0] as u8,
            oks[1] as u8,
            oks[2] as u8,
            oks[3] as u8
        );
    }
    println!("== maxicode-1 total correct across rotations: {total_ok}");
}

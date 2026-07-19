//! ZXING-style black-box corpus harness.
//!
//! Runs the whole native `scan_and_decode` pipeline over the vendored ZXING
//! `blackbox` corpus (see `tests/fixtures/zxing-blackbox/ATTRIBUTION.md`) at the
//! four quarter-turn rotations ZXING itself tests (0°/90°/180°/270°), and tallies
//! how many images in each symbology folder decode to their `.txt` sidecar value.
//!
//! Like ZXING's own `AbstractBlackBoxTestCase`, it does **not** demand 100%: it
//! compares the per-folder, per-rotation pass counts against a committed baseline
//! (`tests/blackbox_baseline.toml`) and fails only on a *regression* below it, so
//! unfixable outliers never block progress while every genuine win is measured.
//! Formats the pipeline cannot yet read (PDF417, GS1 DataBar/RSS, MaxiCode) start
//! at a baseline of 0 and rise as their decoders land.
//!
//! The `falsepositives*` and `unsupported` folders are the inverse guard: their
//! images must **not** decode, so their baseline is a *ceiling* on false
//! positives rather than a floor on passes.
//!
//! Regenerate the baseline after an intended change with:
//! ```text
//! BLACKBOX_WRITE_BASELINE=1 cargo test -p mission-platform-code-scan --release --test blackbox
//! ```
//! The full sweep is heavy in a debug build, so it is `#[ignore]` by default and
//! run explicitly (release) in CI; a small `blackbox_smoke` subset runs always.

#![cfg(not(target_arch = "wasm32"))]

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use mission_platform_code_scan::scan_and_decode;

#[path = "support/png.rs"]
mod png;

/// Root of the vendored ZXING blackbox corpus.
const CORPUS: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/zxing-blackbox");
/// Committed per-folder baseline pass counts.
const BASELINE: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/blackbox_baseline.toml");

/// The four ZXING rotation indices (0°/90°/180°/270°) and their TOML keys.
const ROTATIONS: [(u8, &str); 4] = [(0, "rot0"), (1, "rot90"), (2, "rot180"), (3, "rot270")];

/// Per-folder tallies: for a positive folder these are correct-decode counts per
/// rotation (higher is better); for a negative folder they are false-positive
/// counts (lower is better).
type Tally = [usize; 4];

/// Whether a folder holds symbols that should decode (`Positive`) or images that
/// must not decode (`Negative`).
#[derive(Clone, Copy, PartialEq)]
enum Kind {
    Positive,
    Negative,
}

/// Classify a corpus folder. `falsepositives*` and `unsupported` are the
/// no-decode guard; every other folder is scored positively against its
/// sidecars (folders without sidecars — `multi-*`, `partial` — simply contribute
/// no scored images and are skipped).
fn classify(folder: &str) -> Kind {
    if folder.starts_with("falsepositives") || folder == "unsupported" {
        Kind::Negative
    } else {
        Kind::Positive
    }
}

/// Read the expected value for `image.png` from its sibling `image.txt`, trimming
/// only the trailing newline the sidecars carry. `None` when there is no sidecar.
fn expected_value(png_path: &Path) -> Option<String> {
    let txt = png_path.with_extension("txt");
    let raw = fs::read_to_string(&txt).ok()?;
    Some(raw.trim_end_matches(['\r', '\n']).to_string())
}

/// List the immediate sub-directories of the corpus, sorted.
fn corpus_folders() -> Vec<String> {
    let mut folders: Vec<String> = fs::read_dir(CORPUS)
        .unwrap_or_else(|e| panic!("read corpus {CORPUS}: {e}"))
        .filter_map(|entry| {
            let entry = entry.ok()?;
            if entry.file_type().ok()?.is_dir() {
                entry.file_name().into_string().ok()
            } else {
                None
            }
        })
        .collect();
    folders.sort();
    folders
}

/// The `*.png` files in a folder, sorted by name.
fn folder_pngs(folder: &str) -> Vec<std::path::PathBuf> {
    let dir = format!("{CORPUS}/{folder}");
    let mut pngs: Vec<std::path::PathBuf> = fs::read_dir(&dir)
        .unwrap_or_else(|e| panic!("read folder {dir}: {e}"))
        .filter_map(|entry| {
            let path = entry.ok()?.path();
            (path.extension().and_then(|e| e.to_str()) == Some("png")).then_some(path)
        })
        .collect();
    pngs.sort();
    pngs
}

/// Whether a decode result matches the expected value.
fn decodes_to(width: usize, height: usize, luma: &[u8], expected: &str) -> bool {
    scan_and_decode(width, height, luma)
        .and_then(|o| o.value())
        .is_some_and(|v| v == expected)
}

/// Whether a scan produced any decoded value at all (a false positive on a
/// negative image).
fn decodes_anything(width: usize, height: usize, luma: &[u8]) -> bool {
    scan_and_decode(width, height, luma)
        .and_then(|o| o.value())
        .is_some()
}

/// Run one folder over all four rotations, returning its tally and its kind.
/// Positive folders count correct decodes; negative folders count any decode.
fn run_folder(folder: &str) -> Option<(Kind, Tally)> {
    let kind = classify(folder);
    let mut tally: Tally = [0; 4];
    let mut scored = 0usize;

    for png_path in folder_pngs(folder) {
        let expected = expected_value(&png_path);
        // Positive folders only score images that have a sidecar.
        if kind == Kind::Positive && expected.is_none() {
            continue;
        }
        scored += 1;
        let (width, height, luma) = png::load_png_luma(png_path.to_str().unwrap());
        for (slot, &(rot_index, _)) in ROTATIONS.iter().enumerate() {
            let (rw, rh, rluma) = png::rotate(rot_index, width, height, &luma);
            let hit = match kind {
                Kind::Positive => decodes_to(rw, rh, &rluma, expected.as_deref().unwrap()),
                Kind::Negative => decodes_anything(rw, rh, &rluma),
            };
            if hit {
                tally[slot] += 1;
            }
        }
    }

    (scored > 0).then_some((kind, tally))
}

/// A minimal TOML reader for the committed baseline: `[folder]` sections with
/// `rotN = <int>` keys. Dependency-free so the shipped wasm never grows a TOML
/// crate. Returns folder → (kind marker + tally); the kind is inferred from the
/// folder name, not stored.
fn read_baseline() -> Option<BTreeMap<String, Tally>> {
    let text = fs::read_to_string(BASELINE).ok()?;
    let mut map: BTreeMap<String, Tally> = BTreeMap::new();
    let mut current: Option<String> = None;
    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some(section) = line.strip_prefix('[').and_then(|s| s.strip_suffix(']')) {
            current = Some(section.to_string());
            map.entry(section.to_string()).or_insert([0; 4]);
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim();
            let value: usize = value.trim().parse().unwrap_or(0);
            if let Some(folder) = &current {
                let tally = map.entry(folder.clone()).or_insert([0; 4]);
                if let Some(slot) = ROTATIONS.iter().position(|(_, k)| *k == key) {
                    tally[slot] = value;
                }
            }
        }
    }
    Some(map)
}

/// Serialize the measured tallies to the baseline TOML text.
fn render_baseline(results: &BTreeMap<String, Tally>) -> String {
    let mut out = String::new();
    out.push_str("# ZXING blackbox corpus baseline — committed per-folder pass counts.\n");
    out.push_str("# Positive folders: correct decodes per rotation (a floor; the harness\n");
    out.push_str("# fails if the pipeline decodes fewer). Negative folders\n");
    out.push_str("# (falsepositives*, unsupported): false-positive counts (a ceiling).\n");
    out.push_str("# Regenerate with BLACKBOX_WRITE_BASELINE=1 (see blackbox.rs).\n\n");
    for (folder, tally) in results {
        out.push_str(&format!("[{folder}]\n"));
        for (slot, &(_, key)) in ROTATIONS.iter().enumerate() {
            out.push_str(&format!("{key} = {}\n", tally[slot]));
        }
        out.push('\n');
    }
    out
}

/// Measure the whole corpus, returning folder → tally and folder → kind.
fn measure_corpus() -> (BTreeMap<String, Tally>, BTreeMap<String, Kind>) {
    let mut results: BTreeMap<String, Tally> = BTreeMap::new();
    let mut kinds: BTreeMap<String, Kind> = BTreeMap::new();
    for folder in corpus_folders() {
        if let Some((kind, tally)) = run_folder(&folder) {
            results.insert(folder.clone(), tally);
            kinds.insert(folder, kind);
        }
    }
    (results, kinds)
}

/// The full corpus sweep. Heavy, so `#[ignore]` by default — run in CI with
/// `--release --ignored`. Writes the baseline when `BLACKBOX_WRITE_BASELINE` is
/// set; otherwise asserts no regression against the committed baseline.
#[test]
#[ignore = "full corpus sweep; run with --release --ignored (see blackbox.rs)"]
fn blackbox_corpus() {
    let (results, kinds) = measure_corpus();

    if std::env::var("BLACKBOX_WRITE_BASELINE").is_ok() {
        fs::write(BASELINE, render_baseline(&results))
            .unwrap_or_else(|e| panic!("write baseline {BASELINE}: {e}"));
        eprintln!("wrote baseline for {} folders to {BASELINE}", results.len());
        return;
    }

    let Some(baseline) = read_baseline() else {
        panic!(
            "no baseline at {BASELINE}; generate it with \
             BLACKBOX_WRITE_BASELINE=1 cargo test --release --test blackbox -- --ignored"
        );
    };

    let mut regressions: Vec<String> = Vec::new();
    for (folder, tally) in &results {
        let kind = kinds[folder];
        let base = baseline.get(folder).copied().unwrap_or([0; 4]);
        for (slot, &(_, key)) in ROTATIONS.iter().enumerate() {
            match kind {
                // Positive: actual must not fall below the baseline floor.
                Kind::Positive => {
                    if tally[slot] < base[slot] {
                        regressions.push(format!(
                            "{folder}.{key}: decoded {} < baseline {}",
                            tally[slot], base[slot]
                        ));
                    }
                }
                // Negative: actual must not rise above the false-positive ceiling.
                Kind::Negative => {
                    if tally[slot] > base[slot] {
                        regressions.push(format!(
                            "{folder}.{key}: {} false positives > baseline {}",
                            tally[slot], base[slot]
                        ));
                    }
                }
            }
        }
    }

    assert!(
        regressions.is_empty(),
        "blackbox corpus regressed:\n{}",
        regressions.join("\n")
    );
}

/// Count correct upright (rotation 0) decodes over the first `limit` sidecar
/// images of a folder — a cheap slice of the full sweep.
fn upright_decodes(folder: &str, limit: usize) -> usize {
    folder_pngs(folder)
        .into_iter()
        .filter_map(|p| expected_value(&p).map(|e| (p, e)))
        .take(limit)
        .filter(|(p, expected)| {
            let (w, h, luma) = png::load_png_luma(p.to_str().unwrap());
            decodes_to(w, h, &luma, expected)
        })
        .count()
}

/// A fast always-on smoke test: over a couple of small, high-yield supported
/// folders, a minimum number of real corpus images must decode upright. Guards
/// the loader and the whole `scan_and_decode` plumbing on every `cargo test`
/// without paying for the full four-rotation sweep. The floors are well under
/// the committed baseline so this never flakes, but it still catches a total
/// break of the loader or pipeline.
#[test]
fn blackbox_smoke() {
    let code128 = upright_decodes("code128-1", 8);
    let ean13 = upright_decodes("ean13-1", 8);
    let qrcode = upright_decodes("qrcode-2", 8);
    assert!(
        code128 >= 2,
        "smoke: code128-1 decoded {code128}/8 upright — 1D pipeline or loader broke"
    );
    assert!(
        ean13 >= 2,
        "smoke: ean13-1 decoded {ean13}/8 upright — EAN pipeline or loader broke"
    );
    assert!(
        qrcode >= 2,
        "smoke: qrcode-2 decoded {qrcode}/8 upright — QR pipeline or loader broke"
    );
}

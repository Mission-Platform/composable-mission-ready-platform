//! Development-only helper: print a compact-code matrix as `0`/`1` rows.
//!
//! Usage: `cargo run --example dump -- <micro|rmqr> <ecc 0..3> <text>`
//! Output: first line `width height`, then `height` rows of `width` `0`/`1`.
//! Used to cross-check the encoders against reference implementations.

use mission_platform_qr_code_encode::{encode_micro_qr, encode_rmqr};

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let kind = args.get(1).map(String::as_str).unwrap_or("micro");
    let ecc: u8 = args.get(2).and_then(|s| s.parse().ok()).unwrap_or(0);
    let text = args.get(3).map(String::as_str).unwrap_or("");

    let packed = match kind {
        "rmqr" => encode_rmqr(text, ecc),
        _ => encode_micro_qr(text, ecc),
    };
    let Some(packed) = packed else {
        eprintln!("NONE");
        std::process::exit(2);
    };
    let width = packed[0] as usize;
    let height = packed[1] as usize;
    println!("{width} {height}");
    let mut offset = 2;
    for _ in 0..height {
        let row: String = (0..width)
            .map(|_| {
                let c = if packed[offset] != 0 { '1' } else { '0' };
                offset += 1;
                c
            })
            .collect();
        println!("{row}");
    }
}

# ZXING blackbox corpus — attribution

The image corpus in this directory (and its `.txt` / `.metadata.txt` sidecars)
is the **blackbox** test resource set from the [ZXing ("Zebra Crossing")
project](https://github.com/zxing/zxing), vendored verbatim from
`core/src/test/resources/blackbox`.

- **Upstream project:** ZXing — https://github.com/zxing/zxing
- **License:** Apache License 2.0 (see the accompanying `LICENSE` and `NOTICE`, copied unchanged from the ZXing
  repository root).
- **Provenance:** copied without modification for use as a decode-accuracy regression corpus. No image content,
  expected-value sidecar, or folder structure has been altered.

These files are **test-only fixtures**: they are consumed by the native Rust corpus harness
(`crates/code-scan/tests/blackbox.rs`) and are never compiled into or shipped with the runtime wasm bundle.

Each symbology folder contains numbered `N.png` images with an `N.txt` file holding the expected decoded value, plus an
optional `N.metadata.txt`. The
`falsepositives*` and `unsupported` folders intentionally have **no** `.txt`
sidecars: their images must not produce a decode.

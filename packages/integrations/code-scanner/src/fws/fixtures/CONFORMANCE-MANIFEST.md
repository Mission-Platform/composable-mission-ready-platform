# Scanner conformance manifest

This manifest records the current package-owned conformance boundary for the
ZXing-derived scanner graph. The package does not redistribute the complete
ZXing black-box corpus; any future imported fixture must retain its upstream
path, license attribution, and modification note.

## Local deterministic fixtures

| Format      | Fixture                                                | Current assertion                                  |
| ----------- | ------------------------------------------------------ | -------------------------------------------------- |
| Data Matrix | `scanner-graph.spec.ts` generated module image         | ASCII payload, checksum failure, format filtering  |
| Aztec       | `scanner-graph.spec.ts` generated compact module image | bounded binary payload and compact layers          |
| PDF417      | `pdf417-hello.modules.txt` and `pdf417-hello.svg`      | clean single-symbol text compaction                |
| MaxiCode    | `maxicode-hello.modules.txt` and `maxicode-hello.svg`  | reduced mode 4/5 payload                           |
| 1D/RSS      | `scanner-graph.spec.ts` generated rows                 | checksum, quiet zone, mutation rejection, dispatch |

## Coverage boundary

- The linked graph is validated for bounded Data Matrix ASCII, compact/binary
  Aztec, clean single-symbol PDF417, reduced MaxiCode modes 4/5, and the
  linear/RSS formats listed in `ScanFormat`.
- QR decoder fixtures are retained by `qr-graph.spec.ts`, but the QR decoder
  cannot currently be linked into `scanner.fws` because Forge Web Script emits
  invalid Wasm (`FWS-EMIT-001`) once the decoder graph is present.
- Full ZXing black-box/golden import, detector parity, binary result metadata,
  and per-format read-rate baselines remain follow-up work; local fixtures are
  not evidence of full ZXing parity.

## Provenance

Derived algorithm material is covered by the package `NOTICE`,
`LICENSE-APACHE-2.0`, and `src/fws/FOUNDATION-ATTRIBUTION.md`. New imported
ZXing fixtures must be added with the corresponding Apache attribution before
they are used as release conformance gates.

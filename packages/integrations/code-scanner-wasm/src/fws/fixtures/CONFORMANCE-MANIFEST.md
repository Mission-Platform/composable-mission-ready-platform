# Scanner conformance manifest

This manifest records the current package-owned conformance boundary for the
ZXing-derived scanner graph. The package does not redistribute the complete
ZXing black-box corpus; any future imported fixture must retain its upstream
path, license attribution, and modification note.

The baseline below is intentionally a status matrix, not a parity claim. A
linked reader is covered by a deterministic local positive fixture and a
fail-closed graph gate where one exists. `Reduced` means that only the modes
listed in the coverage column are supported; `Standalone` means that the
decoder graph emits independently but is not part of `scanner.fws`.

## Local deterministic fixtures

| Format       | Fixture                                                | Status     | Current assertion                                  |
| ------------ | ------------------------------------------------------ | ---------- | -------------------------------------------------- |
| AZTEC        | `scanner-graph.spec.ts` generated compact module image | Reduced    | compact binary payload and layer bounds            |
| CODABAR      | `scanner-graph.spec.ts` generated row                  | Linked     | framing, checksum/structure, and dispatch          |
| CODE_39      | `scanner-graph.spec.ts` generated row                  | Linked     | checksum/structure and dispatch                    |
| CODE_93      | `scanner-graph.spec.ts` generated row                  | Linked     | C/K checks, mutation rejection, and dispatch       |
| CODE_128     | `scanner-graph.spec.ts` generated row                  | Linked     | checksum, Code B payload, and dispatch             |
| DATA_MATRIX  | `scanner-graph.spec.ts` generated module image         | Reduced    | ASCII payload, checksum failure, and format filter |
| EAN_8        | `scanner-graph.spec.ts` generated row                  | Linked     | checksum and mutation rejection                    |
| EAN_13       | `scanner-graph.spec.ts` generated row                  | Linked     | checksum, UPC-A normalization, and dispatch        |
| ITF          | `scanner-graph.spec.ts` generated row                  | Linked     | pair validation, checksum/structure, and dispatch  |
| MAXICODE     | `maxicode-hello.modules.txt` and `maxicode-hello.svg`  | Reduced    | clean mode 4/5 payload                             |
| PDF_417      | `pdf417-hello.modules.txt` and `pdf417-hello.svg`      | Reduced    | clean single-symbol text compaction                |
| QR_CODE      | `qr-graph.spec.ts` decoder graph                       | Standalone | valid decoder emission and bounded failure path    |
| RSS_14       | `scanner-graph.spec.ts` generated row                  | Linked     | pair checksum, scaled image, mutation rejection    |
| RSS_EXPANDED | `scanner-graph.spec.ts` generated row                  | Linked     | numeric pair checksum and mutation rejection       |
| UPC_A        | `scanner-graph.spec.ts` generated row                  | Linked     | checksum and zero-prefixed EAN normalization       |
| UPC_E        | `scanner-graph.spec.ts` generated row                  | Linked     | parity, expanded checksum, and scanner dispatch    |

## Negative baseline

The linked graph must return no result for a blank image. The row fixtures also
flip a checksum or framing module for each covered linear reader, while the
matrix fixtures exercise checksum or structural rejection. These are binary
pass/fail regression gates; read-rate percentages are deliberately not
reported until the upstream black-box/golden corpus is imported.

## Coverage boundary

- The linked graph is validated for bounded Data Matrix ASCII, compact/binary
  Aztec, clean single-symbol PDF417, reduced MaxiCode modes 4/5, and the
  linear/RSS formats listed in `ScanFormat`.
- QR decoder fixtures are retained by `qr-graph.spec.ts`, but the QR decoder
  cannot currently be linked into `scanner.fws` because Flint emits
  invalid Wasm (`FWS-EMIT-001`) once the decoder graph is present.
- Full ZXing black-box/golden import, detector parity, binary result metadata,
  and per-format read-rate baselines remain follow-up work; local fixtures are
  not evidence of full ZXing parity.

## Provenance

Derived algorithm material is covered by the package `NOTICE`,
`LICENSE-APACHE-2.0`, and `src/fws/FOUNDATION-ATTRIBUTION.md`. New imported
ZXing fixtures must be added with the corresponding Apache attribution before
they are used as release conformance gates.

## Validation record

- Focused and full scanner graph: 25 tests passed, including the standalone QR
  graph and the linked reduced-reader graph.
- Package Vitest: 60 passed and 32 skipped; the skipped cases are the QR and
  multi-symbol scenarios that require unavailable combined-reader behavior.
- Package `build:check`, ESLint, Stylelint, Prettier, and all Forge framework
  and Storyblok builds passed on 2026-09-12.
- Strict Flint source analysis and the complete ZXing black-box/golden corpus are
  not release gates yet: standalone directory analysis cannot resolve the
  product graph's imported symbols, no corpus files are redistributed, and the
  current all-results entry remains a single-result compatibility path.

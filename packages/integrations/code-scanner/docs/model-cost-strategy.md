# Model & Cost Strategy — ZXING corpus full-coverage effort

This document captures the **model-tiering matrix** requested for the ZXING black-box corpus work ("use agents of
various models to determine how best to achieve this at the most effective cost"). It records which model tier is best
suited to each delivery stage, so that wherever a delegation mechanism exists the work can be routed to the cheapest
capable tier — and where a single agent does the work, it guides where the most effort (and the most capable model)
should be spent.

## Tier definitions

- **Tier A (top / most capable)** — novel computer-vision reasoning and spec-heavy decoding: the new locators (MaxiCode
  hexagonal grid + bullseye, PDF417 row clustering, GS1 DataBar stacked-row assembly) and the Reed–Solomon /
  error-correction math (GF (929) for PDF417, GF (64) for MaxiCode, the RSS combinatorics). These are the parts most
  likely to be wrong in subtle ways and hardest to recover from a bad first draft.
- **Tier B (mid)** — well-specified porting from the ZXING reference: symbology tables, encoders, round-trip generated
  tests, harness logic, and the PNG loader generalisation. The shape of the answer is known; the work is careful
  transcription and wiring.
- **Tier C (cheap / mechanical)** — bulk copy, attribution files, baseline scaffolding, docs, and the wiring boilerplate
  (format tags, `FORMAT_NAMES`, the `ScanFormat` union).

## Stage → tier mapping

| Stage                              | Work                                                    | Tier |
| ---------------------------------- | ------------------------------------------------------- | ---- |
| 1 Vendor corpus + loader + harness | copy/attribution (C), loader + harness logic (B)        | C→B  |
| 2 Raise supported-format read-rate | locator tuning + retry paths                            | A→B  |
| 3 GS1 DataBar family               | tables/encoders (B), RSS-14 locator + RS (A)            | A/B  |
| 4 PDF417                           | tables/encoder (B), row-scan locator + GF(929) EC (A)   | A/B  |
| 5 MaxiCode                         | hex-grid locator + GF(64) RS (A), tables (B)            | A/B  |
| 6 Wire-up + JS + docs              | boilerplate/docs + wiring (C), wasm rebuild + smoke (B) | C→B  |

## Cost principle

Maximise the Tier-C / Tier-B share — the mechanical porting (tables, encoders, round-trip tests, wiring) is the bulk of
the new-format work — and reserve the Tier-A budget for the three genuinely novel locators and their error-correction
math, where a weaker model's mistakes are expensive to detect and fix. A short spike can benchmark a cheaper model on
one decoder port before committing the tier for the rest.

## How it played out

- **Stage 6** (this stage) is the clearest Tier-C→B case: extending
  `FORMAT_NAMES` and the `ScanFormat` union is mechanical (C); rebuilding the wasm and writing the upload/stream smoke
  suite with a small PNG reader is well-specified mid-tier work (B). No Tier-A reasoning was needed once the native
  decoders (Stages 3–5) were in place.
- **Stages 3–5** each split cleanly: the ZXING tables/encoders and round-trip tests were Tier-B transcription, while the
  locators and Reed–Solomon (GF (929), GF (64), the RSS combinatorics) were the Tier-A core — consistent with the matrix
  above.

> The implementation used focused delegated reviews for RSS correctness, the
> stacked 2D readers, and QR graph emission. Those reviews confirmed the
> bounded reduced-reader boundary and isolated the QR failure to the Forge Web
> Script emitter rather than masking it with a fallback. The matrix remains the
> guide for future parity passes where the missing corpus and decoder work can
> be split safely.

## Current re-planning boundary

The completed foundation and 1D/RSS work used Tier B for ZXing-shaped ports and
Tier A review for RSS combinatorics, checksums, and bounded memory behavior. The
current linked 2D readers are deliberately reduced implementations, so claiming
full ZXing parity would require a new Tier-A decoder and detector pass rather
than more documentation or fixture work.

The next highest-value investigation is the Forge Web Script QR emitter failure:
the standalone QR graph is valid, but linking its decoder into the scanner
graph fails `FWS-EMIT-001` before runtime. Until that compiler boundary is
resolved, Tier-C fixture and API work must keep QR as an explicit standalone
case and must not convert reduced local fixtures into parity claims.

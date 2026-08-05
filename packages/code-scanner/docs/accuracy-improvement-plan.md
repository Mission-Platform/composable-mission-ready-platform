# Code Scanner — Accuracy Improvement Plan

A plan for raising the read rate of `@mission-platform/code-scanner` on real-world captures (uploads and live camera
frames), and for consolidating the scan pipeline **entirely into Rust/WebAssembly**.

> **Progress:** Phase 0 (broadened generated-image tests), Phase 1 (move the
> whole pipeline into Rust) and **Phase 2** (adaptive binarisation + grey
> sub-pixel sampling with Reed–Solomon erasures + the locator↔decoder retry
> loop) are **done** — see §1, §2 and §4. **Phase 3 is now complete:** the UPC-A /
> EAN-13 disambiguation (§2 item 5), Data Matrix + 1D rotation/skew tolerance
> (item 4), the Aztec locator (item 6) and multi-symbol + ROI scanning (item 7)
> have all landed.

Before Phase 1, the implementation split the pipeline:

- **Locate + sample** ran in Rust (`crates/code-scan`): `binarize` → per-symbology locators in `qr.rs`, `datamatrix.rs`,
  `barcode.rs`. The wasm `scan` entry point returned a **tagged buffer** `[format, ...payload]` — it did **not** decode.
- **Decode** ran in JavaScript (`packages/code-scanner/src/scanner/index.ts`): it unpacked the tagged buffer and called
  the _separate_ decoder wasm modules shipped by `@mission-platform/qr-code`, `@mission-platform/matrix-code` and
  `@mission-platform/barcode`.

Phase 1 replaced that with a single Rust `scan_and_decode` call (see §1); the motivation below is kept as the rationale.

## 1. The core structural problem: the pipeline crossed the wasm↔JS boundary twice

Before Phase 1 a single scan was:

```
image (JS)
  → wasm code-scan.scan()            [Rust: binarise + locate + sample]
  → tagged module buffer (JS)        [cross back into JS]
  → decodeQr / decodeMatrix / decodeBarcode (JS façades)
  → wasm qr/matrix/barcode-decode    [cross into a *different* wasm module]
  → payload string (JS)
```

Every located symbol is copied out of wasm, reshaped in JS, then copied into a second wasm instance to decode. This is
the round-trip the issue calls out. It hurts both performance and, more importantly for this plan, **accuracy**, because
the locator and the decoder cannot cooperate:

- **No decode feedback to the locator.** The Rust locator commits to a _single_
  binarisation, symbol size and module grid. If the sampled grid fails Reed–Solomon/checksum in the JS decoder, there is
  no way to ask the locator to re-sample with a different threshold, a ±1 module size, or a shifted origin. A code that
  is _located but undecodable_ (the exact case the debug logging targets)
  is simply lost.
- **Lossy hand-off.** The locator flattens rich intermediate state (grey levels, candidate finder centres, per-module
  confidence) down to hard `0/1` bits before the decoder ever sees it. The decoder then works from bits alone.
- **Symbology precedence is a blunt instrument.** For 1D codes the JS side tries symbologies in a fixed order and
  returns the first that reads. Because UPC-A is a module-level subset of a leading-zero EAN-13, a UPC-A symbol is
  reported as EAN-13 (verified by the new test suite). Decoding in Rust lets the locator carry structural hints (element
  count, guard patterns) to pick the right symbology.

### Target architecture — one Rust call, image in, payload out

> **Status: implemented (Phase 1 done).** The scanner now exports
> `scan_and_decode`, links the three decoder crates directly, and the JS façade
> decodes through that single call. The details below record how it was done.

```
image (JS)
  → wasm code-scan.scan_and_decode()   [Rust: binarise + locate + sample + DECODE]
  → ScanOutcome { format, value } (JS)
```

`scan_and_decode(width, height, luma) -> Option<ScanOutcome>` runs the whole pipeline inside `crates/code-scan` and
returns the **decoded payload** directly (`value` is `undefined` when a symbol is located but undecodable). The JS
façade (`scanner/index.ts`) collapsed to a thin marshalling layer that no longer imports
`@mission-platform/qr-code` / `-/matrix-code` / `-/barcode` at runtime; those packages remain independently publishable
(their own wasm still exports `decode`
under the default `wasm-api` feature).

#### Why this is tractable now

The decoder crates already expose plain-Rust cores, and `crates/code-scan`
**already links them for its native tests** (`tests/pipeline.rs` calls
`mission_platform_barcode_decode::decode_modules`,
`mission_platform_matrix_code_decode::decode`, etc.). The only reason they are confined to
`[target.'cfg(not(target_arch = "wasm32"))'.dev-dependencies]` is that each decoder crate exports a
`#[wasm_bindgen] pub fn decode`, and linking several of those into one cdylib would clash on the exported `decode`
symbol.

The fix was a small, mechanical refactor — **all four steps are now done**:

1. **Every decoder has a plain-Rust entry point** that is _not_ `#[wasm_bindgen]`
   (`decode_modules`, `decode_matrix`, `decode_qr`), and the `#[wasm_bindgen]`
   `decode`/`start` exports are gated behind a new `wasm-api` crate feature (on by default, and implied by `console`).
2. **`code-scan` depends on the decoder crates with `default-features = false`**
   (so `wasm-api` is off), promoted from dev-dependencies to real dependencies. No wasm-bindgen `decode` symbol is
   compiled into the scanner cdylib, so there is no clash — verified by rebuilding the scanner wasm.
3. **`scan_and_decode`** in `crates/code-scan/src/lib.rs` locates, then calls the decoders' plain-Rust cores in-process
   and returns a `ScanOutcome { format,
value }` (a `#[wasm_bindgen]` struct; `value` is `undefined` when undecodable).
4. **The JS façade is slimmed**: the `decodeTagged` routing and the imports of the three decoder packages are gone,
   replaced by a single `scan_and_decode` call.

This is the enabling step for every accuracy improvement below, because locate and decode now share one address space.

## 2. Accuracy improvements unlocked once decode is in Rust

Ordered roughly by expected read-rate impact. **Items 1–3 (Phase 2) and items 4–7 (Phase 3) are done**; each is
annotated below.

1. **Locator ↔ decoder retry loop. _(done — Phase 2.)_** When the first decode attempt fails, `scan_and_decode`
   re-samples without leaving Rust: it tries a second (adaptive) binarisation, sub-module origin shifts
   (`SAMPLE_OFFSETS`), and both erasure-aware and blind decoding, accepting the first candidate that passes the symbol's
   own error correction. This directly attacks the _located-but-undecodable_ failures.
2. **Local/adaptive binarisation. _(done — Phase 2.)_** `image::binarize` (global **Otsu**) is kept as the fast first
   attempt; `image::binarize_adaptive` adds a windowed **local mean-C** threshold (via an integral image) so glare,
   gradients and uneven lighting no longer merge dark modules into the background. The retry loop tries both.
3. **Grey-level (sub-pixel) module sampling. _(done — Phase 2.)_** `qr` and
   `datamatrix` gained `scan_with_confidence`, which samples module centres from the _grey_ image with bilinear
   interpolation and flags modules near the local threshold as low-confidence. Those are passed to the decoders
   (`decode_qr_with_erasures` / `decode_matrix_with_erasures`) as Reed–Solomon **erasures**, which the
   errors-and-erasures corrector (`gf`, `reed_solomon`)
   repairs at up to twice the rate of unknown errors.
4. **Multi-scale + rotation robustness for 1D and Data Matrix. _(done — Phase 3.)_** The QR locator was already
   rotation-tolerant via its three finder centres. Data Matrix now reads at **any** rotation: a corner-based affine
   locator (`scan_oriented_candidates` — four extreme ink corners, the L corner detected from its solid edges, the
   opposite corner reconstructed by the parallelogram rule, size read off the timing edges, sampled along independent
   column/row axes so shear is handled too)
   covers moderate angles, and a straighten-and-retry fallback recovers steep angles: `Bitmap::orientation` finds the
   rotation via a minimum-area bounding-box sweep (robust at the 45° family, where extreme-point corners degenerate),
   `image::rotate_luma` straightens the frame, and the tuned upright pipeline samples it. 1D barcodes are handled the
   same way — the tilt is recovered and the frame straightened (all four axis-aligning orientations tried) so the
   horizontal scan lines cross the bars. Covered by rotated-capture pipeline tests across a spread of angles (incl.
   45°/90°/180°+) and the strengthened JS degradation profiles.
5. **Symbology disambiguation for 1D. _(done — Phase 3.)_** The UPC-A vs leading-zero-EAN-13 ambiguity is resolved by
   the **number-system digit**:
   `decode_any_barcode` post-processes the winning symbology through
   `disambiguate_symbology`, which reports an EAN-13 whose number-system digit is
   `0` as the 12-digit UPC-A form (leading zero stripped) while leaving genuine EAN-13 untouched. _Remaining:_ carrying
   richer located structure (guard-bar positions, element count) into the decision and exposing the intended symbology
   so callers can constrain it.
6. **Aztec support. _(done — Phase 3.)_** The `@mission-platform/matrix-code`
   encoder already produced Aztec, but the scanner had no Aztec _locator_. Added a compact-Aztec bullseye locator
   (`crates/code-scan/src/aztec.rs`): it finds the central bullseye by its nine-run `1:1:1:1:1:1:1:1:1` finder signature
   (inner seven runs trusted, outer two only required present since they touch the mode ring), verifies it on both axes,
   recovers the module size, samples each plausible compact size (15/19/23/27) on a speckle-cleaned copy and routes each
   to the existing Aztec decode path, whose mode-message + Reed–Solomon checks reject the wrong sizes. `scan_and_decode`
   reports it as `FORMAT_AZTEC`.
7. **Multiple-symbol + ROI scanning. _(done — Phase 3.)_** `scan_and_decode_all`
   returns every distinct decoded symbol (a coarse-to-fine sweep of the whole frame, overlapping halves and quadrants,
   deduplicated by `(format, value)`), and
   `scan_and_decode_roi` crops a caller-supplied region **in Rust before**
   binarisation, so a reticle crop rejects surrounding clutter up front. Both are surfaced in the JS façade
   (`scanImageDataAll`, `scanImageData(image, roi)`).

## 3. Validation strategy

Accuracy work must be measured, not asserted by eye.

- **Generated-image round-trip tests.**
  `src/scanner/index.spec.ts` renders many encoder outputs — five QR payloads across sizes/UTF-8 plus all four ECC
  levels, four Data Matrix payloads, and seven 1D symbologies (`code128`, `code39`, `ean13`, `ean8`, `upca`, `itf`,
  `codabar`) — and asserts the full `render → locate → sample → decode` path (now the single
  `scan_and_decode` call) recovers the payload. The 1D cases compare against the scanner's own symbology precedence
  (including the UPC-A/EAN-13 disambiguation).
- **All-code-types encode↔decode round-trip.** `crates/code-scan/tests/generated.rs`
  encodes **every** symbology the encoders can produce — QR (4 ECC levels), all four matrix symbologies (Data Matrix
  square/rectangular, GS1 Data Matrix, Aztec)
  and all fifteen 1D symbologies (incl. Code 93, GS1-128, UPC-E, ITF-14, MSI, Pharmacode) — and asserts each decodes
  faithfully (re-encode equality), covering the code types the scanner cannot yet _locate_.
- **Phase 2 degradation cases.** `image.rs` unit-tests adaptive binarisation on a lighting gradient; `tests/pipeline.rs`
  proves a gradient-degraded QR that the global-Otsu-only path cannot read is recovered by the Phase 2 adaptive +
  grey-sampling pipeline; the RS crates test errors-and-erasures recovery beyond the blind-error capacity.
- **Seeded per-format capture degradation.** Every generated image is warped by a deterministic **projective**
  transform — non-uniform aspect scale, rotation, skew and an independent per-corner x/y/z **morph** (a homography) —
  plus salt-and-pepper noise, before scanning. Intensities are tuned per format, which quantified two locator limits
  worth fixing (see §2): QR's finder-based grid is affine-only, so it tolerates only mild _anisotropic_ aspect and
  _perspective_ before larger symbols drift; the Data Matrix locator is upright-only, so it tolerates only a slight
  rotation/skew/morph.
- **Degradation matrix.** The Rust `tests/pipeline.rs` already degrades synthetic captures (downscale, salt-and-pepper
  speckle, quiet-zone clutter, a cluttered
  "camera frame"). Extend this into a parameter sweep (scale × noise × rotation × blur) and report a **read-rate
  percentage per format**, gated in CI so a change cannot silently regress it.
- **Real-capture corpus.** Collect a fixture set of real photos (the field reports reference 448×336 low-res frames
  and ~3px/module barcodes) with known payloads, and track read rate as the headline metric across releases.
- **Determinism.** Keep all synthetic degradations seeded (the existing `speckle`
  uses a fixed LCG) so results are reproducible.

## 4. Suggested sequencing

1. **Phase 0 — tests (done).** Broadened the generated-image suite (with seeded aspect/rotation/skew/morph/noise
   degradation) so the pipeline had a safety net before refactoring.
2. **Phase 1 — consolidate decode into Rust (done).** The dependency/feature refactor + `scan_and_decode` + JS façade
   slim-down. Behaviour-preserving; validated by the round-trip, pipeline and new `scan_and_decode` tests, and by
   rebuilding the scanner wasm.
3. **Phase 2 — binarisation + sub-pixel sampling + retry loop (done).** Adaptive local binarisation, grey bilinear
   sampling with per-module confidence fed to the decoders as Reed–Solomon erasures, and the global→adaptive ×
   erasure/blind × origin-offset retry loop in `scan_and_decode` — the biggest read-rate wins, now that locate and
   decode cooperate in one Rust call.
4. **Phase 3 — rotation/skew, symbology disambiguation, Aztec, multi-symbol (in progress).** The 1D symbology
   disambiguation (§2 item 5) has landed. Remaining:
   Data Matrix/1D rotation-skew tolerance (item 4), an Aztec locator (item 6), and multiple-symbol + ROI scanning (item 7) — each landed behind its own degradation-matrix delta.

## 5. Documentation follow-ups

- **Done:** `packages/code-scanner/README.md` was updated — the stale "1D barcode decoder is still a scaffold, so
  barcode results carry `value: null`" note is replaced with the end-to-end decode behaviour (barcodes decode; UPC-A
  reports as its 12-digit value, not its EAN-13 alias), and the architecture section now describes the single
  `scan_and_decode` call rather than the JS decode hand-off.

## 6. ZXING black-box corpus harness (real-capture read-rate)

The `tests/real_world.rs` "corpus" of §3 was realised as the full **ZXing blackbox** corpus (1,242 PNGs across 56
symbology folders, each with a `.txt`
expected value; Apache-2.0, vendored under
`crates/code-scan/tests/fixtures/zxing-blackbox/` with attribution). A ZXing-style harness
(`crates/code-scan/tests/blackbox.rs`) runs the whole native
`scan_and_decode` pipeline over every image at the four quarter-turn rotations (0/90/180/270) and compares each
per-folder, per-rotation pass count against a committed baseline (`tests/blackbox_baseline.toml`), failing only on a
_regression_ — so unfixable outliers never block progress while genuine wins are measured. `falsepositives*` /
`unsupported` folders are the inverse guard: their baseline is a _ceiling_ on false positives.

### Step 1 — corpus + generalized loader + harness _(done)_

The corpus is vendored, the PNG reader was generalized (`tests/support/png.rs`:
palette colour type 3 at depths 1/2/4/8, low-depth greyscale, RGB (A), grey+alpha, plus 90/180/270 rotation helpers
matching ZXing semantics) with a loader unit test (`tests/png_loader.rs`), and the baseline is committed.

### Step 2 — raise read-rate on supported formats _(in progress)_

Triage (per-folder classification of every image/rotation as decoded / wrong-value / located-but-not-decoded /
not-located) surfaced a clear pattern:
the pipeline now **locates almost everything** but **decodes only the clean captures**. The remaining failures are
overwhelmingly _located-but-not-decoded_, not _not-located_.

**Landed this step:**

- **ITF false-positive guard.** Interleaved-2-of-5 has no check digit and a trivial start/stop, so a scan line crossing
  an unrelated symbol (a QR, other bars) trivially "decoded" to a spurious 2- or 4-digit value. `itf::decode` now
  rejects payloads shorter than **six digits**, matching the lower bound of ZXing's `ITFReader::DEFAULT_ALLOWED_LENGTHS`
  (`{6,8,10,12,14}`). This drove the false positives in `falsepositives`, `falsepositives-2` and `unsupported` to
  **zero** and, by removing those short reads that were short-circuiting the precedence order, lifted several positive
  folders (e.g. `qrcode-4`, `qrcode-5`). Covered by a new regression test (`barcode-decode`:
  `itf_rejects_runs_shorter_than_six_digits`) and the baseline update.

**Quantified next opportunities (located, not yet decoded):**

- **1D per-digit row decoding (largest opportunity).** UPC/EAN folders locate hundreds of scan lines but decode almost
  none of the hard camera photos (`upca-2` 206 located / 0 decoded, `upce-2` 160 / 0, `ean13-3` 204 / 6). The root cause
  is that the locator quantises each scan line to a **single global module unit** before handing module bits to the
  decoder; under perspective foreshortening the true module width varies across the symbol, so the global grid drifts
  and a rigid EAN/UPC cell grid rejects it. The fix is a ZXing-style **per-digit** row decoder that matches each digit's
  run-length ratios locally (pattern-match variance) instead of a global quantisation — a larger change to the
  locator↔decoder interface, tracked as the next Step-2 iteration.
- **QR perspective / alignment-pattern sampling.** `qrcode-1` (77 located / 0 decoded) and `qrcode-6` (60 / 0) are
  higher-version symbols: the sampler builds a purely **affine** grid from the three finder centres, which drifts across
  a large or perspective-warped symbol. Using the bottom-right **alignment pattern**
  for a four-point perspective transform (as ZXing's `Detector` does) is the matching QR win.
- **Data Matrix sizing + polarity.** The single `inverted` Data Matrix is now located after a polarity flip but
  mis-sized by the locator (22×22 for a 10-digit numeric symbol whose true size is ~12–14), so it does not decode; a
  full-frame inverted-polarity retry was prototyped but reverted for this step because it doubled the corpus-sweep time
  for zero net corpus wins (the blocker is DM sizing, not polarity). Inverted support should return once the DM locator
  sizing is tightened, scoped so the extra pass only runs on frames that would otherwise fail.
- **Aztec sampling.** `aztec-1` (68 located / 0 decoded): the bullseye is found but the axis-aligned grid sampling does
  not yet recover these captures.

### Step 3 — GS1 DataBar (RSS-14) encode + decode + locator _(RSS-14 done)_

A new crate trio mirrors the repo's `*-common` / `*-encode` / `*-decode` split:

- **`gs1-databar-common`** — the ISO/IEC 24724 combinatorial primitives ported from ZXing's `RSSUtils`: `combins`,
  `get_rss_value` (widths → value, decode) and its exact inverse `get_rss_widths` (value → widths, encode), plus the
  width-ratio variance finder matcher. A unit test asserts the value/widths mapping is self-inverse across every RSS-14
  subset.
- **`gs1-databar-decode`** — a faithful port of ZXing's `RSS14Reader`: finder detection, `parseFoundFinderPattern`,
  `decodeDataCharacter` (with the odd/even count adjustment) and the mod-79 checksum, reconstructing the 14-digit GTIN.
  Because DataBar characters are decoded from element-width _ratios_ (not a fixed glyph grid), the row decoder reads run
  lengths directly off a scan line — so it tolerates the varying module width of a foreshortened capture that defeats
  the global-quantisation 1D path (§2).
- **`gs1-databar-encode`** — the value→module-bit inverse. Its physical layout (guard bar, outside/finder/inside element
  order and the reversed inside/right pair) was pinned down by comparing the decoder's measured element widths from a
  real corpus symbol against the encoder's computed characters, then confirmed by an encode→decode round-trip.

The scanner gained `crates/code-scan/src/gs1_databar.rs`, a thin locator that hands promising scan lines
(busiest-transition rows, then columns for 90°/270° captures) to the row decoder; the strong RSS-14 checksum makes a
match authoritative, so it reports only a decoded value or nothing (keeping the false-positive guard clean). It is wired
into `scan_and_decode` as a new
`FORMAT_DATABAR` tag (with `FORMAT_PDF417` / `FORMAT_MAXICODE` reserved for later steps).

**Result:** the `rss14-1` and `rss14-2` corpus folders went from **0 → 16**
correct decodes across the four rotations (rows read 0°/180°, columns read 90°/270°), with **no regression** in any
other folder and the negative folders still at **zero** false positives. Round-trips are covered by
`gs1-databar-decode/tests/roundtrip.rs` and `code-scan/tests/generated.rs`.

**Next DataBar iteration:** GS1 DataBar **Expanded** and **Expanded-Stacked**
(`rssexpanded-*`, `rssexpandedstacked-*`) are a separate, larger decoder (a general-purpose AI/field parser plus
stacked-row assembly) and remain at baseline 0, tracked as the follow-up to this step. RSS-14 **Stacked** likewise needs
two-row assembly in the locator.

### Step 4 — PDF417 encode + decode + stacked-row locator _(done)_

A new crate trio mirrors the repo's `*-common` / `*-encode` / `*-decode` split, porting `com.google.zxing.pdf417.*`
(Apache-2.0):

- **`pdf417-common`** — the shared tables and math both sides need: the symbol ↔ codeword tables (2,787 entries,
  generated from the ZXing reference), the codeword/cluster lookups (`get_codeword`, `bucket_from_symbol`), the
  module-bit-count → symbol sampler (exact fast path plus a lazily-built closest-ratio fallback), and the **GF (929)
  Reed–Solomon** error-correction decoder (`ModulusGF` / `ModulusPoly` / Euclidean algorithm). A unit test asserts every
  codeword value has a symbol in each of the three clusters and round-trips.
- **`pdf417-decode`** — GF (929) EC correction plus a high-level bit-stream parser (`DecodedBitStreamParser`) covering
  **Text**, **Byte** and **Numeric**
  compaction. It consumes the flat codeword array the locator assembles and returns the payload.
- **`pdf417-encode`** — a Byte-Compaction encoder (any byte payload round-trips exactly), dimension sizing, the
  EC-codeword generator (`EC_COEFFICIENTS` for all nine EC levels, generated from the reference) and the module-matrix
  layout (start/stop guards, left/right row indicators). It exposes both the codeword array (for codeword-level
  round-trips) and the packed module bitmap (for image-path tests).

The scanner gained `crates/code-scan/src/pdf417.rs`. PDF417 is a _stacked linear_
symbology, so the locator works a scan line at a time: on each image row it finds the start guard, reads 17-module
codewords (8 bar/space runs each) up to the stop guard, votes the column/row-count/EC-level metadata from the row
indicators, lays the data codewords into a `rows × cols` matrix (majority-voted per cell across the scan lines that
cover each barcode row) and hands it to the RS-checked decoder. A second pass reads every row right-to-left so a
180°-rotated symbol still decodes. It is wired into `scan_and_decode` as `FORMAT_PDF417`.

Two robustness details proved essential:

- **Exact-only sampling in the hot path.** The per-run sampler uses the exact match only
  (`sample_codeword_symbol_exact`); a run that does not sample cleanly becomes a `-1` _hole_ that preserves column
  alignment and is skipped in voting. This keeps scanning every row of every image cheap — the O (table-size)
  closest-ratio fallback would otherwise dominate the corpus sweep.
- **A hole guard against RS over-correction.** With high EC levels Reed–Solomon will happily fabricate a
  _valid-but-wrong_ codeword from a mostly-empty assembly (observed as garbage `"AAAA…"` decodes). The locator therefore
  refuses to decode when the number of holes exceeds `num_ec / 2` (the RS correction budget), which removed **every**
  garbage decode while keeping all correct ones — and keeps the negative-folder false-positive guard clean.

A bug fixed along the way: the bit-stream parser's default arm could spin forever on a corrupted stream (re-running text
compaction at a codeword it cannot consume); it now bails when it makes no forward progress.

**Result:** `pdf417-1` / `pdf417-2` / `pdf417-3` went from **0 → 8 / 13 / 8**
correct decodes at rotation 0, and again at 180° (**58** correct across rotations), with **no regression** in any other
folder and the negative folders still at **zero** false positives. Round-trips are covered by
`pdf417-decode/tests/roundtrip.rs` and `code-scan/tests/generated.rs`, and the full image path (encode → render →
`scan_and_decode`, incl. 180°) by
`code-scan/tests/pipeline.rs`.

**Next PDF417 iteration:** rotations **90°/270°** stay at baseline 0 — a quarter-turned symbol presents as vertical bars
that the row-scan locator does not read. A column-scan (transpose) pass, or the harness feeding the transposed frame, is
the matching follow-up. Steeper skew would need the full ZXing four-corner `Detector` perspective model.

### Step 5 — MaxiCode encode + decode + hexagonal locator _(done)_

A new crate trio mirrors the repo's `*-common` / `*-encode` / `*-decode` split, porting `com.google.zxing.maxicode.*`
(Apache-2.0):

- **`maxicode-common`** — the shared primitives both sides need: the fixed symbol geometry (30 columns × 33 rows), the
  **`BITNR`** per-cell → codeword-bit map (port of ZXing's `BitMatrixParser.BITNR`, transcribed and unit-tested so each
  of the 864 data bits appears exactly once), the `read_codewords` / `place_codewords`
  inverse pair, and the **GF (64) Reed–Solomon** corrector (primitive `x⁶+x+1`, generator base 1) with errors-only
  Berlekamp–Massey/Chien/Forney. Unit tests cover a clean codeword, correction up to half the EC budget, and an
  uncorrectable block.
- **`maxicode-decode`** — a faithful port of ZXing's `Decoder` +
  `DecodedBitStreamParser`: it corrects the primary block (10 data + 10 EC as a whole) and the secondary block (even/odd
  interleaves corrected independently), reads the mode nibble, assembles the datawords and runs the five-set
  (`SETS[0..5]`) latch/shift/number-compaction stream, including the mode 2/3 structured-carrier
  postcode/country/service-class assembly. Because all three RS blocks must validate, a returned value is authoritative.
- **`maxicode-encode`** — a dependency-free writer targeting mode 4/5 with the primary character sets A and B (enough to
  encode ASCII payloads and seed the round-trips), generating the primary + interleaved-secondary EC and laying the 144
  codewords into the module grid via the shared `BITNR` map.

The scanner gained `crates/code-scan/src/maxicode.rs`. MaxiCode is read as a _pure_ symbol, exactly as ZXing's
`MaxiCodeReader` does: the locator takes the enclosing rectangle of the dark pixels and samples the fixed 30×33 grid
over it, shifting the sample x-position half a module on odd rows to follow the hexagonal offset. A cheap square-aspect
guard skips obviously non-MaxiCode regions (1D barcodes, tall labels) before sampling, and the three RS blocks reject
any non-MaxiCode image sampled this way. It is wired into `scan_and_decode` as
`FORMAT_MAXICODE`.

**Result:** the `maxicode-1` folder went from **0 → 9** correct decodes at rotation 0 (all nine images — modes 2–5 and
the error-injected sample), with **no regression** in any other folder and the negative folders still at **zero**
false positives. Round-trips are covered by `maxicode-decode/tests/roundtrip.rs`
(encode → module grid → decode, incl. RS error recovery) and
`code-scan/tests/generated.rs`.

**Next MaxiCode iteration:** like ZXing, the pure-bits sampler is upright-only, so rotations **90°/180°/270°** stay at
baseline 0 (a rotated symbol samples the hexagonal grid incorrectly and RS rejects it — no false positives). A bullseye
finder that recovers the symbol's rotation before sampling would lift the other three rotations.

### Step 6 — wire the new formats into the JS façade + rebuild wasm _(done)_

Steps 3–5 landed PDF417, GS1 DataBar (RSS-14) and MaxiCode in the **native**
pipeline behind the `FORMAT_PDF417` / `FORMAT_DATABAR` / `FORMAT_MAXICODE` tags, but the shipped wasm and the JS façade
only knew the original four formats. This step surfaces the new symbologies at runtime:

- **`FORMAT_NAMES`** in `src/scanner/index.ts` now maps `4 → 'pdf417'`,
  `5 → 'databar'`, `6 → 'maxicode'`, and the `ScanFormat` union in `src/types.ts`
  gains the same three names — so `scanImageData` / `scanImageDataAsync` (and the
  `*All` / ROI variants) return them like any other format.
- **The scanner wasm was rebuilt** into `src/generated/scan` via the
  `build:wasm:scan` Turbo task (`wasm-pack build --target web --release`), so the three new decoders are now linked into
  the shipped binary. The generated directory is a git-ignored build artifact regenerated on every build.
- **A smoke suite** (`src/scanner/blackbox.spec.ts`) feeds one representative vendored corpus PNG per new family through
  **both** public entry points — the synchronous upload path (`scanImageData`) and the asynchronous streaming path
  (`scanImageDataAsync`) — and asserts the correct `format` **and** value. It uses a tiny dependency-free PNG reader
  (Node `zlib`) for test images only; the runtime never decodes PNGs. Expected values are compared exactly against the
  `.txt` sidecar (only trailing CR/LF trimmed), matching the native
  `blackbox.rs` harness, so payload control characters (GS/RS/FS) are preserved.

**Result:** `vitest` is green (40 tests, including the 6 new upload+stream cases)
against the freshly-rebuilt wasm, and the `tsc` build check is clean. The already-supported families remain covered
exhaustively by `index.spec.ts` (via the JS encoders); this step adds end-to-end façade coverage for the three
corpus-only symbologies. The per-stage model tiering that guided the whole effort is documented in
`docs/model-cost-strategy.md`.

### Step 7 — ZXing-style per-digit 1D row decoder for camera UPC/EAN photos _(done)_

The dominant remaining corpus failure mode was **located-but-not-decoded** 1D barcodes. The original 1D path
(`barcode.rs` → `barcode-decode`) samples each candidate scan line into a flat run of module bits by quantising every
run against a **single global module unit**. That is exact on a clean upload, but on a camera photo the module width is
not constant across the symbol — perspective, blur and uneven printing stretch it — so one global unit rounds many
elements against the wrong grid and the rigid EAN/UPC cell decoder rejects the result. The symbol is _located_ (`scan`
returns candidate scan lines) but never _decoded_.

The fix is a new `crates/code-scan/src/barcode_row.rs`, a faithful port of ZXing's `UPCEANReader` family. It never
quantises to a global grid: it walks the scan line pattern-by-pattern and, for **each digit independently**, normalises
that digit's four run widths to the seven-module cell before matching it against the L/G/R width tables
(`patternMatchVariance` with `MAX_AVG_VARIANCE` /
`MAX_INDIVIDUAL_VARIANCE`). Because every digit carries its own local unit, gradual drift across the symbol no longer
defeats the read. It covers **EAN-13 / UPC-A** (via EAN-13, with the leading digit recovered from the six left-half
parity bits), **EAN-8** and **UPC-E** (which had _no_ decode path before — it is absent from `barcode-decode`'s
symbology list), reusing the shared barcode-band detector to pick the scan rows. It runs in `decode_barcode_frame` as a
fallback **after** the grid decoder fails, so clean uploads keep the fast path.

Two guards keep the negative folders at **zero** false positives — the reader is far more permissive than the grid
quantiser, so both were essential:

- **Quiet zones on both sides.** ZXing requires a trailing quiet zone at least as wide as the end guard (mirroring the
  existing start-guard quiet zone). Without it a `1:1:1` run _inside_ an unrelated symbol frames a spurious "barcode"
  that, combined with a coincidentally valid checksum, decodes — the source of the initial 9 + 12 false positives on
  `falsepositives*`.
- **Multi-row consensus for the short symbologies.** The 8-digit EAN-8 / UPC-E are prone to a fluke checksum-valid
  framing in clutter, so they are accepted only when **≥ 2 scan rows** independently decode the same value (a genuine
  barcode decodes on many rows of its bar height; a fluke appears on one). The 13-digit EAN-13 / UPC-A (12 data digits
  plus the parity-derived leading digit)
  are far less prone and are accepted from a single row. Every returned value is additionally validated by the symbol's
  own mod-10 checksum.

**Result:** across the UPC/EAN folders, rotation 0 rose sharply — e.g.
`ean13-3` **3 → 54**, `upca-2` **0 → 31**, `upce-2` **0 → 37**, `upca-5`
**13 → 26**, plus `ean13-1`, `ean8-1`, `upca-1`, `upce-1/3` and, because the fallback also runs on the
straighten-and-retry frames, comparable gains at 90°/180°/270° (e.g. `upce-2` rot90 **0 → 35**). **No** other folder
regressed and the negative folders (`falsepositives`, `falsepositives-2`, `unsupported`) stay at **zero** false
positives. Two corpus-backed regression tests in
`code-scan/tests/pipeline.rs` lock in real UPC-E/EAN-13/EAN-8 photo reads and the clean false-positive guard, and the JS
smoke suite gains UPC-E + EAN-13 camera photos through both the upload and streaming paths.

**Note — `img.png`.** The workspace-root real-world capture (`real_world.rs`) is now _located_ cleanly, but it encodes
the classic generator sample `01234567`
whose trailing digit is **not** a valid mod-10 check (`0123456` → `01234565`). A spec-compliant reader — this one, and
ZXing itself — rejects a barcode that fails its own checksum, so the pipeline returns no value there _by design_; that
test stays `#[ignore]` as documentation of the intentional rejection (dropping the checksum guard to read it would
re-open the false positives the guard removes).

**Next 1D iteration:** UPC/EAN **add-on** extensions (`upcean-extension-*`, the 2-/5-digit supplements) and the hardest
folders (`upca-6`, `ean13-5`) stay at baseline 0 — the add-on reader and a stronger locator for those captures are the
matching follow-ups.

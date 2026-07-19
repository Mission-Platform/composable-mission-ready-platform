# @mission-platform/phone-number

## 0.2.0

### Minor Changes

- Added a **regex precompilation engine** — the foundation for converting the
  full Google libphonenumber rule set (which is driven by JavaScript `RegExp`)
  to AssemblyScript, where no native `RegExp` exists. Per the chosen
  "precompile patterns" strategy, regex patterns are compiled ahead of time into
  compact, flat `i32` bytecode that a small backtracking VM executes at runtime
  — so the AssemblyScript/WebAssembly core stays regex-free.

  - `src/regex/compiler.ts`: a build-time regex → bytecode compiler covering the
    syntax used by libphonenumber metadata (literals, `.`, character
    classes/ranges/negation, `\d \D \w \W \s \S`, capturing and `(?:)` groups,
    alternation, `* + ?` and `{n} {n,} {n,m}` greedy/lazy, `^`/`$`).
  - `src/regex/reference-vm.ts`: a TypeScript reference VM (full/prefix/search +
    capture groups) with leftmost-first (JavaScript) semantics.
  - `assembly/regex.ts`: the same VM in AssemblyScript, exercised inside wasm and
    diff-tested against the reference VM.
  - `src/metadata/pattern-corpus.ts`: the captured upstream pattern corpus —
    every distinct rule pattern used across all regions of libphonenumber's
    metadata — stored as TypeScript data so the compiler/VM can be diff-tested
    without any vendored upstream sources.

  Validated against the **entire upstream pattern corpus** (500+ distinct
  patterns): every pattern compiles, and the VM agrees with the native engine.

  Note: the higher-level `PhoneNumberUtil`, `AsYouTypeFormatter` and
  `ShortNumberInfo` ports (and the original upstream test suites) build on this
  engine and remain in progress; the shipped runtime API is still the curated
  0.1.0 surface.

## 0.1.0

### Minor Changes

- Initial release: a focused reimplementation of the core of Google
  libphonenumber in AssemblyScript, compiled to WebAssembly.

  Provides a typed `PhoneNumberUtil` façade (via `getPhoneNumberUtil()`) with
  parsing, possibility/validity checks, number-type classification and
  formatting (`E164`, `INTERNATIONAL`, `NATIONAL`, `RFC3966`) for a curated set
  of regions (US, CA, GB, FR, DE, AU, IN, JP, BR, CN, RU). The wasm binary is
  inlined as base64 into a single self-contained ES module, so the package has
  no runtime dependencies and needs no `.wasm` URL resolution.

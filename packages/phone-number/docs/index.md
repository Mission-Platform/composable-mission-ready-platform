# @mission-platform/phone-number

`@mission-platform/phone-number` is a focused reimplementation of the core of
Google [libphonenumber](https://github.com/google/libphonenumber), written in
[AssemblyScript](https://www.assemblyscript.org/) and compiled to **WebAssembly**. It parses, validates, classifies and
formats international phone numbers, and is packaged as a self-contained ES module with no runtime dependencies.

## Architecture

The package uses an AssemblyScript → WebAssembly build pipeline, driven entirely by **Vite**:

1. **AssemblyScript source** (`assembly/`) holds curated per-region metadata (`metadata.ts`) and the
   parse/validate/classify/format logic (`index.ts`).
2. **WASM compilation via Vite**: `@mission-platform/vite-plugin-assemblyscript`
   runs the AssemblyScript compiler in the Vite `buildStart` hook, producing
   `build/phone-number.wasm` plus ESM bindings.
3. **Single-file artifact**: the plugin inlines the wasm binary as base64 into a
   `@generated` module (`src/generated/phone-number.js`) exposing an async, memoised `loadModule()` factory —
   eliminating separate `.wasm` file loading and URL resolution.
4. **Typed façade**: `src/index.ts` exposes the `PhoneNumberUtil` class over the raw wasm exports.

### Rebuilding the WASM artifact

AssemblyScript is compiled by Vite; no Docker or native toolchain is required.

```bash
# Full build:
pnpm --filter @mission-platform/phone-number build

# Or just run Vite (recompiles AssemblyScript, regenerates src/generated):
pnpm --filter @mission-platform/phone-number exec vite build
```

## Usage

```ts
import { getPhoneNumberUtil, PhoneNumberFormat, PhoneNumberType } from '@mission-platform/phone-number';

const util = await getPhoneNumberUtil();

// Validation
util.isValidNumber('+14155552671', 'US'); // true
util.isPossibleNumber('12345', 'US'); // false

// Classification
util.getNumberType('07911 123456', 'GB'); // PhoneNumberType.MOBILE
util.getNumberType('+14155552671', 'US'); // PhoneNumberType.FIXED_LINE_OR_MOBILE

// Region lookup
util.getRegionCodeForNumber('+44 20 7946 0958', 'US'); // 'GB'
util.getCountryCodeForRegion('FR'); // 33

// Formatting
util.format('4155552671', 'US', PhoneNumberFormat.NATIONAL); // '(415) 555-2671'
util.format('4155552671', 'US', PhoneNumberFormat.E164); // '+14155552671'
util.format('07911 123456', 'GB', PhoneNumberFormat.INTERNATIONAL); // '+44 7911 123456'
util.format('4155552671', 'US', PhoneNumberFormat.RFC3966); // 'tel:+14155552671'
```

The `defaultRegion` argument (ISO 3166-1 alpha-2) is consulted only when the input is **not** already in international
form (`+…`, `00…`, or the NANP `011…`
IDD prefix).

## Possibility vs. validity

- **`isPossibleNumber`** checks only that the national significant number has a plausible length for the region.
- **`isValidNumber`** additionally requires the number to fall into an assigned fixed-line or mobile range (equivalent
  to `getNumberType(...) !== UNKNOWN`).

```ts
util.isPossibleNumber('05001234567', 'GB'); // true  (right length)
util.isValidNumber('05001234567', 'GB'); //    false (unassigned range)
```

## Supported regions & scope

Upstream libphonenumber ships exhaustive, machine-generated metadata for every ITU region. This port encodes a curated,
hand-verified subset — **US, CA, GB, FR, DE, AU, IN, JP, BR, CN, RU** — and implements validation without regular
expressions (unavailable in AssemblyScript), using length and leading-digit rules. Formatting uses per-region
digit-grouping and is a plausible approximation rather than byte-for-byte parity with upstream. New regions can be added
by extending `assembly/metadata.ts` and rebuilding the wasm.

# `@mission-platform/phone-number`

A focused reimplementation of the core of Google
[libphonenumber](https://github.com/google/libphonenumber) — **parse, validate,
classify and format** international phone numbers — written in
[AssemblyScript](https://www.assemblyscript.org/) and compiled to
**WebAssembly**, wrapped in a typed ES module.

---

## How it works

```
assembly/                  ← AssemblyScript source (compiled to wasm)
  metadata.ts              ← curated per-region metadata (calling codes, lengths, ranges, formats)
  index.ts                 ← parse / validate / classify / format logic
vite.config.ts             ← wires in @mission-platform/vite-plugin-assemblyscript
src/generated/             ← self-contained wasm module (.js @generated; .d.ts maintained contract)
src/index.ts               ← typed `PhoneNumberUtil` façade over the wasm exports
build/                     ← intermediate asc output (phone-number.wasm / .wat)
dist/                      ← built artifact (wasm inlined as base64)
```

The AssemblyScript core is compiled to a `.wasm` binary **by Vite** (via the
`@mission-platform/vite-plugin-assemblyscript` plugin), which is then **inlined
as base64** into a single self-contained JS module (mirroring
`@mission-platform/hunspell`). This avoids any `.wasm` URL resolution in bundlers
or Web Workers and keeps the package free of runtime dependencies.

---

## Usage

```ts
import { getPhoneNumberUtil, PhoneNumberFormat, PhoneNumberType } from '@mission-platform/phone-number';

// Instantiates the WebAssembly module once (memoised).
const util = await getPhoneNumberUtil();

util.isValidNumber('+14155552671', 'US'); // true
util.isPossibleNumber('12345', 'US'); // false

util.getNumberType('07911 123456', 'GB'); // PhoneNumberType.MOBILE
util.getRegionCodeForNumber('+44 20 7946 0958', 'US'); // 'GB'

util.format('4155552671', 'US', PhoneNumberFormat.NATIONAL); // '(415) 555-2671'
util.format('4155552671', 'US', PhoneNumberFormat.E164); // '+14155552671'
util.format('07911 123456', 'GB', PhoneNumberFormat.INTERNATIONAL); // '+44 7911 123456'

util.isValidNumberForRegion('(415) 555-2671', 'US'); // true
util.getSupportedRegions(); // ['US', 'CA', 'GB', …]
util.getExampleNumber('US'); // '+12015550123'
util.formatAsYouType('415555', 'US'); // '(415) 555'
```

The second argument is the **default region** (an ISO 3166-1 alpha-2 code). It is
used only when the input is not already in international form (`+…`, `00…` or
`011…`).

### Synchronous usage

When an `await` boundary is impractical (e.g. rendering a component), obtain the
instance synchronously — the inlined wasm is compiled with the synchronous
`WebAssembly` constructors:

```ts
import { getPhoneNumberUtilSync } from '@mission-platform/phone-number';

const util = getPhoneNumberUtilSync(); // memoised, no await
util.isValidNumberForRegion('(415) 555-2671', 'US'); // true
```

---

## API

`PhoneNumberUtil` (obtained via `getPhoneNumberUtil()` / `PhoneNumberUtil.getInstance()`, or
synchronously via `getPhoneNumberUtilSync()` / `PhoneNumberUtil.getInstanceSync()`):

| Method                                         | Returns               | Description                                               |
| ---------------------------------------------- | --------------------- | --------------------------------------------------------- |
| `getCountryCodeForRegion(region)`              | `number`              | ITU calling code for a region (`0` if unknown).           |
| `getRegionCodeForCountryCode(code)`            | `string \| undefined` | Primary region for a calling code.                        |
| `getRegionCodeForNumber(input, defaultRegion)` | `string \| undefined` | Region the number belongs to.                             |
| `getNationalSignificantNumber(input, region)`  | `string`              | NSN with country code / trunk prefix removed.             |
| `isPossibleNumber(input, defaultRegion)`       | `boolean`             | Whether the length is plausible.                          |
| `isValidNumber(input, defaultRegion)`          | `boolean`             | Whether the number is valid/dialable.                     |
| `isValidNumberForRegion(input, region)`        | `boolean`             | Valid **and** actually belongs to `region`.               |
| `getNumberType(input, defaultRegion)`          | `PhoneNumberType`     | Fixed line / mobile / both / unknown.                     |
| `getSupportedRegions()`                        | `string[]`            | The ISO region codes the metadata supports.               |
| `getExampleNumber(region)`                     | `string \| undefined` | A representative example number (E.164).                  |
| `format(input, defaultRegion, format)`         | `string \| undefined` | Renders `E164`, `INTERNATIONAL`, `NATIONAL` or `RFC3966`. |
| `formatAsYouType(input, region)`               | `string`              | Incrementally formats a partial national input.           |

---

## Building

AssemblyScript is compiled **by Vite** — the
`@mission-platform/vite-plugin-assemblyscript` plugin runs the AssemblyScript
compiler in the Vite `buildStart` hook and regenerates `src/generated`. No
Docker or native toolchain is required.

```bash
# Full build (asc → wasm via Vite + typecheck + bundle + declarations):
pnpm --filter @mission-platform/phone-number build

# Just run Vite (recompiles AssemblyScript and regenerates src/generated):
pnpm --filter @mission-platform/phone-number exec vite build
```

---

## Scope

Google's libphonenumber ships exhaustive, machine-generated metadata for every
ITU region. This port encodes a **curated, hand-verified subset** of regions
(US, CA, GB, FR, DE, AU, IN, JP, BR, CN, RU) and implements the core operations
without relying on regular expressions (unavailable in AssemblyScript).
Validation is length- and leading-digit based, and formatting uses per-region
grouping rules — plausible approximations rather than byte-for-byte parity with
upstream. Additional regions can be added in `assembly/metadata.ts`.

---

## Regex precompilation engine (toward full upstream parity)

Google's libphonenumber drives validation, number-type classification and
formatting almost entirely with JavaScript `RegExp` applied to per-region
patterns in its metadata. AssemblyScript has **no native `RegExp`**, so full
parity uses a **precompile-patterns** approach: patterns are compiled ahead of
time into compact, flat `i32` bytecode, and a tiny backtracking VM executes that
bytecode at runtime — keeping the wasm core regex-free.

```
src/regex/bytecode.ts        ← shared opcode / program contract
src/regex/compiler.ts        ← build-time regex → bytecode compiler
src/regex/reference-vm.ts    ← TypeScript reference VM (full/prefix/search + captures)
assembly/regex.ts            ← the same VM in AssemblyScript (runs inside wasm)
src/metadata/pattern-corpus.ts ← captured upstream pattern corpus (TypeScript data, for diff-testing)
```

Supported syntax (the subset used by the metadata): literals, `.`, character
classes with ranges/negation, `\d \D \w \W \s \S`, capturing and `(?:)` groups,
alternation, the quantifiers `* + ?` and `{n} {n,} {n,m}` (greedy/lazy), and the
`^`/`$` anchors. The compiler and both VMs are validated against the **entire
upstream pattern corpus** (500+ patterns) and diff-tested against the native
engine and each other. The corpus is captured directly in
`src/metadata/pattern-corpus.ts` (no vendored upstream sources are required).

### Roadmap

The curated runtime API now covers parsing, validity (including
`isValidNumberForRegion`), classification, formatting, example numbers,
supported-region listing and an as-you-type national formatter — enough to back
`BasePhoneInput` without any third-party phone-number library. The precompilation
engine remains the foundation for the in-progress **full-parity** ports of
`PhoneNumberUtil`, `AsYouTypeFormatter` and `ShortNumberInfo` over precompiled
all-region metadata (with the original upstream test suites); until those land,
the shipped surface stays the curated approximation documented above.

# `@mission-platform/phone-number`

A focused reimplementation of the core of Google
[libphonenumber](https://github.com/google/libphonenumber) — **parse, validate, classify and format** international
phone numbers — written in Forge Web Script and compiled to **WebAssembly**, wrapped in a typed ES module.

---

## How it works

```
src/phone-number.fws       ← Forge Web Script parse / validate / classify / format logic
src/phone-number.fws.d.ts  ← typed pointer-length ABI contract
src/index.ts               ← typed `PhoneNumberUtil` façade over the wasm exports
dist/                      ← built artifact (wasm inlined as base64)
```

The Forge Web Script core is compiled to a `.wasm` binary by
`@mission-platform/vite-plugin-forge-web-script`, then **inlined as base64** into the bundled ES module. The TypeScript
façade owns the FWS pointer-length UTF-8 boundary, so consumers continue to use ordinary strings and booleans without
touching the raw WebAssembly ABI.

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

The second argument is the **default region** (an ISO 3166-1 alpha-2 code). It is used only when the input is not
already in international form (`+…`, `00…` or
`011…`).

### Synchronous usage

When an `await` boundary is impractical (e.g. rendering a component), obtain the instance synchronously — the embedded
FWS wasm bytes are instantiated with the synchronous `WebAssembly` constructors:

```ts
import { getPhoneNumberUtilSync } from '@mission-platform/phone-number';

const util = getPhoneNumberUtilSync(); // memoised, no await
util.isValidNumberForRegion('(415) 555-2671', 'US'); // true
```

---

## API

`PhoneNumberUtil` (obtained via `getPhoneNumberUtil()` / `PhoneNumberUtil.getInstance()`, or synchronously via
`getPhoneNumberUtilSync()` / `PhoneNumberUtil.getInstanceSync()`):

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

Forge Web Script is compiled during the bundle step by
`@mission-platform/vite-plugin-forge-web-script`. No Docker or native toolchain is required.

```bash
# Full build (FWS → wasm + typecheck + bundle + declarations):
pnpm --filter @mission-platform/phone-number build
```

---

## Scope

Google's libphonenumber ships exhaustive, machine-generated metadata for every ITU region. This port encodes a
**curated, hand-verified subset** of regions (US, CA, GB, FR, DE, AU, IN, JP, BR, CN, RU) and implements the core
operations without relying on regular expressions. Validation is length- and
leading-digit based, and formatting uses per-region grouping rules — plausible approximations rather than byte-for-byte
parity with upstream. Additional regions can be added in `src/phone-number.fws`.

---

## Regex precompilation engine (toward full upstream parity)

Google's libphonenumber drives validation, number-type classification and formatting almost entirely with JavaScript
`RegExp` applied to per-region patterns in its metadata. Forge Web Script uses a **precompile-patterns** approach for
full parity: patterns are compiled ahead of time into compact, flat `i32` bytecode, and a tiny backtracking VM executes
that bytecode at runtime — keeping the wasm core regex-free.

```
@mission-platform/forge-web-script-regex  ← shared Forge bytecode contract/compiler
  /reference                            ← TypeScript oracle (tests only)
src/phone-number.fws                     ← current Forge Web Script runtime entry point
src/metadata/pattern-corpus.ts          ← captured upstream pattern corpus (diff-testing)
```

Supported syntax (the subset used by the metadata): literals, `.`, character classes with ranges/negation,
`\d \D \w \W \s \S`, capturing and `(?:)` groups, alternation, the quantifiers `* + ?` and `{n} {n,} {n,m}`
(greedy/lazy), and the
`^`/`$` anchors. The shared compiler and reference oracle are validated against the **entire upstream pattern corpus**
(500+ patterns) and the native engine. The corpus is captured directly in `src/metadata/pattern-corpus.ts` (no vendored
upstream sources are required).

### Roadmap

The curated runtime API now covers parsing, validity (including
`isValidNumberForRegion`), classification, formatting, example numbers, supported-region listing and an as-you-type
national formatter — enough to back
`ForgePhoneInput` without any third-party phone-number library. The precompilation engine remains the foundation for the
in-progress **full-parity** ports of
`PhoneNumberUtil`, `AsYouTypeFormatter` and `ShortNumberInfo` over precompiled all-region metadata (with the original
upstream test suites); until those land, the shipped surface stays the curated approximation documented above.

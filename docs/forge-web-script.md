# Forge Web Script v1

Forge Web Script (`.fws`) is a small, general-purpose language for WebAssembly
workloads. It is web-first, capability-based, and deliberately independent of
Vue, React, the DOM, and the Forge component compiler. This document is the
authoritative v1 language and module contract. `@mission-platform/forge-web-script`
is the browser-safe compatibility facade for parsing, type checking, graph/link
resolution, manifest data, and the compiler service API used by the Vite adapter
and LSP. `@mission-platform/forge-web-script-wasm` is the deterministic backend
that lowers checked IR to validated WebAssembly and WAT. The Node-only
`@mission-platform/forge-web-script-cli` package provides the `forge-web-script`
command for checking and compiling files or source graphs. The TypeScript
package also contains the executable conformance fixtures.

## Status and versioning

The current contract is **language version `1.0`** and **logical ABI version
`1.2`**. The language version describes source and semantics; the ABI version
describes the WebAssembly boundary and host protocol. They are versioned
independently. A compiler must write both versions into every generated module
manifest, and a loader must validate both before instantiation. ABI `1.2` is a
breaking revision of the memory contract: `memory` manifests must declare
`allocatorExport: "fws_alloc"`, `deallocatorExport: "fws_dealloc"`, and
`reallocatorExport: "fws_realloc"`, while `fws_reset` must be present in the
module export set. Loaders reject older or incomplete manifests and modules
rather than silently assuming the missing reallocator.

The source format is UTF-8 text with the `.fws` extension. A source file is a
file-defined module; its identity is derived from the normalized Vite file ID
(or workspace-relative path). The compiler input identifies the language version, while the
generated manifest is the persisted version marker consumed by loaders. Future
revisions may add a source pragma, but v1 does not require one; a v1 compiler
must reject a source construct it does not understand rather than guessing its
version.

## Exception-free outcomes and structured control flow

Forge Web Script represents recoverable outcomes with the standard-library
`Option<T>` and `Result<T, E>` enums. Use `match` to handle every variant;
source-level `throw`, `try`, and `catch` are not executable constructs. The
structured `for`, `while`, and `do while` forms are executable v1 control flow;
they are not exception or iterator constructs. `Result` has exactly the
variants `Ok(T)` and `Error(E)`.

Iterator functions use `iter fn`, return `Iterator<T>`, and suspend at `yield`:

```fws
export iter fn forward(source: Iterator<i32>) -> Iterator<i32> {
  loop value = source.next() { yield value; }
}
```

The compiler exposes an iterator export through a JavaScript-compatible
`next()` adapter. Each call returns `{ value, done: false }` for a value and
`{ value: undefined, done: true }` on completion; subsequent calls remain
complete. `Iterator<T>.next()` is typed as `Option<T>`, so chained iterators
must preserve the element type and ownership contract.

## Optimization and target profiles

Release optimization can apply proven iterator unrolling, pure-call inlining,
tail-call analysis, and safe conditional folding. Use the `noinline` directive
when a function boundary must remain visible. Capability imports and logging
are observable side effects and are not reordered. Target features are opt-in
compile input and are recorded in the ABI manifest and cache key:

```ts
const artifact = compileForgeWebScript({
  source,
  fileName: "runtime.fws",
  compilerVersion: "1.0.0",
  optimization: "release",
  targetFeatures: { simd: true, tailCall: true, memory64: true },
  compilerHints: { iteratorUnrollLimit: 4 },
});
```

`threads` and `atomics` must both be enabled for shared-memory atomic output;
unsupported combinations produce diagnostics. A memory64 manifest uses `u64`
addresses and pointer-length-u64 values. In debug mode, a configured cache may
persist deterministic `<key>.optimized.wat`, `<key>.unoptimized.wat`,
`<key>.optimized.wasm`, and `<key>.unoptimized.wasm` artifacts. Cache writes
are additive and unavailable or failing caches do not fail compilation.

## Lexical reference

Whitespace is insignificant except inside strings. `//` starts a comment that
runs to the end of the line. `/*` starts a block comment that ends at the next
`*/`; block comments may span lines. Comments are trivia and do not enter the
grammar. Identifiers start with `A-Z`, `a-z`, or `_`, and
continue with those characters or decimal digits. Identifiers are
case-sensitive. Integer literals are non-negative decimal sequences; v1 does
not accept hexadecimal, octal, or floating-point literal syntax in the
bootstrap subset. Strings use double quotes and only JSON-compatible escapes:
`\\`, `\"`, `\/`, `\b`, `\f`, `\n`, `\r`, `\t`, and `\uXXXX` with exactly
four hexadecimal digits. Raw line terminators and invalid escapes are lexical
errors; use `\n` or `\r` instead. String values are UTF-8 values.

The reserved words are `as`, `capability`, `case`, `class`, `constructor`, `do`,
`else`, `enum`, `extends`, `export`, `for`, `fn`, `if`, `impl`, `import`,
`interface`, `let`, `loop`, `match`, `module`, `new`, `noinline`, `return`,
`struct`, `switch`, `trait`, `try`, `while`, `throw`, and `yield`. `true` and
`false` are boolean literals. Punctuation is
`{ } ( ) [ ] : ; , | .`; operators are
`! % * + - / < <= == != > >= && || = -> => ::`.

Every diagnostic span is a half-open source-offset range `[start, end)` in the
original UTF-16 TypeScript string (offsets count UTF-16 code units), with
one-based line and column fields. The
bootstrap implementation reports offsets and line/column data together so a
Vite adapter can produce source-mapped diagnostics without reparsing.

### Function documentation comments

A block comment whose opening delimiter is `/**` is a documentation comment.
It is attached to the next top-level `fn` or `export fn` declaration when only
whitespace and ordinary comments occur between the comment and the declaration:

```fws
/**
 * Adds one to a value.
 *
 * @param value The value to increment.
 * @return The incremented value.
 * @deprecated Use `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}
```

Documentation comments before capability imports, source imports, structs,
enums, interfaces, or other non-function declarations are discarded. They do
not carry forward to a later function. If several documentation comments occur
before one declaration, the closest (last) documentation comment is used;
ordinary `//` and `/* ... */` comments do not replace it. Documentation is
recognized only at the top level; comments inside function bodies are not
function metadata. An unterminated block comment produces the stable lexical
diagnostic `FWS-LEX-003` and parser recovery remains available for the rest of
the source.

The normalized AST metadata has this shape:

```ts
interface ForgeWebScriptDocumentation {
  readonly description: string;
  readonly tags: readonly ForgeWebScriptDocumentationTag[];
}

interface ForgeWebScriptDocumentationTag {
  readonly name: string;
  readonly subject?: string;
  readonly text: string;
}
```

The normalizer removes the `/**` and `*/` delimiters, leading whitespace, the
optional leading `*` decoration on each line, and surrounding whitespace. Runs
of whitespace collapse to one space. Description lines before the first tag
are grouped into paragraphs; blank lines remain paragraph breaks. A tag starts
on a line beginning with `@`, and non-empty following lines continue the
previous tag. Tag order and duplicate tags are preserved.

The commonly used tag forms are:

| Tag form                                                 | Structured fields                            |
| -------------------------------------------------------- | -------------------------------------------- |
| `@param name text`, `@arg`, `@argument`, or `@parameter` | `name` is `subject`; the remainder is `text` |
| `@typeparam name text`                                   | `name` is `subject`; the remainder is `text` |
| `@throws type text` or `@exception type text`            | `type` is `subject`; the remainder is `text` |
| `@return text` or `@returns text`                        | `text` only                                  |
| `@deprecated text`                                       | `text` only                                  |

Other `@name` forms are accepted and retained as ordered tags rather than
reported as diagnostics. They have no inferred subject; their remaining text
is preserved. Tag names are case-sensitive.

For editor consumers, the same metadata is rendered deterministically as the
description followed by each tag in source order, with blank lines between
parts. A subject is emitted between the tag name and its text, for example:

```text
Adds one to a value.

@param value The value to increment.

@return The incremented value.

@deprecated Use `increment` in new code.
```

Documentation is analysis metadata, not executable language semantics. It may
be preserved in the AST and IR for language-service consumers, but it does not
affect parsing of declarations, type checking, lowering, or runtime behavior.
Documentation is excluded from ABI signatures and manifests, generated
declarations and loader artifacts, Wasm/WAT, executable content hashes, and
capability requirements. Changing only a documentation comment therefore does
not change the module's ABI or generated executable contract.

## Source grammar

The following grammar describes the v1 bootstrap surface. The grammar uses
`*` and `?` in the usual EBNF sense:

```ebnf
module       = { import | function } ;
import       = "import", "capability", string, "as", identifier,
               "(", [ parameters ], ")", "->", type, ";" ;
sourceImport = "import", string, "as", identifier, ";" ;
function     = [ "export" ], "fn", identifier, "(", [ parameters ], ")",
               "->", type, block ;
parameters   = parameter, { ",", parameter } ;
parameter    = identifier, ":", type ;
block        = "{", { statement }, "}" ;
statement    = "let", identifier, ":", type, "=", expression, ";"
             | "return", [ expression ], ";"
             | "if", expression, block, [ "else", block ]
             | "while", expression, block
             | "for", "(", [ for-clause ], ";", expression, ";",
               [ for-clause ], ")", block
             | "do", block, "while", expression, ";"
             | identifier, "=", expression, ";"
             | expression, ";" ;
for-clause   = "let", identifier, ":", type, "=", expression
             | identifier, "=", expression
             | expression ;
type         = "bool" | "bytes" | "f32" | "f64" | "i32" | "i64"
             | "string" | "u32" | "u64" | "unit" ;
expression   = literal | identifier | call | unary | binary ;
call         = identifier, "(", [ expression, { ",", expression } ], ")" ;
unary        = ( "!" | "-" ), expression ;
literal      = integer | string | "true" | "false" ;
```

Binary operators follow these precedence levels, from strongest to weakest:
`* / %`, `+ -`, ordered comparisons, equality, `&&`, and `||`. Operators are
left-associative. Parenthesized expressions are reserved for the next bootstrap
revision; a compiler must issue a parse diagnostic rather than silently
accepting them today.

This grammar is the **bootstrap** grammar. It covers file-defined modules,
capability/source imports, primitive signatures, calls, local values,
expressions, structured `if`/`else`, `while`, C-style `for`, `do while`, and
`return`. The loop forms are part of the executable bootstrap contract; only
the reserved exception words `throw`, `try`, and `catch` are rejected as
executable constructs. Aggregate declarations and values below are the
**extended** contract and must not be treated as an alternative spelling for
the bootstrap grammar.

### Extended aggregate grammar

The extended contract adds immutable structs, tagged enums, generic types,
interfaces, function values, collection literals, indexing, and `match`.
Their core source forms are:

```ebnf
aggregate    = struct | enum | interface ;
struct       = "struct", identifier, [ generic_parameters ], "{",
               { identifier, ":", type, ";" }, "}" ;
enum         = [ "export" ], "enum", identifier, [ generic_parameters ], "{",
               variant, { ",", variant }, [ "," ], "}" ;
variant      = identifier, [ "(", [ parameters ], ")" ] ;
generic_parameters = "<", generic_parameter, { ",", generic_parameter }, ">" ;
generic_parameter  = identifier, [ ":", identifier ] ;
type         = primitive | identifier, [ "<", type, { ",", type }, ">" ]
             | "[", type, ";", integer, "]"
             | "Fn", "<", type, ",", type, ">" ;
constructor  = identifier, "::", identifier, "(", [ expression ], ")" ;
match        = "match", expression, "{", match_arm, { ",", match_arm }, "}" ;
match_arm    = pattern, "=>", expression ;
pattern      = "_" | identifier, [ "(", [ identifier, { ",", identifier } ], ")" ] ;
```

Qualified constructors such as `Result::Ok(value)` and
`Result::Error(message)` resolve against the aggregate and validate variant
arity and field types. The standard `Result<T, E>` variants are exactly
`Ok(T)` and `Error(E)`; `Option<T>` remains `Some(T)` and `None`. A function
value uses `fn name` and a declared `Fn<parameter, result>` type, for example
`let callback: Fn<i32, i32> = fn increment;`. Function values are checked by
the referenced function signature and are callable only with matching arity
and argument types.

Match bindings are local to their arm: `Result::Ok(item) => item` binds
`item` while checking that expression only. Binding names must be unique in an
arm and their count must match the selected variant fields; they do not leak
to sibling arms or the surrounding function.

## Types and semantics

V1 has the primitive types `bool`, signed `i32`/`i64`, unsigned `u32`/`u64`,
`f32`/`f64`, `string`, `bytes`, and `unit`. There are no implicit numeric
conversions. Arithmetic operands must have the same numeric type; comparisons
produce `bool`; logical operators require `bool`; equality requires equal
types. A function has one declared result type and a `unit` function returns
without a value.

### Compiler-owned regular expressions

Forge Web Script provides a deterministic regular-expression standard library.
The calls `regex_full_match(pattern, value) -> bool`,
`regex_prefix_match(pattern, value) -> bool`, and
`regex_search(pattern, value, start: i32) -> bool` perform whole-value,
position-zero prefix, and leftmost search matching respectively. Capture bounds
are available through the corresponding `regex_*_capture_start` and
`regex_*_capture_end` calls; they take a group index and return a UTF-16 string
offset, or `-1` when there is no match or the group is unset. Search capture
calls additionally take the starting offset before the group index.

Regex calls are compiler-owned standard-library functions. They are typed by
the frontend, annotated in IR, and are never capability imports. A module using
only regex calls therefore has an empty `imports` array and an empty
`requiredCapabilities` array. Backend lowering and the in-module VM are a
separate implementation phase; a compiler must not replace these calls with a
browser `RegExp`, Node API, or implicit host import.

The supported syntax is intentionally restricted to literals, `.`, character
classes and ranges (including `^` negation), `\d`, `\D`, `\w`, `\W`, `\s`,
`\S`, escaped literals, capturing and non-capturing groups, alternation,
`*`, `+`, `?`, bounded `{n}`, `{n,}`, `{n,m}` quantifiers, lazy quantifiers,
and `^`/`$` anchors. Backreferences, lookaround, named groups, flags, and
other host-engine extensions are rejected. Unsupported syntax has the stable
`FWS-REGEX-001` diagnostic; malformed patterns use `FWS-REGEX-002`, and an
internal compiler invariant failure uses `FWS-REGEX-003`.

The shared package `@mission-platform/forge-web-script-regex` owns the stable
bytecode (`FORGE_REGEX_BYTECODE_VERSION`) and build-time compiler. Its explicit
`/reference` entry point exposes a TypeScript VM only as a conformance oracle
for native-engine and backend differential tests; the package root does not
expose that VM. Phone-specific metadata remains in the phone-number package.
Production regex execution belongs to the Forge Web Script backend and the
generated WASM module, never to a TypeScript runtime layer or host capability.

`string` and `bytes` are the v1 aggregate values. A string is an immutable
sequence of Unicode scalar values represented as UTF-8 at the ABI boundary.
Bytes are an immutable sequence of octets and may contain any value from
`0x00` through `0xff`. Their source-level operations are intentionally small
in the bootstrap subset; host calls and later standard-library modules provide
encoding, slicing, and collection operations without adding ambient browser
APIs to the language.

### Collection signatures

The extended collection contract is structural and receiver-based; it does
not add arbitrary object methods. Fixed arrays are written `[T; N]` and
vectors as `Vector<T>`. The supported signatures are:

| Receiver | Method | Signature |
| --- | --- | --- |
| `Array<T>` | `length` | `() -> u32` |
| `Array<T>` | `get` | `(u32) -> Option<T>` |
| `Array<T>` | `set` | `(u32, T) -> Array<T>` |
| `Array<T>` | `iter` | `() -> Iterator<T>` |
| `Vector<T>` | `length` | `() -> u32` |
| `Vector<T>` | `get` | `(u32) -> Option<T>` |
| `Vector<T>` | `set` | `(u32, T) -> Vector<T>` |
| `Vector<T>` | `push` or `add` | `(T) -> Vector<T>` |
| `Vector<T>` | `pop` | `() -> Option<T>` |
| `Vector<T>` | `iter` | `() -> Iterator<T>` |

The `add` spelling is intentionally a compatibility alias for vector
`push`; it is not an array method. Indices are `u32`, element arguments must
match `T`, and return values must match the signatures above. Wrong arity,
argument types, receiver kinds, and unknown methods are type-checking errors.
Empty literals require contextual element type, while non-empty array/vector
literals infer their element type recursively and reject mixed elements. A
fixed array literal must contain exactly `N` elements.

Locals are function-scoped, initialized exactly once, and cannot be read before
their declaration. A local declaration shadows no existing name: duplicate
names are an error. Functions and capability aliases share one module namespace
and must be unique. A call must name a declared function or imported
capability, and its arity and argument types must match exactly.

The v1 control-flow surface is structured `if`/`else`, `while`, C-style `for`,
`do while`, and early `return`. `for` clauses are explicit statements and do
not introduce classes, receivers, or implicit mutation outside the loop's
local value environment. There is no implicit fall-through result: every
reachable path in a non-`unit` function must return the declared type. The
bootstrap checker reports return type errors; reachability analysis is a
required follow-up before declaring a compiler fully v1-conformant.

FWS is intentionally class-free. `class`, `constructor`, `extends`, `impl`,
`new`, and `trait` are reserved and rejected with stable diagnostic
`FWS-PARSE-052`; immutable structs, tagged enums, interfaces, and function
values are the supported value-oriented alternatives. The staged self-hosting
contract keeps the checked-in TypeScript compiler as a seed while FWS compiler
and runtime contracts are bootstrapped incrementally.

## File-defined modules, source imports, and exports

There is no nested `module` declaration. Every `.fws` file is a module and its
stable name is derived from its normalized file ID. For example,
`src/time.fws` in project `/workspace/app` has module ID `src/time`. Nested
`module name { ... }` syntax is rejected with a migration diagnostic.

Source-module imports are distinct from host capability imports:

```fws
import "./math.fws" as math;
import capability "clock.now" as now() -> i64;
```

The Vite adapter resolves source imports through its module graph. Dependencies
inside one project are statically linked by default. Cross-project edges default
to dynamic loading and can be configured as `static` or `dynamic` with explicit
project-root link configuration. Missing modules, cycles unsupported by the
selected link mode, and identity collisions are graph diagnostics.

Static links flatten reachable guest exports into one artifact. Export collisions
are rejected deterministically (`FWS-LINK-003` for duplicate signatures and
`FWS-LINK-004` for incompatible signatures); the linker does not silently
namespace or overwrite guest functions. Dynamic links remain separate module
boundaries and are recorded as source-module imports in the ABI manifest, never
as ambient host capabilities.

Only declarations preceded by `export` are public. Export names are stable,
case-sensitive strings and are sorted lexicographically in a generated
manifest. Private functions may be used by exported functions but are not
visible to the host. There is no wildcard export and no ambient import.

Capability imports have a quoted, host-owned name and a guest-local alias:

```fws
import capability "clock.now" as now() -> i64;

export fn current_time() -> i64 {
  return now();
}
```

The quoted capability name, alias, parameter names/types, and result type are
all included in the manifest. Imports are deterministic: duplicate aliases or
capability declarations are rejected, and required capability names are
deduplicated and sorted. The host supplies implementations by capability name;
the guest cannot discover or call a capability that is absent from its
manifest.

## Logical capability ABI

Forge Web Script uses a WASI-inspired _logical_ boundary, not a claim of full
WASI compatibility. A capability is a narrow, explicit host function such as
`clock.now`, `random.bytes`, or `storage.read`. Capability names are owned by
the platform, and each name has a separately versioned signature. DOM objects,
`window`, `document`, Node built-ins, network clients, and other browser globals
are never ambient guest dependencies.

The loader performs these checks before instantiation:

1. The manifest format, language version, and ABI version are supported.
2. Every required capability is present in the host registry.
3. Every supplied capability has the exact declared signature and no undeclared
   guest import is accepted.
4. Memory, allocator, export, and import declarations are internally
   consistent.

Capability discovery is an explicit host operation. A host may expose a
capability inventory to application code, but the guest only receives the
imports declared by its module. Missing or denied capabilities fail with a
load-time `CapabilityDenied` trap; they do not become `undefined` or a
silent no-op.

## Values, linear memory, and ownership

The module uses one WebAssembly linear memory with 64 KiB pages and little-endian
scalar values. Scalar values map as follows:

| Forge Web Script  | WebAssembly representation                 |
| ----------------- | ------------------------------------------ |
| `bool`            | `i32`, where `0` is false and `1` is true  |
| `i32`, `u32`      | `i32`                                      |
| `i64`, `u64`      | `i64`                                      |
| `f32`, `f64`      | matching WebAssembly float                 |
| `unit`            | no result value                            |
| `string`, `bytes` | two `u32` values: pointer then byte length |

The manifest declares the same mapping in `valueRepresentations`. A
pointer-length pair is always checked as an unsigned range before reading or
writing: `pointer <= memory.byteLength` and `length <= byteLength - pointer`.
Zero length is valid and may use any in-bounds pointer, including the end of
memory. A failed check traps with `MemoryOutOfBounds` and never exposes a
partially decoded value.

The generated module exports `fws_alloc(size: u32) -> u32`,
`fws_dealloc(pointer: u32, size: u32) -> unit`, and
`fws_realloc(pointer: u32, oldSize: u32, newSize: u32) -> u32` as the ownership
boundary for buffers. In signature shorthand, the operation is
`fws_realloc(pointer, oldSize, newSize) -> pointer`. The caller that allocates a buffer owns it and must
deallocate or reallocate it using the same module and its exact current size.
The reallocator prefers to resize the current high-water allocation in place,
including shrinking and growing when linear memory can grow. Otherwise it
allocates a replacement, copies exactly `min(oldSize, newSize)` bytes, and
releases the old allocation before returning the replacement pointer. A
zero-size result is valid, and an equal-size request returns the original
pointer. Host implementations must copy input bytes before the guest call
returns unless the manifest explicitly introduces a future borrowed buffer
contract. Guest code must not retain a host-owned pointer after a host call.
Allocation or growth failure traps with `MemoryExhausted`; an invalid pointer or
size range traps with `MemoryOutOfBounds`; and a stale pointer, incorrect
`oldSize`, double free, or invalid free traps with `InvalidOwnership`. These
checks happen before mutation, and a failed reallocation leaves the original
allocation and bytes unchanged.

Host exceptions are converted to `HostError` with the capability name and an
opaque host error code. Guest traps are never converted into ordinary return
values. Hosts may log trap details, but they must not expose secrets or raw
browser exceptions to untrusted guest code.

### Raw WASM ABI and generated ESM contract

The representation above is the stable raw WASM ABI. It is intentionally
low-level and does not change when the generated JavaScript facade becomes more
ergonomic:

```text
raw string value: (pointer: u32, length: u32)
raw bytes value:  (pointer: u32, length: u32)
```

The compiler-generated ESM artifact projects that ABI into a JavaScript API:

```ts
type ForgeWebScriptBytes = readonly [pointer: number, length: number];

interface ForgeWebScriptExports {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (
    pointer: number,
    oldSize: number,
    newSize: number,
  ) => number;
  readonly fws_reset: () => void;
  readonly echo: (value: string) => string;
  readonly processBytes: (value: ForgeWebScriptBytes) => ForgeWebScriptBytes;
}
```

Every generated declaration, including capability imports and dynamic linked
exports, uses `string` for FWS `string` values. The generated `load` and
`loadSync` wrappers encode JavaScript strings as UTF-8, pass pointer-length
pairs to the unchanged WASM ABI, and decode returned strings back to JavaScript
strings. Decoding uses a fatal UTF-8 decoder: malformed guest bytes are an
explicit boundary error rather than replacement characters.

String arguments for one call are encoded first and packed into one contiguous
guest allocation. This keeps the raw ABI unchanged while avoiding one guest
allocation and JavaScript-to-WASM copy per argument. Scalar arguments retain
their direct fast path. `bytes` is deliberately not converted to `Uint8Array`:
callers continue to pass and receive `ForgeWebScriptBytes`, and `memory` is
exposed so callers can read or write raw byte ranges using the module's memory
and ownership rules.

The generated adapter owns temporary buffers created for string arguments and
string results. It decodes a result before releasing it, then releases each
temporary range exactly once in a `finally` path on success, guest traps, host
exceptions, and decode failures. A host capability with string values receives
JavaScript strings and may return a JavaScript string; the wrapper performs the
guest allocation and UTF-8 copy for that return value. Host code must still copy
raw `bytes` inputs before returning unless a future manifest explicitly declares
a borrowed-buffer contract. `load` and `loadSync` expose the same generated
contract; they differ only in module initialization scheduling.

Changing this JavaScript projection does not change `valueRepresentations`, the
raw pointer-length ABI, the ABI version, or the raw WASM content hash.
The generated artifact keeps one lazily decoded embedded-WASM representation;
`load` and `loadSync` share it rather than materializing separate payload
copies. Consequently, async-versus-sync loader checks should compare behavior
and declarations, while deterministic content-hash checks should hash the raw
WASM bytes independently of generated ESM source size or loader implementation
details.

## Manifest format

Each generated module has a stable JSON-compatible ABI manifest alongside its
WASM artifact and typed ESM loader:

```json
{
  "format": "forge-web-script-module",
  "languageVersion": "1.0",
  "abiVersion": "1.2",
  "moduleName": "src/clocked",
  "exports": [{ "name": "current_time", "parameters": [], "result": "i64" }],
  "imports": [
    {
      "capability": "clock.now",
      "alias": "now",
      "function": { "name": "now", "parameters": [], "result": "i64" }
    }
  ],
  "sourceImports": [],
  "requiredCapabilities": ["clock.now"],
  "memory": {
    "pageSize": 65536,
    "addressType": "u32",
    "ownership": "caller-owned",
    "stringEncoding": "utf8",
    "byteArrayRepresentation": "pointer-length",
    "allocatorExport": "fws_alloc",
    "deallocatorExport": "fws_dealloc",
    "reallocatorExport": "fws_realloc"
  },
  "valueRepresentations": { "i64": "i64", "string": "pointer-length-u32" },
  "trapModel": "explicit-trap",
  "standardLibrary": { "regexBytecodeVersion": "bytecode-1" }
}
```

The actual manifest contains all primitive representation entries, not only
those used by the example. JSON keys for exports, imports, and capabilities are
stable across repeated builds; source maps and content hashes are emitted by
the compiler adapter and are not part of ABI signature matching.

The `standardLibrary` manifest field records compiler-owned library identities.
For regex, `regexBytecodeVersion` and an optional `regexCorpusHash` are cache
and artifact inputs. The normalized source, compiler version, optimization
mode, module graph, link configuration, standard-library identity, and metadata
corpus hash must be serialized in a stable order before cache lookup. Identical
inputs produce identical bytecode tables, manifests, declarations, WAT, and
content hashes; changing any identity input is a cache miss. A corpus hash is
owned by the package providing the corpus and must not be inferred from host
runtime state.

## Compiler and CLI boundaries

The public TypeScript facade keeps frontend contracts and orchestration separate
from emission. It accepts a source file or resolved graph, produces structured
diagnostics plus typed IR, and delegates WebAssembly/WAT generation to
`@mission-platform/forge-web-script-wasm`. The backend validates its bytes before
returning them; errors suppress executable output. The Vite adapter and LSP use
the facade and do not need to depend on the Node CLI.

For filesystem workflows, install `@mission-platform/forge-web-script-cli` and
use its standalone `forge-web-script` binary:

```text
forge-web-script check <entry.fws> [--root <directory>] [--project-root <directory>]
forge-web-script compile <entry.fws> --out-dir <directory>
  [--root <directory>] [--project-root <directory>]
  [--link-mode static|dynamic] [--capability <name>] [--optimization debug|release]
```

`check` validates source and graph inputs without writing files. A successful
`compile` writes exactly `<entry>.wasm`, `<entry>.wat`, `<entry>.abi.json`,
`<entry>.d.ts`, `<entry>.js`, and `<entry>.map` to the selected output directory.
The CLI stages and renames the complete set only after diagnostics are clear, so
malformed source, unresolved graph edges, denied capabilities, and ABI errors
leave no executable artifact and return a non-zero status. Output ordering,
manifest JSON, WAT, declarations, loader data, source maps, and content hashes
are deterministic for identical inputs.

## Vitest and Vite test integration

Use `@mission-platform/forge-web-script-vitest` when a Vitest suite needs to
assert compiler artifacts, structured diagnostics, Wasm behavior, graph links,
or the generated Vite module contract. Its direct harness methods (`compile`,
`compileSource`, `compileGraph`, `inspect`, `load`, `loadSync`, and
`checkVmParity`) delegate to the public compiler/runtime contracts; its
`defineForgeWebScriptVitestConfig` helper installs the production
`forgeWebScriptPlugin` while preserving consumer Vite plugins and settings.
See [Testing in Mission Platform](testing.md#forge-web-script-tests) for the
configuration and fixture examples.

The harness accepts host functions only through explicit capability maps keyed
by manifest capability names, for example:

```ts
const exports = await harness.load<{ current: () => bigint }>(
  "capabilities/clock-now.fws",
  {
    "clock.now": { now: () => 123n },
  },
);
```

Missing declared imports and undeclared supplied imports are failures. Test
projects that import `.fws` or its virtual artifact queries should add the
type-only declaration subpath
`@mission-platform/forge-web-script-vitest/forge-web-script` to their
TypeScript `types` list or a referenced test type entrypoint.

The shared harness fixtures under
`packages/forge-web-script-vitest/fixtures/` are the cross-package corpus for
valid modules, diagnostics, capabilities, graphs, and self-hosted parity.
Package-local fixtures remain appropriate for compiler, runtime, and plugin
tests that exercise private details.

`checkVmParity` reports the bounded self-hosted lex-stage parity contract in
`interpret`, `jit`, or `aot` mode. Assert parity, fingerprints, step counts,
and AOT reproducibility metadata, but do not treat this report as arbitrary
compiled-FWS VM execution; Wasm loading remains the runtime behavior check.

## Diagnostics

Diagnostics are structured records with `code`, `severity`, `phase`, `message`,
`fileName`, and a source `span`; actionable records may also include `hint`.
The phase is one of `lex`, `parse`, `type-check`, or `abi`. Stable v1 code
families include:

| Code family   | Meaning                                                      |
| ------------- | ------------------------------------------------------------ |
| `FWS-LEX-*`   | invalid characters/escapes, raw string line terminators, or unterminated strings/comments |
| `FWS-PARSE-*` | invalid module, declaration, statement, or expression syntax |
| `FWS-TYPE-*`  | invalid primitive type, name, operator, argument, or return  |
| `FWS-ABI-*`   | duplicate names, denied capabilities, exports, or imports    |
| `FWS-REGEX-*` | unsupported or malformed compiler-owned regex patterns       |

Errors prevent artifact generation. Warnings and informational diagnostics do
not change semantics. Diagnostic ordering is source order, followed by phase
order for diagnostics attached to the same span. A Vite adapter must preserve
the stable code and span when forwarding an error to Vite.

## Bootstrap conformance contract

The v1 compiler target is intentionally limited to the language and ABI surface
documented here. A program is in the bootstrap subset if it uses one
module, the lexical rules above, primitive types, `string`/`bytes` values,
explicitly exported functions, capability imports, local declarations, calls,
expressions, `if`/`else`, `while`, C-style `for`, `do while`, and `return`.
The extended aggregate contract is separately conformance-tested and adds
structs, enums, generic types, collection values, function values, and
`match`; it must not depend on an implicit browser or Node global.

`packages/forge-web-script/src/fixtures/bootstrap.ts` is the executable
conformance corpus. Accepted fixtures must validate with no error diagnostics;
rejected fixtures must report their listed stable diagnostic codes and valid
source spans. Implementations in other languages can consume the same fixture
shape and compare normalized ASTs, diagnostics, and manifest JSON. The fixture
suite is a conformance target, not an implementation-specific snapshot.

The shared source corpus in
`packages/forge-web-script-vitest/fixtures` covers the same boundary:
`valid/collections.fws` exercises collection literals, indexing, contextual
empty vectors, `length()`, and valid escaped strings;
`valid/aggregates.fws` exercises function values, qualified `Result::Ok` and
`Result::Error` constructors, and arm-local match bindings; and
`diagnostics/collections.fws` exercises invalid collection calls and aggregate
constructor/binding diagnostics. The collection fixture is also compiled
through the shared Wasm harness; aggregate syntax is retained as a frontend
conformance source until aggregate Wasm lowering is enabled for that harness.

## Compatibility policy

Language and ABI major versions are incompatible by default. A loader may accept
the same major ABI with a higher minor version only when the producer marks the
new fields optional and the consumer ignores unknown fields safely. Removing an
export, changing a type, changing ownership, or changing a capability
signature requires a breaking ABI revision and must be rejected by loaders that
do not implement it. ABI `1.2` is such a breaking revision despite retaining
the `1.x` numbering: its required `fws_realloc` memory export is not optional,
and ABI `1.1` manifests are not silently upgraded. Adding a capability never
silently changes an existing module: it requires a new manifest declaration and
host approval.

Compiler versions are not ABI versions. Compilers must include their version in
the compile input and artifact hash, but loaders compare the language and ABI
versions plus the manifest signature. A failed compatibility check is a
load-time diagnostic, not a runtime fallback. Rust and AssemblyScript modules
continue to use their existing wrappers and ABI contracts during the coexistence
period; Forge Web Script does not reinterpret or replace them.

Regex standard-library compatibility is intentionally separate from host regex
compatibility. The Forge bytecode contract and compiler define the accepted
syntax and stable diagnostics; the reference VM is used only to validate the
leftmost/backtracking behavior, UTF-16 capture offsets, and `-1` unset sentinel
until the backend VM is available. Browser or Node regular-expression behavior
is only a differential oracle, and neither the TypeScript reference VM nor a
host regular-expression API may execute a production standard-library call.
Changing opcode numbering, capture-slot layout, supported syntax, diagnostic
codes, or matching semantics requires a new regex bytecode version and a new
artifact identity. Until backend/runtime conformance and phone-number migration
evidence are complete, the AssemblyScript phone implementation remains an
explicit legacy regression oracle and is never mixed with a Forge artifact.

## Coexistence and migration

Forge Web Script is an additional target during v1 adoption. Existing Rust
crates and their `packages/*-wasm` wrappers remain the production path for QR,
matrix, and code-scan workloads. Existing consumers should continue to
import those typed wrappers directly; no wrapper is silently redirected through
Forge Web Script, and no generated wasm file is shared between the pipelines.

The `codecMigrationFixture` in
`packages/forge-web-script/src/fixtures/codec-migration.ts` is the first
conformance fixture shaped like a codec adapter. It declares
`codec.barcode.encode(payload: string) -> bytes`, exports `encode_payload`, validates the
pointer-length ABI, and uses an injectable host to write caller-owned output.
It intentionally remains a narrow ABI fixture: the host can use a deterministic
fake for conformance tests while the fixture proves the Forge Web Script
boundary. Production codec parity still requires matching vectors and
performance measurements, not just a matching function name.

The corresponding legacy wrapper exports `encode(symbology, data)` and returns
`Uint8Array | undefined`; the fixture exports `encode_payload(payload)` and
returns an ABI-owned `bytes` pair. That deliberate difference keeps the
capability boundary explicit: a migration adapter may map the legacy
symbology/data call into the declared capability, but the fixture does not
pretend that the two exports are behaviorally interchangeable yet.

### Selecting an implementation

| Workload or requirement                                                | Select                                                                 | Reason                                                                                     |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Existing QR, matrix, or scanner behavior                                | `packages/*-wasm`                                                      | Stable Rust implementation and existing typed ESM wrapper; keep its current wasm-pack ABI. |
| Existing barcode behavior                                               | `@mission-platform/barcode`                                           | Package-local Forge Web Script graphs provide the typed barcode façade.                  |
| New general-purpose browser-safe compute with explicit host effects    | Forge Web Script plus `@mission-platform/vite-plugin-forge-web-script` | Versioned `.fws` source, manifest, typed loader, and deny-by-default capabilities.         |
| Existing AssemblyScript source or an AssemblyScript-specific migration | `@mission-platform/vite-plugin-assemblyscript`                         | Compiles `.ts` AssemblyScript entries and preserves its generated raw-export contract.     |
| Framework-neutral UI/component compilation                             | Forge component compiler                                               | Forge Web Script is not a replacement for `FrameworkOutputPlugin` or component targets.    |

Use the Forge Web Script Vite plugin only for `.fws` entries. Use the
AssemblyScript plugin for existing AssemblyScript entries, and keep Rust crate
builds owned by their crate `turbo.json` tasks. During migration, an application
may bundle all three kinds of module: each loader owns its own initialization,
memory, and ABI validation, and capability imports must be supplied explicitly
to Forge Web Script modules.

### Evidence and deprecation gate

Migration work should record four independent comparisons for each candidate:

1. exported behavior against shared golden vectors, including invalid-input and
   boundary cases;
2. ABI safety, including manifest/version checks, import denial, bounds checks,
   trap conversion, and buffer ownership;
3. generated artifact stability, including reproducible hashes, declarations,
   source maps, and browser/Node loading; and
4. a representative release-build performance measurement covering compile
   time, artifact size, initialization, and steady-state calls.

The migration fixture currently supplies the ABI and artifact portions of this
evidence. The existing barcode wrapper and Rust crate remain the behavior and
legacy regression oracle; run their package and crate tests alongside the
fixture rather than treating the fixture as a replacement benchmark. Forge Web
Script must not deprecate a Rust or AssemblyScript path until a workload passes
all four comparisons in two supported host environments, has a documented
rollback path, and has no unresolved ABI or security findings. Deprecation then
requires an announced compatibility window and an adapter or migration guide;
removal requires a subsequent major release.

## Class-free aggregate and execution contracts

The extended class-free contract adds immutable `struct` values, tagged `enum`
values, structural compile-time `interface` declarations, generic parameters
with interface bounds, function values, collection literals/methods, and
`match` expressions/statements. Qualified enum constructors use `Type::Variant`
and match bindings are arm-local; for example,
`Result::Ok(item) => item` binds `item` only in that arm. The standard
`Result<T, E>` contract uses `Ok(T)` and `Error(E)`, not `Err(E)`.
Struct updates are pure value transformations; neither structs nor interfaces
have constructors, identity, inheritance, receivers, or runtime dispatch. Any
attempt to declare class/object-oriented constructs (including `class`,
`constructor`, `extends`, `impl`, `new`, and `trait`) is rejected with stable
diagnostic `FWS-PARSE-052`.

Aggregate layouts are recorded in the manifest in canonical name order. Struct
fields are ordered, four-byte aligned values; enum layouts begin with a four-byte
discriminant. Field ownership is explicit (`owned`, `borrowed`, or `shared`) and
defaults to owned immutable storage. Generic values are specialized per concrete
type; descriptor-based representations are reserved for explicit iterator or
interface boundaries and are represented by specialization records.

The VM bytecode contract is backend-independent. A `ForgeWebScriptVmModule`
contains typed functions, constants, aggregate layouts, specializations,
capability imports, source spans, and the 64 KiB linear-memory
`fws_alloc`/`fws_dealloc`/`fws_realloc` boundary. `interpret`, `jit`, and `aot` are execution
modes over the same instruction/value/trap semantics; JIT cache keys and AOT
artifacts include compiler and source hashes. Capabilities are callable only
when present in the module manifest.

Reactive runtime state is data: entity indices use generation counters,
component stores and worlds are immutable snapshots, and systems return world
transitions. Signals, subscriptions, query requirements, deterministic order,
and bounded scheduler steps are explicit values. ECS host integration requires
the same declared capability boundary as any other FWS import.

## Scope boundary

The v1 implementation is a TypeScript frontend plus deterministic WebAssembly
backend, exposed through the compatibility facade and the standalone Node CLI.
The conformance fixtures and generated artifacts are the compatibility target.

Self-hosted compilation (running the compiler as an FWS program) is explicitly
supported by this v1 contract’s class-free surface and VM bytecode execution
model, but it is not required for correctness of the v1 ABI and language
boundary. Richer language features, replacement of existing Rust or
AssemblyScript workloads, and other non-v1 compiler evolutions are outside this
contract.

## Tooling cutover and bootstrap boundary

The CLI, Vite plugin, language service, and LSP all consume the public compiler
service contract. Their default service runs the bounded FWS-authored lex/token
normalization stage through the VM before the compatibility compiler produces the
artifact. The remaining frontend, linker, optimizer, manifest, and Wasm-emission
stages are still seed-backed in this release; this boundary is intentional and
is exposed as `ForgeWebScriptSelfHostedStageReport` rather than being presented
as complete self-hosting.

The CLI selects the VM mode with `--vm-mode interpret|jit|aot`. The Vite plugin
and language-service workspace options use the corresponding `selfHostedVmMode`
value. All three modes execute the same bytecode and compare the lex fingerprint
with the independent seed reference. A mismatch or VM trap becomes the stable
`FWS-BOOTSTRAP-001` diagnostic and prevents an invalid Wasm artifact from being
emitted. `interpret` is intended for quick checks, while `jit` and `aot` are
conformance/development modes; compiled Wasm remains the normal production
artifact and runtime path.

Graph linking, declarations, source maps, ABI manifests, deterministic hashes,
linear-memory ownership, capability denial, collection/ECS values, and explicit
async scheduler capabilities remain governed by the existing public contracts.
The tooling adapters do not add ambient host APIs or implicit object dispatch.
Microtasks and Web Workers are available only through declared scheduler
capabilities, and their ordering remains explicit and deterministic. Consumers
should treat the VM report as a parity/conformance signal until later releases
move additional compiler stages behind the same FWS boundary.

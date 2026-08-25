# Migrate to the safe-by-default FWS pipeline

This guide is for FWS modules written before immutable locals, explicit borrows,
and checked bounds-policy metadata became part of the v1 contract.

## Make mutation explicit

Add `mut` to locals and parameters that are assigned. Add `&` for an immutable
borrow and `&mut` for a mutable borrow; mutable borrows cannot overlap.

```fws
fn increment(mut value: i32) -> i32 {
  value = value + 1;
  value
}

fn inspect(values: &Vector<i32>) -> i32 { values[0] }
fn update(values: &mut Vector<i32>) -> unit { values[0] = 1; }
```

Do not rely on inferred ownership. POD values are passed by value by default;
non-POD values use immutable references. Keep `owned`, `borrowed`, and `shared`
on ABI boundaries where a specific lifetime or release responsibility is
required. A region temporary cannot be returned or stored in a longer-lived
value without an explicit ownership/promotion boundary.

## Choose and audit bounds policy

Runtime bounds checks remain the default:

```bash
forge-web-script compile src/main.fws --bounds-checks runtime --format json
```

Use `proven-safe` only when analysis proves every access from collection-length
and index-range facts. `excluded-by-profile` is an explicit, auditable release
choice, not a shortcut for unknown indexes:

```bash
forge-web-script check src/main.fws --bounds-checks proven-safe --optimizer-report
```

Review analysis findings and the manifest policy before shipping. Unknown or
untrusted indexes should use `runtime`; strict analysis rejects unsafe policy
requests.

## Inspect generated cache metadata

The compiler cache may contain `<key>.sonir.json`, a deterministic summary of
the optimized Sea-of-Nodes graph. Inspect it without running guest code:

```bash
forge-web-script inspect-sonir .cache/main.sonir.json --format json
```

The artifact records schema and language/ABI versions, source and graph hashes,
optimization mode, bounds policy, effects, ownership metadata, source spans,
and ordered pass reports. Stale, malformed, oversized, or policy-mismatched
artifacts are ignored and can be safely removed.

## Memory and release behavior

Scoped values use checked regions. Values that outlive a region use explicit
ARC/shared handles; every retained handle has one matching release, and cycles
are not implicitly accepted. Raw `fws_alloc`, `fws_realloc`, and `fws_dealloc`
remain the caller-owned checked ABI boundary. Async and iterator suspension is
an escape boundary, so values used after suspension must be retained explicitly.

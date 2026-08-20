# Forge Web Script runtime example

This framework-neutral Vite fixture compiles `src/runtime.fws` together with its
same-project `src/project-helper.fws` dependency and a second project at
`shared-project/shared-value.fws`. Same-project links are static by default;
this fixture explicitly keeps the second project dynamically linked.

The cross-project link can be statically embedded for a combined artifact by
changing `crossProjectLinkMode` in `vite.config.ts` from `dynamic` to `static`.
The fixture supplies the
explicit `clock.now` capability from the browser host. No DOM or framework API
is available to the Forge Web Script module itself; the DOM is used only by the
TypeScript consumer to display the returned value.

```sh
pnpm build
```

## Iterator and target-profile example

Forge Web Script models recoverable outcomes with `Option<T>` and `Result<T,
E>` plus `match`; it does not use source exceptions or imperative loops. An
iterator can forward values through its `next()` contract:

```fws
export iter fn forward(source: Iterator<i32>) -> Iterator<i32> {
  loop value = source.next() { yield value; }
}
```

The generated module adapts iterator exports to JavaScript `{ value, done }`
results. Compiler callers can request validated capabilities explicitly, for
example `targetFeatures: { threads: true, atomics: true }`; both flags are
required for shared-memory atomic code. Debug builds can also persist
`<key>.optimized.wat`, `<key>.unoptimized.wat`, `<key>.optimized.wasm`, and
`<key>.unoptimized.wasm` through the compiler cache without making cache write
failures fatal.

# Shared Forge Web Script fixtures

These physical `.fws` files are the cross-package conformance corpus for the
compiler, runtime, Vite plugin, and Vitest harness. Keep fixture names stable:
tests use paths relative to this directory and derive deterministic names by
replacing path separators with `-` and removing the `.fws` extension.

The categories are intentionally small and reusable:

- `valid/` contains modules accepted by the compiler.
- `diagnostics/` contains rejected modules with stable diagnostic codes.
- `capabilities/` contains explicit host capability imports.
- `graphs/` contains an entry module and a relative source dependency.
- `self-hosted/` contains the bounded self-hosted parity input.

Package-local fixtures should remain beside focused specs when they exercise a
private implementation detail. Add a fixture here when more than one package
needs the same source or when it represents a language/ABI conformance case.

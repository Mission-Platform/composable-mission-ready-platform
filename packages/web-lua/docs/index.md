# @mission-platform/web-lua

Guest-owned Lua runtime foundation compiled from Forge Web Script. This package
owns the runtime compatibility contract and its host-capability boundary.

## Start here

- [Lua 5.5.1 compatibility reference](reference/compatibility.md) — tested,
  capability-gated, and unresolved behavior.
- [Build and test guide](guides/development.md) — runtime fixtures and output
  constraints.
- The package README and generated reference provide concise package API notes.

The browser entry is `@mission-platform/web-lua`; Node consumers use the
explicit `@mission-platform/web-lua/node` export. Host effects are denied by
default and require an explicit capability policy.

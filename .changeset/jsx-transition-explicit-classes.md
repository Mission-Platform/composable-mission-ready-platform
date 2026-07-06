---
'@mission-platform/jsx': minor
---

add explicit per-phase transition-class props for scoped (non-global) transitions

`<Transition>` and `<TransitionGroup>` now accept explicit `enterFromClass` /
`enterActiveClass` / `enterToClass` / `leaveFromClass` / `leaveActiveClass` /
`leaveToClass` props (plus the existing `moveClass`), each overriding the
`<name>`-derived default for one phase and mirroring Vue's built-in class props.
Passing hashed CSS-Module class names keeps a component's enter/leave styling
**scoped** instead of forcing a global `:global(.<name>-…)` rule. The React
CSS-class driver applies the given classes verbatim (falling back to the
`<name>`-derived class for any phase left unset) and Vue's native transition
does the same, so the cross-framework behaviour stays identical.

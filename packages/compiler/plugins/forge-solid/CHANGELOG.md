# @mission-platform/forge-plugin-solid

## 0.2.0
### Minor Changes

- 7e3cc9d: require lowered target plans before generation and add open FrameworkId extension point

### Patch Changes

- Updated dependencies [7e3cc9d]
  - @mission-platform/forge-plugin-api@0.4.0

## 0.1.2

### Patch Changes

- Updated dependencies [89aab02]
  - @mission-platform/forge-plugin-api@0.3.0

## 0.1.1

### Patch Changes

- be97ac0: Prevent Solid dynamic-expression memoization from capturing callback-local bindings, and emit createMemo declarations after component body locals so eager memo evaluation cannot hit TDZ.
- be97ac0: Lower Dynamic refs to Solid hyperscript callbacks, splice Slot/Dynamic roots from conditional returns, and rewrite getter spreads such as `[...toasts]`.
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
  - @mission-platform/forge-plugin-api@0.2.0

# @mission-platform/forge-plugin-solid

## 0.2.2

### Patch Changes

- 0c0e7ce: feat(forge): implement forge plugin recommendations and CST rewrites
  
  - Introduce @mission-platform/forge-cst for robust AST/CST-based import rewrites
  - Add declarative intention validation schemas in @mission-platform/forge-plugin-api
  - Unify Forge build adapter contracts across React, Vue, Solid, Svelte, and Web Components
  - Move path normalization into Tsdown and simplify artifact staging in @mission-platform/vite-plugin-forge
  - Resolve DeepSource code quality findings across compiler plugins and tooling
- Updated dependencies [0c0e7ce]
- Updated dependencies [0878d97]
  - @mission-platform/forge-plugin-api@0.5.0

## 0.2.1

### Patch Changes

- cb5f5ca: configure packages for public access
- Updated dependencies [cb5f5ca]
  - @mission-platform/forge-plugin-api@0.4.1

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

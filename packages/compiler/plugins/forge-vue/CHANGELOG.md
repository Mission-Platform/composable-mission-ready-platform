# @mission-platform/forge-plugin-vue

## 0.2.0

### Minor Changes

- 89aab02: add typed style generation support for Forge components

### Patch Changes

- Updated dependencies [89aab02]
  - @mission-platform/forge-plugin-api@0.3.0

## 0.1.1

### Patch Changes

- be97ac0: Render typed member calls such as deferred wizard-step content as Vue nodes instead of stringifying VNodes.

  Normalize primitive and array-valued Svelte slots to snippets so Storybook args render safely without callable-value errors or invalid structural-element text holes.

  Preserve native string-tag dynamic hosts when lowering Svelte components, including PascalCase locals with object-valued inline styles.

  Fix Svelte lowering for runtime module declarations, neutral `useId` imports, children-alias presence checks, value-position array/spread markup (itemNodes/childList), non-literal $props defaults, JSX-returning local render helpers (including expression-bodied `.map()`/`.flatMap()`/`Array.from()` helpers such as `ForgeTabs`' `renderPanels`, and **block-bodied** mapped helpers with leading typed `const`s + terminal `return` such as `ForgeMenu`/`ForgeMenubar`'s `renderItems`, lowered to a `{#snippet}` containing an `{#each}` with `{@const}` bindings and invoked via `{@render}` instead of leaving an undeclared `renderItems is not defined` call; each-header keys that reference block-local consts are expanded into the header, and TypeScript `as` assertions are stripped from helper-call arguments in markup), control-flow render helpers whose bodies branch through `if`/`switch`/early-return before returning JSX (such as `ForgeFormBuilder`'s `renderPanel` and `ForgeSchemaForm`'s `renderField`), lowered to parameterized `{#snippet}` declarations, callback props that render a known helper (such as `panel={(scope) => renderPanel(scope.tab.id)}`), lowered to implicit snippet props, and consumer-side render-prop invocations (both the destructured `panel?.(…)` form and the `properties.panel?.(…)` member form) lowered to `{@render panel?.(…)}` snippet renders instead of leaving a `panel?.(…)` call hole; the generated Svelte `MpRenderProperty<S>` local JSX type is now a native `Snippet<[S]>` so those `{@render}` invocations typecheck. Also fix template-position `h(Slot, …)` markers (including named slots and fallback children), source-ordered component initialization (preventing setup-dependent `$state`/`$derived`temporal-dead-zone failures), and scope-safe static snippet hoisting (including ignoring comment/JSDoc words when determining the component's top-level bindings, so an each-local such as`option`in`options.map((option) => …)`is no longer hoisted into a top-level snippet and can no longer throw`ReferenceError: option is not defined` at render time); use a deterministic Storybook image fixture for EmailImage stories.

- be97ac0: Preserve neutral hyperscript imports in generated Vue helper modules.
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
  - @mission-platform/forge-plugin-api@0.2.0

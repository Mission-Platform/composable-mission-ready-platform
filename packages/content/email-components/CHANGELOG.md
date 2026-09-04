# @mission-platform/email-components

## 1.1.0

### Minor Changes

- 9e59f09: split shared UI capabilities into focused workspaces and update their design tokens

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 7877dc0: align typography expectations with rendered email output
- 46fe17a: scope Forge build environment variables to package build tasks
- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [89aab02]
- Updated dependencies [8a15dbc]
- Updated dependencies [b88a08e]
- Updated dependencies [9e59f09]
- Updated dependencies [97c3f20]
  - @mission-platform/email-renderer@0.1.2
  - @mission-platform/forge-jsx@1.1.0
  - @mission-platform/tokens@2.0.0

## 1.0.0

### Major Changes

- 4714506: merge the email text atoms into a single `EmailTypography` atom

  `EmailTypography` mirrors the web `ForgeTypography` vocabulary: `as` selects the
  rendered element (`p` by default, `a` when `href` is set), `variant` selects the
  type scale (the matching heading scale when `as` is `h1`–`h6`, otherwise
  `body-md`), and `color`, `align`, `target`, and `underline` tune the literal
  inline declarations. Links keep the `validateUrl` guard and the `children ?? href`
  label fallback, and now emit `rel="noopener noreferrer"` for `target="_blank"`.

  BREAKING CHANGE: `EmailHeading`, `EmailText`, and `EmailLink` (with
  `EmailHeadingProperties`, `EmailTextProperties`, and `EmailLinkProperties`) are
  removed in favour of `EmailTypography` and `EmailTypographyProperties`. Replace
  `EmailText({ … })` with `EmailTypography({ … })`, `EmailHeading({ level: 3 })`
  with `EmailTypography({ as: 'h3' })`, and `EmailLink({ href })` with
  `EmailTypography({ href })`.

### Minor Changes

- be97ac0: add framework-specific Storyblok output builds for Forge packages

  The CMS driver and Storyblok target now support shared assets plus React, Vue,
  Svelte, Solid, and Web Components output. Forge packages expose the associated
  build targets and components adds the generated Storyblok entry points.

  BREAKING CHANGE: the generated `@mission-platform/icons` components barrel no
  longer re-exports the catalog and sprite APIs; import those APIs from their
  dedicated modules instead.

### Patch Changes

- be97ac0: Render email list children through explicit neutral elements so text content is not treated as a dynamic tag.
- be97ac0: Use deterministic fixtures and interaction setup in React Storybook stories.
- be97ac0: Render EmailTypography through the neutral Dynamic primitive so Solid can host string tags without createComponent(string).
- be97ac0: Render typed member calls such as deferred wizard-step content as Vue nodes instead of stringifying VNodes.

  Normalize primitive and array-valued Svelte slots to snippets so Storybook args render safely without callable-value errors or invalid structural-element text holes.

  Preserve native string-tag dynamic hosts when lowering Svelte components, including PascalCase locals with object-valued inline styles.

  Fix Svelte lowering for runtime module declarations, neutral `useId` imports, children-alias presence checks, value-position array/spread markup (itemNodes/childList), non-literal $props defaults, JSX-returning local render helpers (including expression-bodied `.map()`/`.flatMap()`/`Array.from()` helpers such as `ForgeTabs`' `renderPanels`, and **block-bodied** mapped helpers with leading typed `const`s + terminal `return` such as `ForgeMenu`/`ForgeMenubar`'s `renderItems`, lowered to a `{#snippet}` containing an `{#each}` with `{@const}` bindings and invoked via `{@render}` instead of leaving an undeclared `renderItems is not defined` call; each-header keys that reference block-local consts are expanded into the header, and TypeScript `as` assertions are stripped from helper-call arguments in markup), control-flow render helpers whose bodies branch through `if`/`switch`/early-return before returning JSX (such as `ForgeFormBuilder`'s `renderPanel` and `ForgeSchemaForm`'s `renderField`), lowered to parameterized `{#snippet}` declarations, callback props that render a known helper (such as `panel={(scope) => renderPanel(scope.tab.id)}`), lowered to implicit snippet props, and consumer-side render-prop invocations (both the destructured `panel?.(…)` form and the `properties.panel?.(…)` member form) lowered to `{@render panel?.(…)}` snippet renders instead of leaving a `panel?.(…)` call hole; the generated Svelte `MpRenderProperty<S>` local JSX type is now a native `Snippet<[S]>` so those `{@render}` invocations typecheck. Also fix template-position `h(Slot, …)` markers (including named slots and fallback children), source-ordered component initialization (preventing setup-dependent `$state`/`$derived`temporal-dead-zone failures), and scope-safe static snippet hoisting (including ignoring comment/JSDoc words when determining the component's top-level bindings, so an each-local such as`option`in`options.map((option) => …)`is no longer hoisted into a top-level snippet and can no longer throw`ReferenceError: option is not defined` at render time); use a deterministic Storybook image fixture for EmailImage stories.

- Updated dependencies [be97ac0]
- Updated dependencies [4714506]
  - @mission-platform/email-renderer@0.1.1
  - @mission-platform/tokens@1.1.0
  - @mission-platform/forge-jsx@1.0.0

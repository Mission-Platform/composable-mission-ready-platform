# @mission-platform/wysiwyg

## 1.0.0

### Major Changes

- bd88e5e: rename the component library prefix from `Base` to `Forge`

  BREAKING CHANGE: every exported component symbol and its folder/file and CSS class name is renamed from `Base*`/`base-*` to `Forge*`/`forge-*` (e.g. `BaseButton` → `ForgeButton`), and previously-unprefixed components (`HideAt`, `ShowAt`, `BreakpointDebug`) and every icon (`IconStar` → `ForgeIconStar`) now carry the `Forge` prefix. Consumers must update all imports and template usages accordingly.

- 0371781: remove the per-framework subpath exports in favour of `mp:<framework>` conditions

  The legacy `./vue`, `./react`, `./solid`, `./svelte` and `./web-components`
  subpath exports have been deleted from every framework-shipping package. The framework build is now selected **only** by
  the `mp:<framework>` custom export condition on the bare `.` entry, so there is exactly one specifier per package and it
  is impossible for an app to mix two framework builds by importing inconsistently.

  **Breaking.** Replace every framework subpath with the bare specifier and select the framework once, at the app level:

  ```diff
  -import { ForgeButton } from '@mission-platform/components/vue';
  -import { ForgeIconChevron } from '@mission-platform/icons/vue';
  +import { ForgeButton } from '@mission-platform/components';
  +import { ForgeIconChevron } from '@mission-platform/icons';
  ```

  ```ts
  // vite.config.ts
  export default defineFrameworkAppConfig({ framework: "vue" });
  ```

  ```jsonc
  // tsconfig.app.json
  { "compilerOptions": { "customConditions": ["mp:vue"] } }
  ```

  `@mission-platform/components` keeps its per-component deep imports, but the wildcard is now condition-aware and carries
  no framework segment:

  ```diff
  -import { ForgeBadge } from '@mission-platform/components/react/atoms/forge-badge/forge-badge';
  +import { ForgeBadge } from '@mission-platform/components/atoms/forge-badge/forge-badge';
  ```

  The `@mission-platform/forge` adapter subpaths (`/react`, `/vue`, `/solid`,
  `/web-components`, `/runtime`, `/jsx-globals`), the Storyblok wrappers (`/storyblok/react`, `/storyblok/vue`),
  `@mission-platform/router/redwood`,
  `@mission-platform/breakpoints/core` and every `…/styles` entry are unaffected.

  `@mission-platform/vite-plugin-forge` now emits bare `@mission-platform/*`
  specifiers into the generated per-framework sources (previously it rewrote them to the matching subpath), and passes the
  framework's `customConditions` to every declaration-emit path so the generated `.d.ts` files resolve sibling packages
  against the same build the bundler picks.

  `@mission-platform/vite-config` gains `framework` and `frameworkInclude` options on `defineVitestConfig`, so a package
  can run its compiled-build specs under a framework condition while leaving cross-framework parity specs resolving
  neutrally.

### Minor Changes

- 6290b4c: add framework auto-resolution via custom export conditions

  Every framework-shipping `@mission-platform/*` package now declares `mp:vue`,
  `mp:react`, `mp:solid`, and `mp:web-component` custom export
  conditions on its bare `.` entry (each resolving to the matching built `dist`
  artifact), so consumers can `import { X } from '@mission-platform/<pkg>'` with
  no framework subpath and have Vite and the TypeScript LSP resolve the correct
  framework build from a single app-level setting.

  `@mission-platform/vite-config` adds `defineFrameworkAppConfig`,
  `frameworkResolveConditions`, and `frameworkCondition` (plus the
  `MissionPlatformFramework` type) to set `resolve.conditions` from one
  `framework` option, and `@mission-platform/typescript-config` adds matching
  `framework-vue`, `framework-react`, `framework-solid`, and `framework-web-component`
  presets wiring the equivalent `customConditions`.

- 90a72fc: Make the WYSIWYG toolbar user configurable and rename the toolbar button's activation callback to `onClick`.

  `ForgeWysiwygToolbar` now accepts an `items` array of `WysiwygToolbarItem` objects
  (`{ label, state, disabled, action }`, where `action` is the click handler and an optional `icon` is rendered inside the
  control). When provided, these replace the built-in formatting controls; the same items can be supplied to
  `ForgeWysiwygEditor` via the new `toolbarItems` prop. `ForgeWysiwygToolbarButton` now reports clicks through `onClick`
  instead of `onActivate`.

- 90a72fc: Add `@mission-platform/wysiwyg`, a framework-agnostic (write-once Vue 3 + React) WYSIWYG rich-text editor.

  The editor is authored once with `@mission-platform/forge` and composes existing packages: a `contenteditable` surface
  with a formatting toolbar built from `@mission-platform/icons` and `@mission-platform/components`' `ForgeButton`, an
  optional Monaco-backed HTML source view (`ForgeMonacoEditor` with Hunspell + Harper spell/grammar checking), design
  tokens via `@mission-platform/tokens`, and an RxJS-powered live word/character counter.

  Also adds two new icons to `@mission-platform/icons` used by the editor toolbar: `IconUnderline` and
  `IconStrikethrough`.

- 90a72fc: Insert WYSIWYG code blocks through a Monaco dialog built from a schema form.

  - `@mission-platform/forms-core`: add an optional `ui.language` hint (surfaced on the resolved
    `FormFieldSchema.language`) so a `code` field can carry a syntax language.
  - `@mission-platform/forms`: `ForgeSchemaForm` now renders the `code` widget as a `ForgeMonacoEditor` code field, and a
    new **`ForgeSchemaFormDialog`** component hosts any schema form inside a `ForgeModal` with Cancel / Submit actions
    wired to the form's own validation.
  - `@mission-platform/wysiwyg`: the toolbar's code-block control now opens the new `ForgeSchemaFormDialog` (a language
    selector + Monaco code editor) instead of a `window.prompt`, preserving the caret position so the inserted block lands
    where you were editing.
  - `@mission-platform/vite-plugin-forge`: add `@mission-platform/forms` to the framework-split module allowlist so
    write-once packages can consume its compiled Vue/React builds.

- 90a72fc: Extract the status bar into its own customisable component, move block-style formats into a dropdown, insert real code
  blocks, and add per-block controls.

  - **`WysiwygStatusBar`** — the status bar is now its own framework-agnostic, fully customisable component. It shows the
    live word/character counts by default; pass `items: WysiwygStatusItem[]` (`{ id, label, value? }`) to replace them and
    `align` to lay them out. The editor forwards a new `statusItems` prop.
  - **`WysiwygBlockMenu`** — Paragraph, Headings **1-6**, Block Quote and **Monospace** (an editable `<pre>`) are now
    chosen from a `ForgeDropdown`-backed block-format dropdown instead of buttons. New `heading4`/`heading5`/`heading6`/
    `monospace` commands and a `queryBlockFormat` helper back it.
  - **Code blocks** — the toolbar's code-block control now inserts a **non-editable** block that portals a real
    `ForgeCodeBlock` (from `@mission-platform/components`) into the surface via the neutral `<Teleport>`; the serialized
    `modelValue` keeps only a clean placeholder.
  - **`WysiwygBlockControls`** — hovering a block (or moving the caret into it) now outlines it and shows a floating bar
    to move the block up/down and change its alignment/justification (toggle with the new `showBlockControls` prop).

### Patch Changes

- f67e304: fix component styles not loading in apps and Storybook

  `defineTsdownLibrary` now re-links every extracted stylesheet to the JS module that owns it via a `writeBundle` pass (opt out with `cssBundle: false`). Under the tsdown/Rolldown build, co-located `*.module.scss` / `*.scss` imports were extracted to standalone `.css` assets but their side-effect imports were dropped from the JS (left as `/* empty css */`), so importing a component shipped its markup without its styles. Each `X.css` is now imported from its CSS-Module class map (`X.module.js`) — or, for the Vue build, from the component chunk (`X.vue_vue_type_style_*.css` → `X.js`) — so importing a single component (or the package barrel) automatically loads exactly its styles again, matching the historical Vite library build.

- ac98203: normalize composable directories, package barrels, and colocated tests
- f67e304: migrate library builds to tsdown

  Every library workspace across `packages/`, `vite-plugins/`, `configs/`, `workers/`, and the MCP servers now builds
  with [tsdown](https://tsdown.dev) (Rolldown/Oxc)
  instead of `tsc` / `vite build`. A new shared `@mission-platform/tsdown-config`
  package exposes the generic `defineTsdownLibrary` / `defineTsdownVueLibrary`
  helpers, and `@mission-platform/vite-plugin-forge` now additionally exports tsdown-compatible forge helpers
  (`defineTsdownForgeHooks(All)`,
  `defineTsdownForgeComponents(All)`, `defineTsdownForgeStoryblok(All)`) plus the Rolldown stage-2 adapters needed to
  reproduce the write-once multi-framework output under tsdown.

  This is a build-tooling change only: every package's public `exports`, `dist`
  layout, `types`, and framework auto-resolution (`mp:*` conditions) are unchanged, so consumers are unaffected. The
  `@mission-platform/forms` `web-components`
  target remains a hybrid Vite step, and `@mission-platform/hunspell` keeps its
  `build:wasm` toolchain.

- 90a72fc: Give the `ForgeWysiwygBlockMenu` popup list its own opaque surface background (with matching rounded corners) so the
  block-style dropdown always reads as a solid popup instead of appearing transparent over the content behind it.
- 90a72fc: Fix the WYSIWYG editor locking up when opening the code-block dialog. The
  `ForgeSchemaFormDialog` (which embeds a Monaco `code` editor) was rendered unconditionally, so a full Monaco instance
  mounted on editor load and was re-patched on every render/keystroke — freezing the tab in the browser (most visibly in
  the Vue build). The dialog is now mounted only while it is open, so Monaco is created lazily and torn down on close.
  Added a regression test asserting the code dialog is absent from the initial markup.
- 90a72fc: Fix the WYSIWYG code-block dialog so the language picker actually drives the embedded Monaco `code` editor's syntax
  highlighting instead of being fixed to
  `plaintext`. Changing the language now re-highlights the field (and the schema's validator is rebuilt only on a language
  change, never per keystroke, so typing stays responsive).
- Updated dependencies [e2525a3]
- Updated dependencies [ddf20bd]
- Updated dependencies [3fc6203]
- Updated dependencies [ca646ea]
- Updated dependencies [9a876eb]
- Updated dependencies [c6e83c0]
- Updated dependencies [ddf20bd]
- Updated dependencies [ddf20bd]
- Updated dependencies [f67e304]
- Updated dependencies [a4f0f68]
- Updated dependencies [bd88e5e]
- Updated dependencies [7a1b1a1]
- Updated dependencies [bd88e5e]
- Updated dependencies [bd88e5e]
- Updated dependencies [1db440e]
- Updated dependencies [81ca915]
- Updated dependencies [6290b4c]
- Updated dependencies [7c91132]
- Updated dependencies [0c0d5d7]
- Updated dependencies [56e0456]
- Updated dependencies [ac98203]
- Updated dependencies [8bd60ae]
- Updated dependencies [ffa5129]
- Updated dependencies [0371781]
- Updated dependencies [3fb8ddb]
- Updated dependencies [7d95459]
- Updated dependencies [f67e304]
- Updated dependencies [90a72fc]
- Updated dependencies [90a72fc]
  - @mission-platform/forge@1.0.0
  - @mission-platform/components@2.0.0
  - @mission-platform/forms@1.0.0
  - @mission-platform/icons@1.0.0
  - @mission-platform/tokens@1.0.1

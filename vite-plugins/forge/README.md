# @mission-platform/vite-plugin-forge

A framework-neutral compiler driver that turns components and composables authored
against [`@mission-platform/forge`](../../packages/forge) into native target
artifacts. The driver owns parsing, normalization, semantic IR, neutral
optimization, diagnostics, caching, and generic Vite/tsdown orchestration. It
does not own framework emitters or a target registry.

Each build supplies an explicit `FrameworkOutputPlugin` from a framework package.
That plugin owns target lowering, target optimization, source generation,
framework metadata, declarations, runtime externals, and native Vite/tsdown
adapters. The strict flow is:

`parse/normalize → neutral optimize → semantic IR → lower → optimize → generate → native build`

Built-in targets live in their own packages, such as
`@mission-platform/forge-plugin-react`, `@mission-platform/forge-plugin-vue`,
`@mission-platform/forge-plugin-solid`, `@mission-platform/forge-plugin-svelte`,
and `@mission-platform/forge-plugin-web-components`. Adding a target means
adding a plugin package and selecting its factory in consuming package config;
it does not mean extending this package's source tree.

### Web Components host selection

The Web Components target infers a customized built-in only when a component
has one static intrinsic root from its compatibility table: `div`, `span`,
`p`, or `h1`–`h6`. The generated class extends the corresponding native
constructor and registers with `customElements.define(tag, Class, { extends })`;
references to that component use the native tag with the required `is`
attribute. Components with autonomous hosts continue to use their generated
custom tag and the two-argument registration form.

Inference is deliberately conservative. Missing, fragment, dynamic,
component, ambiguous, invalid, or unsupported roots select the autonomous
path and retain a stable fallback reason (`missing-root`, `fragment-root`,
`dynamic-root`, `component-root`, `ambiguous-root`, `invalid-root`, or
`unsupported-root`) in the lowered plan for diagnostics. This prevents a
generated template from silently using an invalid customized-built-in base.

Generated elements use an open shadow root by default. A lowered shadow policy
can request `closed`, `delegatesFocus`, `serializable`, `clonable`, or named or
manual slot assignment; optional fields are normalized and retried without
unsupported platform options. The runtime retains its render root for closed
roots, and manual slot plans require an explicit assignable target rather than
assuming browser distribution.

`ElementInternals` attachment is capability-gated and safe when
`attachInternals` is unavailable. ARIA defaults are applied only for explicit
semantic mappings and never replace author-supplied ARIA attributes. Form
association, value synchronization, validity reporting, and form lifecycle
callbacks are opt-in lowered metadata; ordinary generated components remain
inert with respect to forms.

Each component build then gets its **own** declarations from
`jsxComponentsDtsPlugin`, a **post-build** step (`closeBundle`) that runs the
framework's declaration toolchain over the generated tree — the TypeScript
compiler API over the React `.tsx` tree, `vue-tsc` over the Vue `.vue` tree — and
writes per-module `.d.ts` into that build's `dist/<framework>`. So React
consumers get declarations that use React's own vocabulary and Vue consumers get
each SFC's precise `DefineComponent`, rather than both re-importing one shared
neutral declaration. To make the React types read idiomatically, the React
emitter rewrites the neutral render/hook types to their first-class React
equivalents — `MpChild` → `ReactNode`, `MpElement` → `ReactElement`, `MpRef` →
`RefObject`, `MpDependencyList` → `DependencyList` (imported from `react`) — so a
compiled component reads as a genuine `(props) => ReactElement`.

The one render primitive that has **no** single first-class framework equivalent
— `MpRenderProperty<S>`, a scoped-slot / render-prop function — is handled
differently: each framework build emits a tiny co-located `mp-jsx-types.ts`
module defining a **framework-specific variant** of it (React over `ReactNode`,
Vue over `VNodeChild`), and every emitter redirects that type import to the local
module. So the generated React/Vue sources — and their emitted declarations —
carry **no** `@mission-platform/forge` render type import (only the
framework-agnostic `classNames` runtime value keeps its neutral import).

There is no neutral props **base**: a component declares exactly the properties
it accepts (adding `children?: MpChild | readonly MpChild[]` and
`className?: ClassValue` only when it reads them), and the reserved `key`/`slot`
attributes come from `MpReservedProperties` via `JSX.IntrinsicAttributes`. Every
generated props interface therefore inherits nothing and carries no
`[key: string]: unknown` index signature, so excess-property checking and `keyof`
stay meaningful in each compiled target.

The generated entry re-exports the **full** public surface the neutral barrel
exposes — not just the component bindings (each under both its public `Badge`
and neutral `ForgeBadge` name), but **every companion type** shipped alongside a
component (variants, sizes, option shapes, its props interface). Each type is
re-exported from the flat-tree module that actually declares it: the component's
own module, or the sibling **helper** it was carried from (e.g. `DateRange` from
`date-time`), so the re-export never dangles and nothing is lost from the
emitted `index.d.ts`. Relatedly, the Vue emitter preserves the **type-only**
members of a mixed relative import (`import { fn, type T } from './helper'` /
`import { Child, type T } from './child'`) as a separate `import type { … }`, so
those types still resolve inside each SFC and its declaration instead of being
dropped alongside the value/default import.

Framework-specific emitters live in their respective Forge framework plugins;
the Vite package only dispatches to the selected plugin. Adding another target
framework therefore means adding a `forge-plugin-*` package rather than
extending this compiler's source tree.

The same strict pipeline also compiles **hook libraries** — write-once _composables_
(not UI components) authored against the neutral `@mission-platform/forge` hooks,
such as [`@mission-platform/rxjs`](../../packages/rxjs) and
[`@mission-platform/d3`](../../packages/d3). `generateHookLibrarySources` reads a
neutral barrel (`src/index.ts`) and, per module, either compiles it with
`compileHookModule` (React = a light `@mission-platform/forge` → `react` import
rewrite, since the neutral hooks already share React's signatures; Vue = a full
translation to `ref`/`computed`/`watch`/lifecycle where each returned value
becomes a `Ref`) or copies framework-agnostic modules verbatim, then emits a
re-export entry.

Each framework build then gets its **own** declarations from
`hookLibraryDtsPlugin`, a **post-build** step (`closeBundle`) that runs the
TypeScript compiler API over the generated tree and writes per-module `.d.ts`
into that build's `dist/<framework>`. The React build's declarations are typed
against React's own hooks; the Vue build's composables return Vue `Ref`s. No
common/shared declaration is used — each framework carries the types it actually
exposes.

CMS projection lives in the separate
[`@mission-platform/forge-cms-plugin-api`](../../forge-plugins/forge-cms-plugin-api)
package and its target adapters. It owns a platform-neutral content model (props
→ `text`/`richtext`/`number`/`boolean`/`option`/`asset`/`link`/`children`, JSDoc
→ `description`, defaults → `defaultValue`, callbacks dropped) plus a generic
driver, and each target maps that model onto its own platform:
[storyblok](../../forge-plugins/forge-cms-storyblok),
[astro](../../forge-plugins/forge-cms-astro),
[ghost](../../forge-plugins/forge-cms-ghost),
[jekyll](../../forge-plugins/forge-cms-jekyll), and
[webflow](../../forge-plugins/forge-cms-webflow).

A CMS target _composes_ a `FrameworkOutputPlugin` rather than replacing one, so
any platform pairs with any framework. Storyblok, for example, emits the **blok
configuration** JSON per component, a framework-specific blok wrapper, the
aggregate `components.json`, and the wrapper entry's typed `index.d.ts`; that
wrapper's `blok` prop is **precisely typed** — `SbBlokData & { … }`, one member
per schema field — rather than an open `Record<string, unknown>`.

`analyzeForgeModule(input)` is the neutral seam the CMS driver uses to obtain
semantic IR without electing a target plugin.

## Usage

Select target plugin instances explicitly in a package build. The helper creates
one target build per supplied plugin and obtains native stage adapters from that
plugin:

```ts
import { defineTsdownForgeComponents } from '@mission-platform/vite-plugin-forge';
import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';

export default defineTsdownForgeComponents({
  rootDir: import.meta.dirname,
  frameworks: [forgeReactFramework(), forgeVueFramework()],
  componentsModule: `${import.meta.dirname}/src/components/index.ts`,
  name: 'MissionPlatformComponents',
});
```

For a hook package, use `defineTsdownForgeHooks` with one explicit plugin. For a
content platform, pass `defineTsdownForgeCms(All)` from
`@mission-platform/forge-cms-plugin-api` a target such as
`forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`; the CMS package
owns schema, template, and manifest projection while the selected target plugin
owns lowering and native compilation. Output lands in
`dist/cms/<cms>/<framework>/**`.

See [`@mission-platform/components`](../../packages/components) for a reference
consumer that ships multiple target bundles from one neutral source, and
[`llms.txt`](./llms.txt) for the API-oriented summary. The complete architecture
explanation is [`docs/reference/compiler.md`](docs/reference/compiler.md).

## Service, cache, and watch behavior

The Vite and tsdown helpers keep a `ForgeCompilerService` for the duration of a
build session. Repeated builds reuse source snapshots, graph facts, parsed
modules, neutral IR, and target artifacts; one-shot builds dispose the service
after completion, while watch mode invalidates changed files and disposes it
when the watcher closes. Custom integrations should call `invalidate()` with
changed paths and `dispose()` at shutdown.

Cache keys include source and transitive dependency fingerprints, compiler and
router options, `tsconfig` `baseUrl`/`paths`, source-root/config fingerprints,
target ID, and plugin identity/version. Consequently a helper change invalidates
its dependent entries without deleting unrelated framework or CMS output.

Compilation reports retain phase timings, cache hit/miss counts, affected files,
warnings, errors, and emitted artifact counts. Generated modules, extra modules,
declarations, source maps, assets, and checksums are listed in the target
artifact manifest. Warnings are reported to the caller; errors prevent an
incomplete target from being promoted.

Targets remain explicit caller-owned `FrameworkOutputPlugin` instances. The
neutral compiler has no framework registry and does not import target packages.
Future worker/daemon transport is possible behind the service contract, but is
not part of the current in-process implementation.

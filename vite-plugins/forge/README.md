# @mission-platform/vite-plugin-forge

A **two-stage compiler** that turns the framework-neutral components authored
against [`@mission-platform/forge`](../../packages/forge) into **fully native**
**React** or **Vue 3** components at build time — no runtime adapter.

- **Stage 1 (source-to-source).** `generateFrameworkSources` parses each neutral
  `.tsx` with the TypeScript compiler API and emits a per-framework source tree:
  a React `.tsx` module (`class` → `className`, `h` → `React.createElement`) or a
  real Vue `.vue` SFC (`defineComponent` + `setup`, React-style hooks translated
  to Vue reactivity/lifecycle).
- **Stage 2 (native compile).** The generated tree is compiled by the framework's
  own toolchain — the classic-`h` React JSX transform (`reactJsxPlugin`) or
  `@vitejs/plugin-vue` (+ `@vitejs/plugin-vue-jsx`).

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

The two render/props primitives that have **no** single first-class framework
equivalent — `MpProperties` (the base every component's props interface
`extends`) and `MpRenderProperty<S>` (a scoped-slot / render-prop function) — are
handled differently: each framework build emits a tiny co-located
`mp-jsx-types.ts` module defining **framework-specific variants** of them (React
over `ReactNode`, Vue over `VNodeChild`), and both emitters redirect those two
type imports to that local module. So the generated React/Vue sources — and their
emitted declarations — carry **no** `@mission-platform/forge` render/props type
import (only the framework-agnostic `classNames` runtime value keeps its neutral
import).

The generated entry re-exports the **full** public surface the neutral barrel
exposes — not just the component bindings (each under both its public `Badge`
and neutral `BaseBadge` name), but **every companion type** shipped alongside a
component (variants, sizes, option shapes, its props interface). Each type is
re-exported from the flat-tree module that actually declares it: the component's
own module, or the sibling **helper** it was carried from (e.g. `DateRange` from
`date-time`), so the re-export never dangles and nothing is lost from the
emitted `index.d.ts`. Relatedly, the Vue emitter preserves the **type-only**
members of a mixed relative import (`import { fn, type T } from './helper'` /
`import { Child, type T } from './child'`) as a separate `import type { … }`, so
those types still resolve inside each SFC and its declaration instead of being
dropped alongside the value/default import.

Adding another target framework is just another emitter in `src/generators/`.

The same two stages also compile **hook libraries** — write-once _composables_
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

The same neutral source also projects onto **Storyblok**: `generateStoryblokBloks`
emits, per component, the **blok configuration** JSON (a Storyblok _component
object_ — props → `option`/`boolean`/`number`/`text`/`bloks` fields, JSDoc →
`description`, defaults → `default_value`, callbacks dropped) **and** a React
`.tsx` / Vue `.vue` **blok wrapper** that binds Storyblok's `blok` prop onto the
built framework component (`storyblokEditable` / `v-editable`, nested
`StoryblokComponent`), plus the aggregate `components.json` and the wrapper
entry's typed `index.d.ts`. The wrapper's `blok` prop is **precisely typed** —
`SbBlokData & { … }`, one member per schema field (`option` → string-literal
union, `bloks` → `SbBlokData[]`, …) — not an open `Record<string, unknown>`.

## Usage

Run one build per target framework — Stage 1 generates the sources, Stage 2
compiles them:

```ts
// vite.config.ts (React target)
import { generateFrameworkSources, jsxComponentsDtsPlugin, reactJsxPlugin } from '@mission-platform/vite-plugin-forge';
import { defineConfig } from 'vite';

const entry = generateFrameworkSources({ framework: 'react', componentsModule, outDir });
export default defineConfig({
  plugins: [
    reactJsxPlugin(),
    // Post-build: emit React's own declarations from the generated `.tsx` tree.
    jsxComponentsDtsPlugin({ framework: 'react', generatedDir: outDir, outDir: 'dist/react' }),
  ],
  build: { lib: { entry, fileName: 'react', formats: ['es'] } },
});
```

```ts
// vite.config.ts (Vue target — `vueTscBin` is the resolved path to vue-tsc/bin/vue-tsc.js)
import { generateFrameworkSources, jsxComponentsDtsPlugin } from '@mission-platform/vite-plugin-forge';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig } from 'vite';

const entry = generateFrameworkSources({ framework: 'vue', componentsModule, outDir });
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    // Post-build: emit Vue's own declarations from the generated `.vue` tree.
    jsxComponentsDtsPlugin({ framework: 'vue', generatedDir: outDir, outDir: 'dist/vue', vueTscBin }),
  ],
  build: { lib: { entry, fileName: 'vue', formats: ['es'] } },
});
```

```ts
// vite.config.ts (hook library, e.g. @mission-platform/rxjs — `--mode react` / `--mode vue`)
import { generateHookLibrarySources, hookLibraryDtsPlugin, reactJsxPlugin } from '@mission-platform/vite-plugin-forge';
import { defineConfig } from 'vite';

const framework = 'react'; // or 'vue'
const generatedDir = outDir; // the Stage-1 generated tree
const entry = generateHookLibrarySources({ framework, entryModule, outDir: generatedDir });
export default defineConfig({
  plugins: [
    ...(framework === 'react' ? [reactJsxPlugin()] : []),
    // Post-build: emit this framework's own declarations from the generated tree.
    hookLibraryDtsPlugin({ framework, generatedDir, outDir: `dist/${framework}` }),
  ],
  build: { lib: { entry, formats: ['es'] }, outDir: `dist/${framework}` },
});
```

```ts
// vite.config.ts (Storyblok bloks + Vue wrappers)
import { generateStoryblokBloks } from '@mission-platform/vite-plugin-forge';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const entry = generateStoryblokBloks({
  framework: 'vue',
  componentsModule,
  outDir, // <name>.json + <name>.vue wrappers + components.json + typed index.d.ts
  componentsImport: '@mission-platform/components/vue',
});
export default defineConfig({
  plugins: [vue()],
  build: { lib: { entry, fileName: 'storyblok', formats: ['es'] } },
});
```

See [`@mission-platform/components`](../../packages/components) for a
reference consumer that ships both a React and a Vue bundle from one neutral
source, and [`llms.txt`](./llms.txt) for the full API.

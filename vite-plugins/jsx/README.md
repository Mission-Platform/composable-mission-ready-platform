# @mission-platform/vite-plugin-jsx

A **two-stage compiler** that turns the framework-neutral components authored
against [`@mission-platform/jsx`](../../packages/jsx) into **fully native**
**React** or **Vue 3** components at build time — no runtime adapter.

- **Stage 1 (source-to-source).** `generateFrameworkSources` parses each neutral
  `.tsx` with the TypeScript compiler API and emits a per-framework source tree:
  a React `.tsx` module (`class` → `className`, `h` → `React.createElement`) or a
  real Vue `.vue` SFC (`defineComponent` + `setup`, React-style hooks translated
  to Vue reactivity/lifecycle).
- **Stage 2 (native compile).** The generated tree is compiled by the framework's
  own toolchain — the classic-`h` React JSX transform (`reactJsxPlugin`) or
  `@vitejs/plugin-vue` (+ `@vitejs/plugin-vue-jsx`).

Adding another target framework is just another emitter in `src/generators/`.

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
import { generateFrameworkSources, reactJsxPlugin } from '@mission-platform/vite-plugin-jsx';
import { defineConfig } from 'vite';

const entry = generateFrameworkSources({ framework: 'react', componentsModule, outDir });
export default defineConfig({
  plugins: [reactJsxPlugin()],
  build: { lib: { entry, fileName: 'react', formats: ['es'] } },
});
```

```ts
// vite.config.ts (Vue target)
import { generateFrameworkSources } from '@mission-platform/vite-plugin-jsx';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig } from 'vite';

const entry = generateFrameworkSources({ framework: 'vue', componentsModule, outDir });
export default defineConfig({
  plugins: [vue(), vueJsx()],
  build: { lib: { entry, fileName: 'vue', formats: ['es'] } },
});
```

```ts
// vite.config.ts (Storyblok bloks + Vue wrappers)
import { generateStoryblokBloks } from '@mission-platform/vite-plugin-jsx';
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

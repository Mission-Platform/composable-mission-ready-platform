# @mission-platform/forge-cms-astro

The **Astro** CMS target for Forge components.

Astro used to be a `FrameworkOutputPlugin` sibling of React/Vue/Solid/Svelte/Web Components, shipping a hand-rolled
vanilla-DOM island runtime that re-implemented state, refs, effects, and events from the neutral IR. It is now a CMS
target that **composes** one of those plugins: presentational components become static `.astro`, and interactive ones
are hydrated by a real framework runtime.

## Usage

```ts
// tsdown.config.ts
import { defineTsdownForgeCms } from "@mission-platform/forge-cms-plugin-api";
import { forgeAstroCms } from "@mission-platform/forge-cms-astro";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";

export default defineTsdownForgeCms({
  rootDir: import.meta.dirname,
  target: forgeAstroCms({
    packageName: "@acme/components",
    plugin: forgeVueFramework(),
  }),
});
```

Any of `react`, `vue`, `solid`, `svelte`, or `web-components` may be bound; the island is compiled by that plugin's own
stage plugins in the same build.

## Output

```
dist/cms/astro/
  content.config.ts          one zod collection per component
  forge-badge.astro          static template (presentational component)
  forge-counter.astro        island template (interactive component)
  vue/
    index.js                 entry barrel re-exporting every .astro
    island/                  the co-generated framework components
```

## Static vs island

A component is _interactive_ when its neutral IR carries state, refs, effects, or events.

```astro
---
// forge-badge.astro — presentational
import { classNames } from '@mission-platform/forge-jsx';

export type BadgeVariant = 'default' | 'primary' | 'secondary';

const properties = Astro.props as BadgeProperties;
---
<span class="badge">{properties.children}</span>
```

```astro
---
// forge-counter.astro — interactive
import { Counter } from './island/index.js';

const props = Astro.props;
---
<Counter
  client:load
  {...props}
/>
```

## Diagnostics

| Code                                       | Severity | Meaning                                                          |
| :----------------------------------------- | :------- | :--------------------------------------------------------------- |
| `FORGE_ASTRO_DYNAMIC_RENDER_UNSUPPORTED`   | warning  | A dynamic render target is not lowered in static Astro output.   |
| `FORGE_ASTRO_RENDER_TREE_EMPTY`            | warning  | No render roots inferred; the source-backed fallback is emitted. |
| `FORGE_ASTRO_UNSAFE_SERIALIZATION`         | warning  | A prop default cannot cross the island boundary as JSON.         |
| `FORGE_ASTRO_COMPONENT_EXPORT_UNSUPPORTED` | warning  | The component is not an exported function declaration.           |

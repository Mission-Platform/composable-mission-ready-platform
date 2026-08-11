# @mission-platform/forge-cms-storyblok

The **Storyblok** CMS target for Forge components. It projects the neutral component barrel onto a Storyblok content
model: a component object per component, a framework blok wrapper, an aggregate `components.json`, and a typed entry
barrel.

## Usage

```ts
// tsdown.config.ts
import { defineTsdownForgeCmsAll } from "@mission-platform/forge-cms-plugin-api";
import { forgeStoryblokCms } from "@mission-platform/forge-cms-storyblok";
import { forgeReactFramework } from "@mission-platform/forge-plugin-react";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";

export default defineTsdownForgeCmsAll({
  rootDir: import.meta.dirname,
  targets: [
    forgeStoryblokCms({
      packageName: "@acme/components",
      plugin: forgeReactFramework(),
      storyblokRuntime: "@storyblok/react",
    }),
    forgeStoryblokCms({
      packageName: "@acme/components",
      plugin: forgeVueFramework(),
      storyblokRuntime: "@storyblok/vue",
    }),
  ],
});
```

## Output

```
dist/cms/storyblok/
  components.json          aggregate manifest (every component object)
  forge-badge.json         one component object per component
  react/
    index.js               entry barrel of blok wrappers
    index.d.ts             typed `SbBlokData & { … }` declarations
    forge-badge.js         the React blok wrapper
  vue/
    …
```

## Field mapping

| Neutral kind | Storyblok field                    |
| :----------- | :--------------------------------- |
| `text`       | `text` (translatable)              |
| `richtext`   | `richtext`                         |
| `number`     | `number`                           |
| `boolean`    | `boolean`                          |
| `option`     | `option` with self-sourced options |
| `asset`      | `asset`                            |
| `link`       | `multilink`                        |
| `children`   | `bloks`                            |

Callback props are dropped, and a union mixing string literals with `string`/`number` degrades to `text` — both
decisions live in the shared content model, so every CMS target agrees on them.

## Wrappers

Each wrapper takes Storyblok's `blok` prop, forwards every schema field to the matching prop of the **built** framework
component, tags it editable (`storyblokEditable(blok)` / `v-editable` / the Svelte action), and renders `bloks` fields
through `StoryblokComponent`. React, Vue, Solid, Svelte, and Web Components are supported; any other framework plugin is
rejected at configuration time.

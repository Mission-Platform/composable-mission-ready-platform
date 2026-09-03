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

### Editor metadata and plugin-backed settings

Component JSDoc can provide the editor icon and colour. Values are trimmed, and
the annotation is preferred over target-level defaults:

```tsx
/**
 * A promotional banner.
 * @cmsIcon megaphone
 * @cmsColour: #3b82f6
 */
export function ForgePromoBanner(properties: PromoBannerProperties) {
  // ...
}
```

`@cmsColor` is also accepted. When an annotation is absent, configure defaults
on the Storyblok target with `metadata`; otherwise the generator uses the
deterministic fallback `block-icon-<technical-name>` and a stable six-digit
colour derived from the technical name. Blank annotations are treated as
missing, so they use the same fallback rules.

Props tagged `@cmsSetting` become Storyblok plugin fields when `pluginField` is
configured. `requiredFields` is serialized as Storyblok's comma-separated
`required_fields` value:

```ts
forgeStoryblokCms({
  packageName: "@acme/components",
  plugin: forgeReactFramework(),
  storyblokRuntime: "@storyblok/react",
  metadata: { icon: "component", color: "#64748b" },
  pluginField: {
    fieldType: "my-storyblok-plugin",
    requiredFields: ["label", "value"],
  },
});
```

For example, a field declared as `title?: string` with `@cmsSetting` and a
`?? "Welcome"` default is emitted as:

```json
{
  "title": {
    "type": "plugin",
    "pos": 0,
    "translatable": true,
    "field_type": "my-storyblok-plugin",
    "required_fields": "label,value",
    "default_value": "Welcome"
  }
}
```

The surrounding component object includes the resolved metadata as well:

```json
{
  "name": "promo_banner",
  "display_name": "Promo Banner",
  "color": "#3b82f6",
  "icon": "megaphone",
  "is_root": false,
  "is_nestable": true
}
```

Without `pluginField`, `@cmsSetting` retains its normal neutral-to-Storyblok
field mapping. Invalid plugin identifiers or required field names are rejected
when `forgeStoryblokCms` is created. The same projection is used for each
`<folder>.json` artifact and the aggregate `components.json` manifest.

### Editor tabs and atomic component folders

Use `@cmsTab` on a prop to group it under a Storyblok editor tab. Both the
space and colon forms are accepted, and the label is trimmed:

```tsx
export interface PromoBannerProperties {
  /** @cmsTab Content */
  title?: string;
  /** @cmsTab: Content */
  description?: string;
  /** Remains at the component schema root. */
  enabled?: boolean;
}
```

Each distinct annotated label becomes one synthetic `type: "tab"` schema entry.
Its `display_name` is the label and its `keys` list contains the annotated props
in declaration order. Fields without `@cmsTab` remain ordinary root-level
fields; blank annotations are treated as unannotated. Tab keys use a stable
`tab_` prefix and deterministic suffixes when a label collides with another
tab or a real prop name.

Components discovered below an atomic source folder mirror that hierarchy in
generated schema and wrapper artifacts. For example, a source component at
`src/components/atoms/forge-badge` emits:

```text
dist/cms/storyblok/react/
  atoms/forge-badge/forge-badge.json
  atoms/forge-badge/forge-badge.js
  index.js                  entry import: ./atoms/forge-badge/forge-badge
```

Flat components retain their existing filenames. The aggregate
`components.json` manifest and `index.d.ts` remain at their logical output
roots, regardless of component nesting.

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

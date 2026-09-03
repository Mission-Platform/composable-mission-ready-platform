# @mission-platform/forge-cms-webflow

The **Webflow** CMS target for Forge components.

Webflow is the only target in the family that consumes a _running framework component_ rather than a template language,
so this target declares `island: 'framework'` and `supportedFrameworks: ['react']`: every emitted declaration wraps the
React component the bound plugin co-generated from the same neutral IR, and binding anything other than React throws a
`TypeError` at configuration time.

## Usage

```ts
// tsdown.config.ts
import { defineTsdownForgeCms } from "@mission-platform/forge-cms-plugin-api";
import { forgeWebflowCms } from "@mission-platform/forge-cms-webflow";
import { forgeReactFramework } from "@mission-platform/forge-plugin-react";

export default defineTsdownForgeCms({
  rootDir: import.meta.dirname,
  target: forgeWebflowCms({
    packageName: "@acme/components",
    plugin: forgeReactFramework(),
    libraryName: "Acme UI", // defaults to "Forge"
    group: "Acme", // Designer group; defaults to "Mission Platform"
  }),
});
```

`@webflow/react` and `@webflow/data-types` are **runtime externals**, not dependencies of this package: they are
supplied by the consuming site's Webflow toolchain and are declared through the plugin's `runtimeExternals` so the
bundler never inlines them.

## Output

```
dist/cms/webflow/
  webflow.json               the library fragment (copied asset)
  react/
    Badge.webflow.js         one code-component declaration per component
    Grid.webflow.js
    index.js                 entry barrel re-exporting every declaration
    island/                  the co-generated React components
```

## The emitted declaration

```tsx
// Badge.webflow.tsx
import { props } from "@webflow/data-types";
import { declareComponent } from "@webflow/react";

import { Badge } from "./island/index.js";

export default declareComponent(Badge, {
  name: "Badge",
  description: "Visual tone of the badge.",
  group: "Mission Platform",
  props: {
    variant: props.Variant({
      name: "Variant",
      options: ["default", "primary", "secondary"],
      defaultValue: "default",
    }),
    size: props.Variant({
      name: "Size",
      options: ["sm", "md", "lg"],
      defaultValue: "md",
    }),
    pill: props.Visibility({ name: "Pill" }),
    children: props.Slot({ name: "Content" }),
  },
});
```

The island specifier comes from `context.islandEntry` and falls back to `./island/index.js`. `description` stands in for
the component-level documentation the neutral model does not carry: the first documented prop supplies it, and the key
is omitted entirely when no prop is documented. `defaultValue` appears only when the analysed field actually has one,
and `props: {}` is emitted for a component with no authorable fields.

Declaration keys are **React prop names**, not neutral field names — the default slot is the `content` field in the
neutral model but reaches the island as `children`, so that one key is rewritten while its Designer label stays
`Content`. Prop labels are the field's display form (`brandName` → `Brand Name`).

## Field mapping

| Neutral kind | `@webflow/data-types` | Notes                                              |
| :----------- | :-------------------- | :------------------------------------------------- |
| `text`       | `props.Text`          |                                                    |
| `richtext`   | `props.RichText`      |                                                    |
| `number`     | `props.Text`          | Webflow has no numeric prop; warns, default quoted |
| `boolean`    | `props.Visibility`    |                                                    |
| `option`     | `props.Variant`       | carries the literal union as `options`             |
| `asset`      | `props.Image`         |                                                    |
| `link`       | `props.Link`          |                                                    |
| `children`   | `props.Slot`          | default slot keyed as `children`                   |

## The library manifest

```json
{
  "library": {
    "name": "Forge",
    "components": ["./cms/webflow/react/*.webflow.js"]
  }
}
```

`webflow.json` is emitted as an `asset`, so it lands in `dist/cms/webflow/` while the compiled declarations stay in
`dist/cms/webflow/react/`; the glob is written relative to the package `dist` root and is resolved by Webflow itself,
which is why the manifest never enumerates components and can never drift out of sync with the emitted tree. Merge the
`library` block into the consuming site's own `webflow.json`, which owns the workspace and site ids.

## Entry barrel

Each declaration is re-exported as `<PublicName>Component`:

```ts
export { default as BadgeComponent } from "./Badge.webflow.js";
```

The suffix exists because the same output tree also contains the co-generated island, whose barrel exports every
component under its bare public name; an unsuffixed re-export could shadow the very component the declaration wraps.

## Code Components, not the Designer API

This target deliberately emits **Code Components** — a `declareComponent` call per component plus a `webflow.json`
library fragment — rather than Designer-API component definitions. The Designer API can create elements and components,
but it has no endpoint for creating _component properties_, so a library published that way would arrive in the
Designer with every prop hard-coded and nothing for an author to change. Code Components carry the prop contract in the
shipped module, which is the only route that preserves the neutral content model.

For the same reason there is no `emitSchema`: for a Code Component the declaration _is_ the schema, and a second
description of the same props could only ever drift from it.

## Diagnostics

| Code                           | Severity | Meaning                                                                          |
| :----------------------------- | :------- | :------------------------------------------------------------------------------- |
| `FORGE_WEBFLOW_NUMBER_AS_TEXT` | warning  | Webflow has no numeric prop type; the field is authored as `props.Text` instead. |

The target never raises an `error`. The shared driver aborts a build on errors, and a numeric prop degraded to text is
still a working component — the React-only restriction is the one genuine misconfiguration, and it is enforced by
`defineForgeCmsPlugin` throwing a `TypeError` rather than by a diagnostic.

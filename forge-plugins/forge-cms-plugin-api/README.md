# @mission-platform/forge-cms-plugin-api

Public API contracts, the platform-neutral content model, and the build helpers every Forge **CMS target** is built on.

Forge already compiles a neutral component into React, Vue, Solid, Svelte, or Web Components through a
`FrameworkOutputPlugin`. This package adds the orthogonal axis: projecting that same component onto a **content
platform** — Storyblok, Astro, Ghost, Jekyll, Webflow — so that `storyblok × vue`, `astro × solid`, and
`ghost × web-components` are configuration rather than new code.

## What it owns

| Concern               | Entry point                                                   |
| :-------------------- | :------------------------------------------------------------ |
| Neutral content model | `analyzeContentComponent`, `ContentComponent`, `ContentField` |
| Prop classification   | `classifyType`, `SLOT_TYPE_REFERENCES` and friends            |
| Name derivation       | `toTechnicalName`, `toDisplayName`, `toKebabName`             |
| Target contract       | `CmsOutputPlugin`, `defineForgeCmsPlugin`                     |

A CMS target implements `CmsOutputPlugin` and returns `CmsArtifact`s from its emitters; the generic driver discovers the
components, obtains the neutral IR once per component, and writes whatever the target returned.

## Content model

`analyzeContentComponent(sourceFile, names, semantic?)` maps a neutral component's props interface onto ordered
`ContentField`s:

- **kind** — `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, or `children`
- **description** — the prop's JSDoc summary
- **required** — no `?` token on the property signature
- **defaultValue** — the literal from `properties.x ?? 'v'` or `const { x = 'v' } = properties`
- **isSlot / slotName** — `MpChild`-typed props and the default `children` slot
- **setting** — the prop carries the `@cmsSetting` JSDoc tag (site-wide theme settings)

Callback props are dropped: they are behaviour, not authorable content. A union mixing string literals with `string` or
`number` degrades to `text`, because it cannot be a closed dropdown.

When the optional `SemanticModule` is supplied, `ContentComponent.interactive` reports whether the component carries
state, refs, effects, or events — the signal a target uses to decide between static markup and a hydrated island.

## Target contract

```ts
import { defineForgeCmsPlugin } from "@mission-platform/forge-cms-plugin-api";

export const myCms = defineForgeCmsPlugin({
  id: "my-cms",
  framework: forgeVueFramework(),
  packageName: "@acme/components",
  emitTemplate(component, ir, context) {
    return {
      fileName: `${component.names.folder}.html`,
      contents: "…",
      artifactKind: "template",
    };
  },
  build: {},
});
```

`defineForgeCmsPlugin` throws at configuration time on a missing `id`, `packageName`, `framework`, `emitTemplate`, or
`build`, and when the bound framework plugin is outside the target's `supportedFrameworks`.

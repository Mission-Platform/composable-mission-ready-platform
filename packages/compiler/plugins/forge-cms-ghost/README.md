# @mission-platform/forge-cms-ghost

The **Ghost** CMS target for Forge components.

Ghost is the most constrained platform Forge projects onto: a theme is a folder of Handlebars templates, so there is no
component runtime to hydrate and no module to import. Each neutral component therefore becomes a **partial** under
`partials/forge/`, a `forge-components.json` restores the parameter contract Handlebars cannot express, and any prop
tagged `@cmsSetting` is surfaced in Ghost Admin through a `ghost-theme-config.json` fragment.

The target is framework-agnostic — the emitted Handlebars is identical whichever `FrameworkOutputPlugin` is bound, so
`supportedFrameworks` is left unset and `island` is `'none'`.

## Usage

```ts
// tsdown.config.ts
import { defineTsdownForgeCms } from "@mission-platform/forge-cms-plugin-api";
import { forgeGhostCms } from "@mission-platform/forge-cms-ghost";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";

export default defineTsdownForgeCms({
  rootDir: import.meta.dirname,
  target: forgeGhostCms({
    packageName: "@acme/components",
    plugin: forgeVueFramework(),
    themeName: "casper",
  }),
});
```

`themeName` defaults to `forge` and only names the theme the `config.custom` fragment belongs to.

## Output

```
dist/cms/ghost/
  forge-components.json      the partial-parameter contract
  ghost-theme-config.json    a `config.custom` fragment for the theme's package.json
  partials/
    forge/
      badge.hbs              one Handlebars partial per component
      layout.hbs
  vue/
    index.ts                 placeholder entry written by the shared driver
```

A generated partial guards every parameter, re-expresses each neutral default as a Handlebars fallback (Handlebars has
no defaults of its own), and mirrors every non-slot field onto a `data-*` attribute so a theme can style on it:

```handlebars
{{!-- partials/forge/badge.hbs --}}
<div class="forge-badge"
  data-variant="{{variant}}"
  data-size="{{size}}"
  data-pill="{{pill}}"
>
  <span class="forge-badge__variant">{{#if variant}}{{variant}}{{else}}default{{/if}}</span>
  <span class="forge-badge__size">{{#if size}}{{size}}{{else}}md{{/if}}</span>
  <span class="forge-badge__pill">{{#if pill}}{{pill}}{{/if}}</span>
  {{#if @partial-block}}{{> @partial-block}}{{/if}}
</div>
```

The default slot is the partial's block content; a named slot is an ordinary hash parameter carrying pre-rendered
markup, so it is emitted unescaped:

```handlebars
{{#> forge/layout sticky=true header=headerHtml}}
  <p>Body content fills the default slot.</p>
{{/forge/layout}}
```

## Field mapping

Ghost's `config.custom` block accepts exactly five setting types. The same vocabulary types the parameters in
`forge-components.json`, so one component reads the same way in both artifacts.

| Neutral kind | Ghost type | Notes                                                           |
| :----------- | :--------- | :-------------------------------------------------------------- |
| `option`     | `select`   | Carries `options` and, when present, `default`.                 |
| `boolean`    | `boolean`  | —                                                               |
| `asset`      | `image`    | —                                                               |
| `link`       | `text`     | Ghost has no link type; the URL is authored as text.            |
| `richtext`   | `text`     | Ghost has no per-setting rich text; markup is authored as text. |
| `text`       | `text`     | —                                                               |
| `number`     | `text`     | Ghost has no numeric type — reported as a warning.              |
| `children`   | —          | Slots are not settings; they are partial block/hash content.    |

`color` is part of Ghost's vocabulary but no neutral kind maps onto it: a colour is an ordinary string in TypeScript,
and inferring one from a prop's name would make the projection non-deterministic.

Only props tagged `@cmsSetting` reach `ghost-theme-config.json`, keyed by their snake_cased name (`brandName` →
`brand_name`), because Ghost's custom settings are site-wide rather than per component.

## Diagnostics

Every code is a `warning`. Ghost's limits are real but survivable — a theme that renders a number as text still works —
and the shared driver fails a build on `error`, so this target never raises one.

| Code                            | Severity | Meaning                                                                |
| :------------------------------ | :------- | :--------------------------------------------------------------------- |
| `FORGE_GHOST_FIELD_UNSUPPORTED` | warning  | A `number` field has no Ghost equivalent and degrades to text.         |
| `FORGE_GHOST_SETTING_LIMIT`     | warning  | More than 20 `@cmsSetting` fields were found; the surplus was dropped. |

# @mission-platform/forge-cms-jekyll

The **Jekyll** (Liquid) CMS target for Forge components.

Jekyll has no client runtime and no module system, so this target declares `island: 'none'` and no
`supportedFrameworks`: its deliverable is Liquid, which is framework-agnostic. Every neutral component becomes one
self-contained `_includes` partial whose defaults are bound with Liquid's `default:` filter, plus two aggregates that
make those partials discoverable from `site.data` and `_config.yml`.

## Usage

```ts
// tsdown.config.ts
import { defineTsdownForgeCms } from "@mission-platform/forge-cms-plugin-api";
import { forgeJekyllCms } from "@mission-platform/forge-cms-jekyll";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";

export default defineTsdownForgeCms({
  rootDir: import.meta.dirname,
  target: forgeJekyllCms({
    packageName: "@acme/components",
    plugin: forgeVueFramework(),
  }),
});
```

Any framework plugin may be bound — it only decides which per-framework directory the build writes alongside the
Liquid tree. Pass `includeNamespace` to move the partials out of the default `forge/` sub-directory when a site already
uses that name.

## Output

```
dist/cms/jekyll/
  _config.yml                       namespace + per-component defaults
  _data/
    forge-components.yml            the schema of every emitted include
  _includes/
    forge/
      badge.html                    one Liquid partial per component
      layout.html
  vue/
    index.ts                        placeholder entry (Liquid has no module entry)
```

Copy `_includes/`, `_data/`, and the `_config.yml` keys into the Jekyll site; nothing else is required at build time.

## The emitted include

```liquid
{%- comment -%} _includes/forge/badge.html {%- endcomment -%}
{%- assign variant = include.variant | default: 'default' -%}
{%- assign size = include.size | default: 'md' -%}
{%- assign pill = include.pill -%}

<div
  class="forge-badge"
  data-variant="{{ variant }}"
  data-size="{{ size }}"
  data-pill="{{ pill }}"
>
  {{ include.content }}
</div>
```

Non-slot props are bound once at the top so the analysed default lives in a single place; slots are echoed straight
from `include` because they carry pre-rendered markup a `default:` filter must never touch. The default slot is named
`content`.

```liquid
{% include forge/badge.html variant="primary" content="New" %}
```

## Field mapping

| Neutral kind | `_data` type | In the include                         |
| :----------- | :----------- | :------------------------------------- |
| `text`       | `string`     | `data-*` attribute on the root element |
| `richtext`   | `string`     | `data-*` attribute on the root element |
| `asset`      | `string`     | `data-*` attribute on the root element |
| `link`       | `string`     | `data-*` attribute on the root element |
| `number`     | `number`     | bare `default:` literal, no quotes     |
| `boolean`    | `boolean`    | bare `default:` literal, no quotes     |
| `option`     | `enum`       | `values:` sequence in `_data`          |
| `children`   | `slot`       | `{{ include.<name> }}`, never bound    |

Jekyll renders everything through Liquid as a string, so collapsing `text`/`richtext`/`asset`/`link` onto `string`
loses nothing the renderer could have used; the precise TypeScript type stays recoverable from the neutral model.

## Consuming the `_data` schema

`_data/forge-components.yml` is a sequence in compiler order, so a site can drive a component gallery, an editor UI, or
a validation step from it without parsing a single partial:

```liquid
{% for component in site.data["forge-components"] %}
  <h2>{{ component.display_name }}</h2>
  <ul>
    {% for field in component.fields %}
      <li>
        <code>{{ field.name }}</code> — {{ field.type }}
        {%- if field.default %} (default <code>{{ field.default }}</code>){% endif %}
      </li>
    {% endfor %}
  </ul>
  {% include {{ component.include }} %}
{% endfor %}
```

`_config.yml` mirrors the same defaults under `site.forge.defaults`, because a page that renders a component from data
rather than from a literal `{% include %}` never runs the `default:` filters and would otherwise see empty values.

## Diagnostics

Liquid can carry every neutral field kind, so diagnostics are rare and never fatal.

| Code                            | Severity | Meaning                                                                                                                          |
| :------------------------------ | :------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `FORGE_JEKYLL_SLOT_UNSUPPORTED` | warning  | A named slot collides with a non-slot prop of the same name; `include` is one flat namespace, so both resolve to the same value. |

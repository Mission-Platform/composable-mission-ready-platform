# @mission-platform/vite-plugin-token-overrides

Vite plugin that lets an app **re-skin** the Mission Platform design system
without forking `@mission-platform/tokens`. It reads a
[DTCG](https://www.designtokens.org/)-style _override_ document
(`*.tokens.json`), transforms it into a `:root { --mp-*: … }` SCSS partial, and
writes that partial to disk automatically on `vite build` / dev-server start (and
regenerates it when the source changes in dev). Import the generated file from
your stylesheet _after_ the base tokens and the override declarations win the
cascade — there is no manual generate script to run.

Unlike the full `@mission-platform/vite-plugin-tokens` generator, this plugin is
deliberately lightweight and override-focused: it does **not** resolve palette
aliases, emit `$`-variables, or register `@property` rules (the base tokens
package already does all of that). It only flattens the override leaves to
custom-property declarations.

Value handling:

- a `{ light, dark }` object → `light-dark(<light>, <dark>)` (scheme-aware, like
  the base semantic colour tokens);
- any other scalar (hex, rem, a shadow list, a font-family stack, a number) → emitted verbatim.

The generated file is a build artefact — add it to `.gitignore` /
`.prettierignore` rather than committing it.

The central Forge component contract lives in
`packages/tokens/tokens/component.tokens.json`. Component overrides use the
same stable path below the `component` namespace, so Storybook and consuming
applications can restyle a component without changing its implementation:

```jsonc
{
  "component": {
    "button": {
      "primary": {
        "background": {
          "hover": {
            "$value": { "light": "#153fd1", "dark": "#9db0ff" },
          },
        },
      },
    },
  },
}
```

The path maps to `--mp-component-button-primary-background-hover`. Keep
component names, variants, slots, and state names in kebab-case and override
only documented leaves when matching the Figma contract. The schema accepts
additional nested component paths for forward-compatible consumer contracts.

## Usage

```ts
// vite.config.ts
import { tokenOverridesPlugin } from '@mission-platform/vite-plugin-token-overrides';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tokenOverridesPlugin({
      // Path to the override document, relative to the Vite root.
      source: 'design-tokens/overrides.tokens.json',
      // Optional; defaults to `design-tokens/overrides.generated.scss`.
      // outFile: 'design-tokens/overrides.generated.scss',
    }),
  ],
});
```

```scss
/* styles.css / styles.scss — imported after the base tokens so it wins the cascade */
@import '@mission-platform/tokens';
@import '../design-tokens/overrides.generated.scss';
```

### Options

| Option    | Default                                          | Description                                                           |
| --------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| `source`  | _(required)_                                     | Path to the DTCG override `*.tokens.json`, relative to the Vite root. |
| `outFile` | `source` with `.tokens.json` → `.generated.scss` | Where to write the generated SCSS partial, relative to the Vite root. |
| `prefix`  | `mp`                                             | Custom-property prefix, matching `@mission-platform/tokens`.          |
| `header`  | a "do not edit" banner                           | Leading comment written at the top of the generated partial.          |

The transform helpers (`buildTokenOverrideScss`, `flattenOverrides`, and the
`OverrideGroup`/`OverrideToken`/`OverrideValue` types) are also exported for
tooling that needs to produce the SCSS outside of Vite.

## JSON Schema

A [JSON Schema](https://json-schema.org/) (Draft 2020-12) for the override
document ships with the package and is exported at
`@mission-platform/vite-plugin-token-overrides/schema` (file:
`schema/token-overrides.schema.json`). It describes the DTCG structure the
transform accepts — a nested tree of groups whose leaves are
`{ $value, $description? }` tokens, where `$value` is a scalar or a
`{ light, dark }` pair — and gives editors validation and autocomplete for your
`*.tokens.json`.

Reference it from the override document with a `$schema` key (a `$`-prefixed key,
so the transform ignores it):

```jsonc
{
  // Relative path from the override document to the schema; adjust the depth to
  // your repository layout, or point at the published file under node_modules.
  "$schema": "../../../vite-plugins/token-overrides/schema/token-overrides.schema.json",
  "component": {
    "button": {
      "primary": {
        "background": {
          "hover": { "$value": { "light": "#153fd1", "dark": "#9db0ff" } },
        },
      },
    },
  },
  "color": {
    "primary": {
      "default": { "$value": { "light": "#8b7ff0", "dark": "#a99cf5" } },
    },
  },
}
```

The MCP consumer tool `generate_token_override` and any editor with JSON Schema
support use this file to validate override documents before they are transformed.

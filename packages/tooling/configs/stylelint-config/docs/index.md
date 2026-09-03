# @mission-platform/stylelint-config

Shared Stylelint rules for CSS and SCSS in Mission Platform.

## Install and use

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

Style-bearing workspaces use a workspace-local `stylelint.config.mjs` in ESM
format. Import and spread the shared configuration rather than duplicating its
`extends` entries:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

The shared configuration extends `stylelint-config-standard-scss` and
`stylelint-config-recommended-vue`. It uses `postcss-html` by default, uses
`postcss-scss` for `**/*.scss`, and uses `postcss-html` for Vue SFC style
blocks. This supports CSS, SCSS, and Vue styles without workspace-specific
syntax configuration.

Add the direct support dependencies above to the workspace's
`devDependencies` using the `catalog:stylelint` versions, along with the
shared config package using `workspace:*`. Add scripts that cover the
workspace's style sources, for example:

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

Keep component styles close to their component and use local overrides only for
a documented workspace constraint.

## Contribute

Run `pnpm --filter @mission-platform/stylelint-config lint` and
`pnpm --filter @mission-platform/stylelint-config format`. Test rule changes
against both package SCSS and application styles.

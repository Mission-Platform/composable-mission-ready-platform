# Mission Platform – Agent Guidelines

## Monorepo Structure

```
composable_mission_ready_platform/
├── apps/
│   └── storybook/          # Storybook dev app (Vue 3 + Vite)
└── packages/
    ├── tokens/             # Design tokens & SCSS themes (@mission-platform/tokens)
    ├── components/         # Vue 3 component library (@mission-platform/components)
    ├── i18n/               # vue-i18n integration & locale messages (@mission-platform/i18n)
    ├── icons/              # Vue 3 SVG icon library (@mission-platform/icons)
    ├── eslint-config/      # Shared ESLint config
    ├── prettier-config/    # Shared Prettier config
    └── stylelint-config/   # Shared Stylelint config
```

Package manager: **pnpm** with workspaces.

---

## Component Authoring Convention (`packages/components`)

Every component lives in its own folder under `packages/components/src/components/`:

```
src/components/
└── [ComponentName]/
    ├── index.ts                       # Public barrel: re-exports default + named types
    ├── [ComponentName].vue            # Component implementation
    ├── [ComponentName].stories.tsx    # Storybook stories (TSX, autodocs)
    └── [ComponentName].spec.ts        # Unit tests (Vitest + @vue/test-utils)
```

> **No `.mdx` files** — do not create `[ComponentName].mdx` documentation files. Component documentation belongs in the `.stories.tsx` file (via `autodocs`) or in code comments.

### Rules

1. **Folder name** matches the component's PascalCase name (e.g. `BaseButton`).
2. **`index.ts`** re-exports the default component and any exported TypeScript types:
   ```ts
   export { default } from './BaseButton.vue'
   export type { ButtonVariant, ButtonSize } from './BaseButton.vue'
   ```
3. **`.vue` file** uses `<script setup lang="ts">` with explicit Vue API imports (`import { computed, ref, watch } from 'vue'`). Never rely on auto-imports.
4. **`.stories.tsx`** uses the `@storybook/vue3-vite` API, sets `title: 'Components/<Category>/<ComponentName>'`, and tags `['autodocs']`.
5. The **main barrel** at `src/index.ts` imports from each folder's `index`:
   ```ts
   export { default as BaseButton } from './components/BaseButton/index'
   export type { ButtonVariant, ButtonSize } from './components/BaseButton/index'
   ```
6. **No flat component files** — do not place `.vue`, `.stories.*` or `.ts` files directly inside `src/components/`.
7. **`[ComponentName].spec.ts`** contains Vitest unit tests using `@vue/test-utils`. Every component must have a spec file in its folder. Tests run with `pnpm test` in `packages/components` (jsdom environment, no browser required).
8. **Prefer semantic HTML over ARIA roles.** Always reach for the native element that already carries the correct semantics instead of adding a `role` to a generic element:
   - `<button>` instead of `<div role="button">`
   - `<ul>` / `<ol>` + `<li>` instead of `role="list"` / `role="listitem"`
   - `<a href>` instead of `role="link"`
   - `<nav>`, `<header>`, `<footer>`, `<main>`, `<section>`, `<fieldset>`, `<dialog>`, `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>` instead of their `role="…"` equivalents
   - Only use an explicit `role` when **no** native element provides the semantics (e.g. `slider`, `tab`/`tablist`/`tabpanel`, `menu`/`menuitem`, `alert`/`status`/`log` live regions, `tooltip`, `img` on inline SVG). Native interactive elements also give keyboard behaviour and focus for free, so they are strongly preferred.
9. **Target WCAG 2.2 compliance.** New/modified components should keep meeting the published a11y bar:
   - **Reduced motion** — CSS animations/transitions are neutralised globally by the bundled `src/styles/a11y.scss` reset, so you don't need per-component `@media (prefers-reduced-motion)` blocks for plain CSS motion. For **JS-driven** motion (autoplay, `setInterval` rotation, `scrollTo({ behavior: 'smooth' })`, programmatic animation), gate it on the `useReducedMotion()` composable (or the one-off `prefersReducedMotion()`).
   - **Auto-moving content** — anything that moves/auto-advances for more than 5s (carousels, marquees) must expose an accessible, always-available pause/stop control (WCAG 2.2.2), not only pause-on-hover.
   - **Target size** — interactive controls should present at least a 24×24px hit area (WCAG 2.5.8). Keep a small visual affordance (e.g. a dot) inside a larger transparent/padded target rather than shrinking the clickable element.
   - **Focus visibility** — every focusable control needs a clear `:focus-visible` indicator (use the `--mp-shadow-focus-*` tokens or a 2px outline with offset); never remove focus styling without a replacement.

---

## Design Tokens (`packages/tokens`)

- SCSS primitive tokens live in `src/scss/_tokens.scss`.
- CSS custom-property bridges: `src/scss/_css-vars.scss`.
- Themes emit `--mp-*` CSS variables: `src/scss/themes/light/` and `src/scss/themes/dark/`.
- TypeScript exports at `src/index.ts`.
- All `--mp-*` variables are consumed by the `components` and `icons` packages — never hard-code colours or spacing values.

---

## Icons (`packages/icons`)

Each icon is a single `.vue` file under `src/components/` accepting `size`, `color`, and `ariaLabel` props. Color defaults to `currentColor`. Export from `src/index.ts`.

---

## Storybook (`apps/storybook`)

- Imports styles via `preview.ts`: `@mission-platform/tokens/scss/tokens`, `@mission-platform/tokens/scss/themes/light`, and `@mission-platform/components/styles`.
- Story globs in `main.ts` cover `packages/components/src/**` and `packages/icons/src/**`.

---

## Testing (`packages/components`)

Tests use **Vitest** with **jsdom** environment and **@vue/test-utils**:

```bash
# Run all component tests
cd packages/components && pnpm test

# Run in watch mode
cd packages/components && pnpm test:watch

# Generate coverage report
cd packages/components && pnpm test:coverage
```

Each spec file lives alongside its component: `[ComponentName]/[ComponentName].spec.ts`.
Typical test coverage per component includes: rendering, prop binding, slot content, CSS class application, emitted events, and disabled/error states.

### `mountWithI18n` helper

Components that use `useI18n` internally **must** be mounted with `mountWithI18n` instead of plain `mount`:

```ts
import { mountWithI18n as mount } from '../../test-utils/mountWithI18n'
```

The helper installs `createMpI18n()` automatically as a global plugin, so all `useI18n` calls inside the component tree resolve correctly.

---

## i18n (`packages/i18n`)

Built on **vue-i18n v11** in composition (non-legacy) mode.

### Package-level locale modules

Each package that contains translatable strings exports a **locale module** — a plain `MpLocaleModule` object keyed by locale code:

```
src/locales/
├── en.ts        # English strings
└── index.ts     # exports: { locales: MpLocaleModule }
```

The components package (`@mission-platform/components`) exports its module via the `./locales` sub-path:

```ts
// packages/components/src/locales/index.ts
import type { MpLocaleModule } from '@mission-platform/i18n'
import { en } from './en'
export const locales: MpLocaleModule = { en }
```

### Composing modules in an app (or Storybook)

```ts
import { createMpI18n } from '@mission-platform/i18n'
import { locales as uiLocales } from '@mission-platform/components/locales'

app.use(createMpI18n({
  locale: 'en',                  // optional, defaults to 'en'
  modules: [uiLocales],          // packages/apps contribute their own strings
  messages: { fr: { required: 'requis' } },  // optional top-level overrides
}))
```

- `modules` — array of `MpLocaleModule` objects, merged left-to-right per locale.
- `messages` — low-level per-locale overrides applied _after_ all modules (for final customisations).
- `locale` — active locale (default `'en'`); `'en'` is always the fallback.

### Adding a new locale to a package

1. Create `src/locales/fr.ts` (or any locale code) with the translated strings.
2. Import it in `src/locales/index.ts` and add it to the `locales` object:
   ```ts
   import { fr } from './fr'
   export const locales: MpLocaleModule = { en, fr }
   ```
3. Consumers include the module in their `createMpI18n({ modules: [uiLocales] })` call — no other changes needed.

### Locale files: YAML format

Locale messages are stored in **YAML** (`*.yaml`) files, not TypeScript:

```
src/locales/
├── en.yaml      # English strings for this package
└── index.ts     # exports: { locales: MpLocaleModule }
```

`@intlify/unplugin-vue-i18n` is configured in every `vite.config.ts` to compile
the YAML files at build time — no manual compile step is needed for `build`.

The `i18n:compile` script in each package can pre-compile YAML to JS for
environments that need pre-compiled resources:

```sh
pnpm i18n:compile   # intlify compile -s src/locales/en.yaml -o dist/locales
```

### ESLint: vue-i18n rules

`@intlify/eslint-plugin-vue-i18n` is wired into `@mission-platform/eslint-config`
via `flat/recommended`.  It checks `.ts`, `.tsx`, and `.vue` files and uses
`./src/locales/*.{yaml,yml}` as the locale source for key resolution rules.

Key rules enabled by the recommended preset:
- `@intlify/vue-i18n/no-missing-keys` — translation key must exist in locale file
- `@intlify/vue-i18n/no-unused-keys` — locale keys must be referenced in code
- `@intlify/vue-i18n/no-raw-text` — raw UI text in templates triggers a warning
- `@intlify/vue-i18n/no-dynamic-keys` — dynamic key expressions are disallowed

### Using translations in a component

```ts
import { useI18n } from 'vue-i18n'

const { t } = useI18n({
  inheritLocale: true,          // picks up the app-level locale
  messages: { en: { required: 'required' } },
})
```

Components that call `useI18n` **must** be mounted inside an app that has `vue-i18n` installed (via `createMpI18n`).

---

## Accessibility (a11y)

- **Storybook addon**: `@storybook/addon-a11y` is installed and configured with `a11y.test: 'error'` in `preview.ts` — violations fail the story test run.
- **`useId` composable** (`packages/components/src/composables/useId.ts`): generates a stable `mp-{n}` id when the consumer does not pass an explicit `id` prop.  All form components call this so label↔input associations are always valid.
- **ARIA conventions used in `components` components**:
  - `aria-invalid` is only set when truthy (omitted otherwise to avoid false negatives).
  - `aria-describedby` points to the error or hint paragraph id (using `resolvedId`).
  - The loading spinner uses `role="status"` + `aria-label` (localised via vue-i18n).
  - Required asterisks carry `aria-hidden="true"` and a localised `title` attribute.

---

## Build & Verify

```bash
# Build tokens first (components depends on it)
cd packages/tokens && pnpm build

# Build i18n
cd packages/i18n && pnpm build

# Build components
cd packages/components && pnpm build

# Build icons
cd packages/icons && pnpm build

# Verify Storybook
cd apps/storybook && pnpm build-storybook
```

Always run `pnpm install --no-frozen-lockfile` from the repo root after adding new workspace dependencies.

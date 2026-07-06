# API Reference

## Packages

### @mission-platform/breakpoints
- **Responsive utilities**: `useBreakpoint()` composable, `$breakpoints` SCSS variables
- **Visibility components**: `<ShowIf>`, `<HideIf>` Vue 3; `Visible`, `Hidden` React wrappers

### @mission-platform/components
- **Write-once pattern**: Component source in `.tsx`, compiled to Vue 3 (`.vue`) and React (`.tsx`)
- **Key files**: `src/components/<name>/index.ts`, `<name>.module.scss`, `<name>.stories.tsx`
- **Usage**: Import from `./<framework>` subpath (e.g., `@mission-platform/components/vue`)

### @mission-platform/router
- **Neutral route model**: `MpRoute`, `MpRouteLocationRaw` types
- **Vue adapter**: `createMpRouter()`, `useMpRoute()` composables
- **Path syntax**: `:param`, `:param?`, `:param*`, `*`

## Framework Adapters

### React
- **Components**: Rendered via `toReactComponent()`
- **Hooks**: `useState` → `useRef`, `useMemo` → `useMemo`, `useEffect` → `useEffect`
- **Router**: `@mission-platform/router/react`

### Vue 3
- **SFC support**: `<script setup lang="tsx">` with React-style hooks
- **Reactivity**: `useState` → `ref`, `watch` for side effects
- **Router**: `@mission-platform/router/vue` with `useMpRoute()`

## Critical APIs

### Design Tokens
```ts
import { tokens } from '@mission-platform/tokens';
console.log(tokens.color.primary); // OKLAB color value
```

### i18n
```ts
import { createMpI18n } from '@mission-platform/i18n';
const mpI18n = createMpI18n({ locale: 'en' });
mpI18n.t('welcome'); // Translation lookup
```

### SEO
```ts
import { useSeo } from '@mission-platform/seo';
useSeo({
  title: 'Page Title',
  description: 'Meta description',
  openGraph: { images: [{ url: 'og-image.jpg' }] }
});
```

## Migration Notes

### Vue 2 → Vue 3
1. Replace Options API with Composition API
2. Convert `.vue` SFCs to `<script setup lang="tsx">`
3. Update reactivity: `this.$refs` → `ref()`, `this.$watch` → `watch()`

### React → Framework-Neutral
1. Replace JSX with `MpElement` tree
2. Convert hooks to neutral equivalents
3. Use `generateFrameworkSources()` for dual compilation
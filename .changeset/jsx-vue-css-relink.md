---
'@mission-platform/vite-plugin-jsx': patch
'@mission-platform/components': patch
---

fix the Vue build so each component's styles load and apply (stories were unstyled)

Two issues kept the `@mission-platform/components/vue` components (consumed
by Storybook) unstyled, now both fixed so the components are a like-for-like
visual match with the original `@mission-platform/components` SFCs:

1. **CSS not loaded.** `jsxComponentsCssImportPlugin` now runs with
   `enforce: 'post'`, so its `generateBundle` hook executes **after** Vite has
   populated each chunk's `viteMetadata.importedCss`. Previously it ran first,
   found the metadata empty, and never re-linked the per-component CSS — under
   `preserveModules` the Vue style assets were emitted but orphaned
   (`/* empty css */`). Now each Vue component chunk imports its own extracted
   stylesheet (e.g. `base-badge.js` → `import "./base-badge.vue_..._lang.css"`),
   while inline-styled primitives (`BaseGrid`/`BaseStack`/`BaseMasonry`/
   `BaseInView`) correctly stay CSS-free. A regression test guards this.
2. **CSS not applied.** The Vue emitter now inlines each component's SCSS as a
   **non-scoped** `<style lang="scss">` block instead of `<style scoped>`. These
   SFCs render via a `<script>` render function, and Vue only auto-applies the
   `data-v-…` scope attribute to a render function's **root** vnode — so nested
   elements (`base-separator__line`, drawer/hero/navbar internals, …) never
   received it and the scoped rules silently failed to match. The rules stay in
   the `@layer mp.components` cascade layer and rely on the components' unique
   BEM class names (exactly how the original SFCs are namespaced), so styling
   now applies to every element.

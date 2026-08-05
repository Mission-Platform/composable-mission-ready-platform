---
'@mission-platform/vite-plugin-forge': minor
---

Several compiler improvements:

- **Native Web Components (no Lit).** The Web-Components generator now emits `class X extends ForgeElement` importing only `@mission-platform/forge/web-components` — never `lit`. `lit` is removed from the plugin's peer dependencies and framework externals.
- **Full Storyblok coverage.** `emitStoryblokBlokWrapper` now emits Solid (`.tsx`), Svelte (`.svelte`) and native Web-Component (`.ts`) blok wrappers in addition to React/Vue, and `generateStoryblokBloks`/`defineJsxStoryblokLibraryConfig` accept all five frameworks (externalising the matching `@storyblok/*` binding).
- **Structure-preserving cache.** `generateFrameworkSources` now mirrors the source `components/<folder>/…` tree in the generated cache instead of flattening it, rewriting flat `./<base>` imports to the correct nested relative paths.
- **Co-located sibling components.** The generator auto-discovers focused child components authored beside a primary (via PascalCase relative imports) and compiles them as first-class components, so a folder can ship e.g. `forge-tree-view.tsx` + `forge-tree-view-item.tsx` without adding the child to the public barrel.

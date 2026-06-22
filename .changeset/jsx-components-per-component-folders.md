---
'@mission-platform/components': patch
---

restructure sample components into per-component folders

Each sample component now lives in its own folder under `src/components/<name>/`
with a consistent set of co-located files:
`<name>.tsx` (the write-once component), `<name>.module.scss` (demo styling),
`<name>.stories.tsx` (Storybook story), `<name>.spec.ts` (cross-framework SSR
parity test) and `index.ts` (re-export). The public `./react` and `./vue`
exports are unchanged; this is an internal source reorganisation. The Storybook
stories that previously lived in `apps/storybook` now live next to each
component and are globbed from the package.

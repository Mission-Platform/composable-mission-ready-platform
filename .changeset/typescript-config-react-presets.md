---
'@mission-platform/typescript-config': minor
---

add React TypeScript presets

`@mission-platform/typescript-config` now ships two React-oriented presets
alongside the existing Vue ones:

- `./react` — a DOM app/library preset (`jsx: react-jsx`, `DOM`/`DOM.Iterable`
  libs, bundler module resolution) for React workspaces.
- `./stories-react` — the Storybook stories variant, extending `./react`.

These mirror the existing `./app` / `./stories` Vue presets and are consumed by
the new `@mission-platform/storybook-react` app.

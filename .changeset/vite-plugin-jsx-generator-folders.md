---
"@mission-platform/vite-plugin-jsx": patch
---

split the React, Vue and Storyblok emitters into per-generator folders

Each Stage-1 emitter that previously lived in a single `src/generators/<name>.ts`
file is now a `src/generators/<name>/` folder with an `index.ts` barrel and the
implementation split across focused modules — `react/` (`aliases`, `imports`,
`emit-module`), `vue/` (`shared`, `scope`, `effects`, `body`, `imports`,
`styles`, `emit-module`), and `storyblok/` (`types`, `names`, `classify`,
`analyze`, `wrappers`) — to make future maintenance easier. The public API and
all generated output are unchanged.

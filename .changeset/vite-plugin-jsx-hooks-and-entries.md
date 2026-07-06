---
'@mission-platform/vite-plugin-jsx': minor
---

support neutral hooks and generate the per-framework entry modules

The plugin now also handles the framework-neutral React-style hooks
(`useState`/`useRef`/`useEffect`/`useMemo`/`useCallback`) when compiling a
component, and **generates** the per-framework entry module for a neutral
components package (`generateFrameworkSources` + `jsxComponentsEntryDtsPlugin`),
so consumers no longer hand-author `react.ts` / `vue.ts` — the entry is produced
from the components barrel and its `<framework>.d.ts` is synthesised.

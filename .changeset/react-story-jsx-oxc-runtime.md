---
'@mission-platform/storybook-framework': patch
---

Force Vite 8's built-in Oxc JSX transform to `react/jsx-runtime` for the React Storybook renderer. Without this override Oxc stripped `.tsx` syntax using the shared stories tsconfig's `jsxImportSource: 'vue'` before `@vitejs/plugin-react`'s Babel step ever saw raw JSX, so every neutral `*.stories.tsx` compiled to a Vue `VNode` under the React renderer and crashed with "Objects are not valid as a React child" (e.g. all `@mission-platform/scheduler` React stories).

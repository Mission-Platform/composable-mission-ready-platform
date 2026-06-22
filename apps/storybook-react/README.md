# `@mission-platform/storybook-react`

A **React + TypeScript + Vite** Storybook instance for developing, documenting, and visually testing the
**React** builds of the cross-framework Mission Platform components.

It is the React counterpart of [`@mission-platform/storybook`](../storybook) (which catalogues the Vue 3 builds). Both
apps consume the very same write-once components from
[`@mission-platform/components`](../../packages/components) — this app imports the package's `./react` subpath,
while the Vue app imports `./vue`.

## Scripts

```bash
# Run the Storybook dev server (port 6007 — the Vue Storybook uses 6006)
pnpm --filter @mission-platform/storybook-react storybook

# Build the static Storybook
pnpm --filter @mission-platform/storybook-react build-storybook

# Run the Storybook interaction/a11y tests (Vitest browser mode)
pnpm --filter @mission-platform/storybook-react test

# Run the thin landing-page dev server / build
pnpm --filter @mission-platform/storybook-react dev
pnpm --filter @mission-platform/storybook-react build
```

## Stories

Stories live next to the app under `src/**/*.stories.tsx` and are authored with `@storybook/react-vite`. They import the
adapted React components from `@mission-platform/components/react` and mirror the titles used by the Vue Storybook
(`Components/<Category>/<Name>`) so the two catalogues line up.

## Deployment

`pnpm deploy` publishes to Chromatic. Replace the placeholder `--project-token` in `package.json` (and add the
`projectId` to `chromatic.config.json`) once a dedicated Chromatic project has been created for the React Storybook.

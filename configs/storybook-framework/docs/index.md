# @mission-platform/storybook-framework

Environment-selected Storybook framework preset for Mission Platform.

## Install and use

Add the package to the Storybook workspace and reference it from
`.storybook/main.ts` or the corresponding Storybook configuration. Select the
framework through the workspace's supported conditions; do not hard-code a
framework adapter in shared component packages.

## Contribute

Run `pnpm --filter @mission-platform/storybook-framework lint` and the
Storybook build checks. Keep this package focused on framework selection and
shared Storybook defaults; component stories belong in `apps/storybook`.
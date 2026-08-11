---
'@mission-platform/barcode': major
'@mission-platform/breakpoints': major
'@mission-platform/components': major
'@mission-platform/d3': major
'@mission-platform/forms': major
'@mission-platform/layouts': major
'@mission-platform/map': major
'@mission-platform/observers': major
'@mission-platform/three': major
'@mission-platform/content': major
---

move the Storyblok projection under the `./cms/storyblok/*` export namespace

Storyblok output is now produced by `@mission-platform/forge-cms-storyblok`
through the shared CMS driver, which namespaces every content-platform build
under `dist/cms/<cms>/<framework>/`.

BREAKING CHANGE: the `./storyblok/react`, `./storyblok/vue`, and
`./storyblok/components.json` subpath exports are now `./cms/storyblok/react`,
`./cms/storyblok/vue`, and `./cms/storyblok/components.json`, resolving to
`dist/cms/storyblok/**` instead of `dist/storyblok/**`. Update imports
accordingly; the module contents are unchanged.

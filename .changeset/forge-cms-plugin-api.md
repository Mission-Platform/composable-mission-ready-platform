---
'@mission-platform/forge-cms-plugin-api': minor
'@mission-platform/forge-cms-storyblok': minor
'@mission-platform/forge-cms-astro': minor
'@mission-platform/forge-cms-ghost': minor
'@mission-platform/forge-cms-jekyll': minor
'@mission-platform/forge-cms-webflow': minor
---

add the forge CMS plugin API and five content-platform targets

`@mission-platform/forge-cms-plugin-api` owns the platform-neutral content model
(`analyzeContentComponent`, `ContentComponent`, `ContentField`), the
`CmsOutputPlugin` contract, the generic discover → IR → content model → emit →
write driver, island co-generation, and the `defineTsdownForgeCms(All)` build
helpers.

A CMS target composes an existing `FrameworkOutputPlugin` rather than replacing
one, so `storyblok × vue`, `astro × solid`, and `ghost × web-components` are
configuration rather than new code. The five targets are `forge-cms-storyblok`
(component objects, blok wrappers, `components.json`), `forge-cms-astro` (static
`.astro` plus `client:load` framework islands), `forge-cms-ghost` (Handlebars
partials plus a `config.custom` fragment), `forge-cms-jekyll` (Liquid includes
plus `_data` schema and a `_config.yml` fragment), and `forge-cms-webflow`
(`declareComponent` code components plus a `webflow.json` library fragment).

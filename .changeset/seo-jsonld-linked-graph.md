---
'@mission-platform/seo': minor
---

link json-ld structures together via stable `@id` references

`webSite`, `organization`, `localBusiness` and `webPage` now emit deterministic
`@id`s derived from their URLs (`#website`, `#organization`, `#webpage`), and
cross-entity links (`WebSite.publisher`, `WebPage.isPartOf`,
`Article.publisher` and `Article.mainEntityOfPage`) are now `{ "@id": ... }`
references rather than inlined duplicates. This lets search engines merge the
emitted JSON-LD nodes into a single linked graph, improving how `WebSite`,
`Organization`, `WebPage` and `Article` entities relate to one another in rich
results.

New exports: `webSiteId`, `organizationId`, `webPageId` helpers for building
the same `@id`s from outside the package (e.g. to reference an existing site
node from a custom builder).

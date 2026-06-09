---
'@mission-platform/seo': minor
---

support multiple locales in json-ld structured data

`WebSiteInput.inLanguage` and `WebPageInput.inLanguage` now accept either a
single BCP-47 tag (existing behaviour) or an array, so a single site-wide
`WebSite` node can advertise every locale a multilingual property is
available in.

`WebPageInput` also gains two new optional fields:

- `workTranslation` — list of other-locale `WebPage` variants of this page,
  emitted as Schema.org `workTranslation` references (`@type: WebPage` with a
  stable `@id` via the existing `webPageId` helper).
- `translationOfWork` — pointer at the source-of-truth variant if this page
  is itself a translation, emitted as Schema.org `translationOfWork`.

Together these let prerendered multilingual sites emit a fully cross-linked
JSON-LD graph so search engines can recognise locale variants as translations
of the same logical work.

---
'@mission-platform/forms': minor
'@mission-platform/components': major
---

extract the form builder and schema form into a new `@mission-platform/forms` package

Adds the write-once `@mission-platform/forms` package containing
`BaseFormBuilder` (public `FormBuilder`) and `BaseSchemaForm` (public
`SchemaForm`), authored once in the neutral `@mission-platform/jsx` dialect and
compiled to both Vue 3 (`./vue`) and React (`./react`). The package depends on
**both** `@mission-platform/components` (field widgets + `BaseDrawer`) and
`@mission-platform/layouts` (`BaseVerticalLayout`), which is why it lives in its
own package rather than in `@mission-platform/components` — keeping the
dependency graph acyclic. Co-located `JSX Components/Forms/<Name>` stories and
cross-framework specs are included.

**BREAKING (`@mission-platform/components`):** `BaseFormBuilder` / `FormBuilder`
and `BaseSchemaForm` / `SchemaForm` are no longer exported from
`@mission-platform/components` — import them from `@mission-platform/forms/vue`
(or `/react`) instead.

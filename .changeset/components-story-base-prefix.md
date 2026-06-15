---
'@mission-platform/components': patch
---

docs(components): prefix all Storybook story titles with `Base`

Align every component's Storybook `title` leaf segment with its `Base`-prefixed component name (for example `Components/Forms/RangeInput` is now `Components/Forms/BaseRangeInput`). Titles that already carried the `Base` prefix, as well as the `map` and `icons` package stories (whose components are not `Base`-prefixed), are unchanged.

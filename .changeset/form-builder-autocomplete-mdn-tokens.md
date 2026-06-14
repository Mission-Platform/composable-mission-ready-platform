---
'@mission-platform/components': minor
---

type `autocomplete` with the standard MDN tokens and expose autocapitalize presets

The `autocomplete` attribute is now typed against the standard
[MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete)
token list rather than a free-form string. A new `Autocomplete` /
`AutocompleteToken` union and a grouped `AUTOCOMPLETE_OPTIONS` list are exported
from the package; `BaseInput`, `BaseTextarea`, the `BaseSchemaForm` `ui`
options, and `BaseFormBuilder`'s `BuilderField` all adopt the union (any other
string is still accepted for the rarer compound / section-prefixed forms).

In the `BaseFormBuilder` inspector, the Autocomplete field is now a grouped
dropdown of those tokens, and the Autocapitalize dropdown offers the full set of
HTML presets (`none`, `off`, `on`, `sentences`, `words`, `characters`).

---
'@mission-platform/components': patch
---

enable Volar `strictTemplates` and fix the template type errors it surfaces

- Turn on `vueCompilerOptions.strictTemplates` for the component library so `v-model`, prop, and attribute bindings are fully type-checked at build time.
- Let the wrapper components forward standard host-element attributes by intersecting their props with the matching Vue attribute types (`BaseTypography` → `AnchorHTMLAttributes`, `BaseButton` → `ButtonHTMLAttributes`, `BaseStack` → `LabelHTMLAttributes`, `BaseInput` → `AriaAttributes`, `BaseFormBuilderDropzone` → `HTMLAttributes`, `BaseToast` → `HTMLAttributes`), so passing `role`, `id`, `href`, `for`, `aria-*`, and similar attributes is type-safe.
- Set dynamic `data-*` attributes via `v-bind` object syntax (`BaseTab`, `BasePopover`, scheduler time grid) and render the toast container's `role="region"` on a wrapping element instead of `TransitionGroup`.
- Drop redundant icon `aria-*` attributes (icons manage their own labelling) and bridge the scheduler event dialog's strongly-typed form fields to the broader component `v-model` types via writable computed proxies.

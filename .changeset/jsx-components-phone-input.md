---
'@mission-platform/components': minor
---

Add the write-once `BasePhoneInput` (`Components/Forms`) — an international
phone-number field authored once in neutral JSX and compiled straight to both
React and Vue. A country `<select>` (flag + name + dial code) sits beside a
`type="tel"` field that is formatted as-you-type and validated with
**`google-libphonenumber`** through a co-located, framework-agnostic `phone.ts`
helper (no neutral/JSX imports, so the dependency travels verbatim onto both
framework builds); the canonical **E.164** form + validity are derived each
render and a hidden `name` input submits the E.164 value. The national text is
controlled via `modelValue`/`onUpdateModelValue` and the region via
`country`/`onUpdateCountry`, with an `onChange` reporting
`{ national, e164, valid, country }`. Ships the per-folder
`.tsx`/`phone.ts`/`.module.scss`/`.stories.tsx`/cross-framework
`.spec.ts`/`index.ts` and a `JSX Components/Forms/BasePhoneInput` story.

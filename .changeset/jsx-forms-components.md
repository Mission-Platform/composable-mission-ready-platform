---
'@mission-platform/components': minor
---

Migrate the `Components/Forms` group (plus the `Components/Communication`
`BaseChatBubble`) to write-once neutral JSX, compiling straight to both React and
Vue: `BaseCheckbox`, `BaseRadio`, `BaseSwitch`, `BaseInput`, `BaseTextarea`,
`BaseNumberStepper`, `BaseSlider`, `BaseOtpInput`, `BaseRating`,
`BaseSearchInput`, `BaseFieldSet`, `BaseFileInput`, and `BaseChatBubble`. Each
ships its per-folder `.tsx`/`.module.scss`/`.stories.tsx`/cross-framework
`.spec.ts`/`index.ts` with `JSX Components/<Category>/<Name>` stories. Vue-only
features the neutral dialect does not model are substituted with documented
equivalents: the `useId` composable → a shared `nextFieldId` `useRef` helper
(`field-id.ts`), `v-model`/emits → the controlled `modelValue` +
`onUpdateModelValue`/`onChange`/… callback props, named slots → `MpChild` content
props, `@mission-platform/icons` → text glyphs, `useI18n` labels → plain string
props, `BaseSlider`'s pointer-drag thumb → a native `<input type="range">`, and
`BaseOtpInput`'s Vue template ref-array → a single container ref +
`querySelectorAll`.

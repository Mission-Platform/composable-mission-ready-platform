---
'@mission-platform/components': minor
---

`BaseSchemaForm` now renders telephone fields (`{ format: 'tel' }`) with the
dedicated `BasePhoneInput` instead of `BaseInput`, so schema-driven phone fields
get a country picker, as-you-type formatting, and `google-libphonenumber`
validation for free. The `'tel'` widget is removed from the form's text-input
group and routed to a dedicated `BasePhoneInput` control.

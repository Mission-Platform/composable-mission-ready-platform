---
'@mission-platform/components': major
---

Drop `'tel'` from `BaseInput`'s `InputType` union. Telephone numbers should use
the dedicated `BasePhoneInput` (`Components/Forms`) instead, which provides a
country picker, as-you-type formatting, and `google-libphonenumber` validation.
The `BaseInput` story's `type` control and the `BaseFieldSet` example are
updated to match (the field-set "Phone" field now composes `BasePhoneInput`).

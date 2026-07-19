---
'@mission-platform/components': patch
'@mission-platform/layouts': patch
'@mission-platform/forms': patch
---

Drop the third-party `google-libphonenumber` dependency and power `BasePhoneInput`
with the platform's own `@mission-platform/phone-number` (AssemblyScript/WebAssembly)
package instead. The co-located `phone.ts` helper now parses, formats
(national/E.164), validates per region, lists supported regions, provides example
numbers and formats as-you-type through the synchronous `PhoneNumberUtil` instance,
so behaviour is unchanged while the external dependency is removed.

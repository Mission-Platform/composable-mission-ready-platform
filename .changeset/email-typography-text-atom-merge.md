---
'@mission-platform/email-components': major
---

merge the email text atoms into a single `EmailTypography` atom

`EmailTypography` mirrors the web `ForgeTypography` vocabulary: `as` selects the
rendered element (`p` by default, `a` when `href` is set), `variant` selects the
type scale (the matching heading scale when `as` is `h1`–`h6`, otherwise
`body-md`), and `color`, `align`, `target`, and `underline` tune the literal
inline declarations. Links keep the `validateUrl` guard and the `children ?? href`
label fallback, and now emit `rel="noopener noreferrer"` for `target="_blank"`.

BREAKING CHANGE: `EmailHeading`, `EmailText`, and `EmailLink` (with
`EmailHeadingProperties`, `EmailTextProperties`, and `EmailLinkProperties`) are
removed in favour of `EmailTypography` and `EmailTypographyProperties`. Replace
`EmailText({ … })` with `EmailTypography({ … })`, `EmailHeading({ level: 3 })`
with `EmailTypography({ as: 'h3' })`, and `EmailLink({ href })` with
`EmailTypography({ href })`.

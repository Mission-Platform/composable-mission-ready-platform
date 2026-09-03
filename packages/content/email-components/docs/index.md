# @mission-platform/email-components

`@mission-platform/email-components` contains typed, framework-neutral Forge JSX components for generating email-safe trees. Use `@mission-platform/email-renderer` to serialize those trees on the server; no Vue, React, Svelte, Solid, Web Components runtime, browser DOM, or JavaScript is required by the email path.

## Usage

```ts
import { EmailButton, EmailContainer, EmailDocument, EmailTypography } from '@mission-platform/email-components';
import { renderEmail } from '@mission-platform/email-renderer';

const email = EmailDocument({
  previewText: 'A short inbox preview',
  children: EmailContainer({
    children: EmailTypography({ children: 'Hello from Mission Platform.' }),
  }),
});

const html = renderEmail(email, { title: 'Welcome', responsive: true });
```

## Browser previews

The components return the same framework-neutral Forge tree used by the
standard browser pipeline. For a preview, pass that tree to the optional
adapter entry point required by the host framework:

```ts
import { renderToEmailVue } from '@mission-platform/email-renderer/vue';

const previewNode = renderToEmailVue(email);
```

React, Svelte, Solid, and Web Components use their corresponding renderer
subpath, or all five can be imported from
`@mission-platform/email-renderer/adapters`. The browser preview path and
`renderEmail` server path consume the same component tree; only the latter
adds the complete email document wrapper.

## Components

- Atoms: `EmailTypography`, `EmailButton`, `EmailImage`, `EmailDivider`, `EmailSpacer`.
- Molecules: `EmailRow`, `EmailColumn`, `EmailCard`, `EmailList`, `EmailSocialLinks`.
- Organisms: `EmailPreheader`, `EmailHeader`, `EmailFooter`.
- Templates: `EmailDocument`, `EmailContainer`, `EmailSection`.

`EmailTypography` is the single text atom, mirroring the web `ForgeTypography` vocabulary: `as` selects the rendered element (`p` by default, `a` when `href` is set), `variant` selects the type scale (the matching heading scale when `as` is `h1`–`h6`, otherwise `body-md`), and `color`, `align`, `target`, and `underline` tune the inline declarations.

```ts
EmailTypography({ as: 'h1', children: 'Welcome' });
EmailTypography({ children: 'Body copy' });
EmailTypography({ href: 'https://example.com', target: '_blank', children: 'Read more' });
```

All layout is based on `table`, `tbody`, `tr`, and `td`. Buttons are ordinary links inside tables, images require non-empty `alt` text, URLs are validated, and styles are resolved to literal declarations from `@mission-platform/tokens`.

## Compatibility policy

The baseline follows the [Can I Email feature catalogue](https://www.caniemail.com/features), reviewed on `2026-08-08`. The implementation relies on [HTML tables](https://www.caniemail.com/features/html-tables), [inline styles](https://www.caniemail.com/features/css-inline-styles), [max-width](https://www.caniemail.com/features/css-max-width), and optional [media queries](https://www.caniemail.com/features/css-at-media). The static output does not rely on flexbox, grid, CSS custom properties, logical properties, scripts, event handlers, or framework hydration markers.

Responsive CSS is progressive enhancement only: the inline table layout remains usable when the `<style>` block is removed or ignored. Use `assertCompatibleEmailHtml` in application tests when adding custom nodes.

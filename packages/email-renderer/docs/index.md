# @mission-platform/email-renderer

`@mission-platform/email-renderer` owns the framework-neutral rendering boundary for Mission Platform email trees. Its root entry is safe for server-side email generation; browser adapters are isolated behind explicit subpaths.

## Server rendering and Markdown

```ts
import { renderEmail, renderMarkdown } from '@mission-platform/email-renderer';

const document = renderMarkdown('# Welcome\n\nRead **more** at [Mission Platform](https://example.com).');
const html = renderEmail(document.node, { title: 'Welcome', previewText: 'A short preview' });
```

Markdown is converted into the shared Forge tree, so links, images, text, and HTML are escaped or validated before serialization. The output has deterministic attribute/style ordering and rejects script URLs, event attributes, CSS variables, flex/grid values, and framework markers.

## Browser adapters

Use only the adapter subpath required by a browser preview or application:

- `@mission-platform/email-renderer/vue` → `renderToEmailVue`, `toEmailVueComponent`.
- `@mission-platform/email-renderer/react` → `renderToEmailReact`, `toEmailReactComponent`.
- `@mission-platform/email-renderer/svelte` → `renderToEmailSvelte` for Svelte 5 `{@render ...}`.
- `@mission-platform/email-renderer/solid` → `renderToEmailSolid`, `toEmailSolidComponent`.
- `@mission-platform/email-renderer/web-components` → `renderToEmailWebComponent`.

For a single optional import that exposes all five browser adapters, use
`@mission-platform/email-renderer/adapters`. This entry is separate from the
root entry so server-only email generation never loads a framework runtime.

These optional entry points reuse the same Forge tree. They are not imported by the root email serializer and are not needed in server-only email deployments.

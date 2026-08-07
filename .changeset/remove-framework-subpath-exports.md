---
'@mission-platform/barcode': major
'@mission-platform/breakpoints': major
'@mission-platform/code-scanner': major
'@mission-platform/components': major
'@mission-platform/d3': major
'@mission-platform/forms': major
'@mission-platform/i18n': major
'@mission-platform/icons': major
'@mission-platform/layouts': major
'@mission-platform/map': major
'@mission-platform/matrix-code': major
'@mission-platform/observers': major
'@mission-platform/qr-code': major
'@mission-platform/router': major
'@mission-platform/rxjs': major
'@mission-platform/speech-audio': major
'@mission-platform/three': major
'@mission-platform/wysiwyg': major
'@mission-platform/vite-plugin-forge': major
'@mission-platform/vite-config': minor
---

remove the per-framework subpath exports in favour of `mp:<framework>` conditions

The legacy `./vue`, `./react`, `./solid`, `./svelte` and `./web-components`
subpath exports have been deleted from every framework-shipping package. The
framework build is now selected **only** by the `mp:<framework>` custom export
condition on the bare `.` entry, so there is exactly one specifier per package
and it is impossible for an app to mix two framework builds by importing
inconsistently.

**Breaking.** Replace every framework subpath with the bare specifier and select
the framework once, at the app level:

```diff
-import { ForgeButton } from '@mission-platform/components/vue';
-import { ForgeIconChevron } from '@mission-platform/icons/vue';
+import { ForgeButton } from '@mission-platform/components';
+import { ForgeIconChevron } from '@mission-platform/icons';
```

```ts
// vite.config.ts
export default defineFrameworkAppConfig({ framework: 'vue' });
```

```jsonc
// tsconfig.app.json
{ "compilerOptions": { "customConditions": ["mp:vue"] } }
```

`@mission-platform/components` keeps its per-component deep imports, but the
wildcard is now condition-aware and carries no framework segment:

```diff
-import { ForgeBadge } from '@mission-platform/components/react/atoms/forge-badge/forge-badge';
+import { ForgeBadge } from '@mission-platform/components/atoms/forge-badge/forge-badge';
```

The `@mission-platform/forge` adapter subpaths (`/react`, `/vue`, `/solid`,
`/web-components`, `/runtime`, `/jsx-globals`), the Storyblok wrappers
(`/storyblok/react`, `/storyblok/vue`), `@mission-platform/router/redwood`,
`@mission-platform/breakpoints/core` and every `…/styles` entry are unaffected.

`@mission-platform/vite-plugin-forge` now emits bare `@mission-platform/*`
specifiers into the generated per-framework sources (previously it rewrote them
to the matching subpath), and passes the framework's `customConditions` to
every declaration-emit path so the generated `.d.ts` files resolve sibling
packages against the same build the bundler picks.

`@mission-platform/vite-config` gains `framework` and `frameworkInclude` options
on `defineVitestConfig`, so a package can run its compiled-build specs under a
framework condition while leaving cross-framework parity specs resolving
neutrally.

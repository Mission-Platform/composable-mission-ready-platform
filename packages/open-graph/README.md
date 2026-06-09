# @mission-platform/open-graph

Generate and dynamically manage [Open Graph](https://ogp.me) (and Twitter Card)
`<meta>` tags from Vue 3 components.

## Install

```bash
pnpm add @mission-platform/open-graph
```

## Usage

### Composable

```ts
import { ref } from 'vue';
import { useOpenGraph, type OpenGraphMetadata } from '@mission-platform/open-graph';

const meta = ref<OpenGraphMetadata>({
  title: 'My Care Notes',
  description: 'Take notes with spell and grammar checking.',
  url: 'https://mycarenotes.example/',
  siteName: 'Mission Platform',
  locale: 'en_GB',
  images: [{ url: 'https://mycarenotes.example/og.png', width: 1200, height: 630, alt: 'Hero' }],
  twitter: { site: '@example' },
});

useOpenGraph(meta, { updateDocumentTitle: true });
```

The composable:

- accepts a ref, getter, or plain object;
- updates existing `<meta>` tags in place (no duplicates);
- removes tags it previously inserted when they disappear from the metadata;
- never touches unrelated meta tags authored by the host HTML (e.g. `viewport`);
- can mirror `metadata.title` onto `document.title`;
- cleans up its tags when the surrounding effect scope is disposed.

### Imperative helpers

```ts
import { applyMetaTags, buildMetaTags, clearMetaTags } from '@mission-platform/open-graph';

applyMetaTags(buildMetaTags({ title: 'Hello', description: 'World' }));
// ... later
clearMetaTags();
```

## API

- `useOpenGraph(metadata, options?)` — Vue composable.
- `buildMetaTags(metadata)` — Pure function returning a flat tag descriptor list.
- `applyMetaTags(tags, head?)` — Idempotently sync tags into a `<head>`.
- `clearMetaTags(head?)` — Remove every tag this package owns.
- Types: `OpenGraphMetadata`, `OpenGraphImage`, `OpenGraphType`, `TwitterMetadata`,
  `TwitterCard`, `MetaTag`, `UseOpenGraphOptions`.

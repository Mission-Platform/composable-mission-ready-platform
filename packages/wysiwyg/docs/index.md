# @mission-platform/wysiwyg

A framework-agnostic **WYSIWYG rich-text editor**, authored once in the neutral
JSX dialect (`@mission-platform/forge`) and shipped as both **Vue 3** and **React**
components via `@mission-platform/vite-plugin-forge`.

## Import

```ts
import { WysiwygEditor } from '@mission-platform/wysiwyg/vue'; // Vue 3
import { WysiwygEditor } from '@mission-platform/wysiwyg/react'; // React
```

## Usage (Vue)

```vue
<script setup lang="ts">
  import { ref } from 'vue';
  import { WysiwygEditor } from '@mission-platform/wysiwyg/vue';

  const html = ref('<p>Hello <strong>world</strong></p>');
</script>

<template>
  <WysiwygEditor
    v-model="html"
    placeholder="Write something…"
    spell-check
  />
</template>
```

## Usage (React)

```tsx
import { useState } from 'react';
import { WysiwygEditor } from '@mission-platform/wysiwyg/react';

export function Editor() {
  const [html, setHtml] = useState('<p>Hello <strong>world</strong></p>');
  return (
    <WysiwygEditor
      modelValue={html}
      onUpdateModelValue={setHtml}
      placeholder="Write something…"
      spellCheck
    />
  );
}
```

## Features

- Native `contenteditable` editing surface driven through a guarded,
  framework-neutral command layer (`document.execCommand`) — no heavy editor
  engine dependency.
- Formatting toolbar (bold/italic/underline/strikethrough, headings, quote and
  code block, lists, alignment, link, image, undo/redo) built from
  `@mission-platform/icons` glyphs and `@mission-platform/components`' `BaseButton`.
- Optional **HTML source view** backed by `BaseMonacoEditor`, which — with
  `spellCheck` — brings Hunspell spelling + Harper grammar checking to the markup.
- Live word/character counter derived from an **RxJS** change stream (debounced
  and de-duplicated).
- Fully overridable labels (English defaults) for i18n; SSR/SSG-safe.

See `llms.txt` for the full prop reference.

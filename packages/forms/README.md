# `@mission-platform/forms`

Write-once form orchestration components (`ForgeSchemaForm`, `ForgeFormBuilder`) authored with `@mission-platform/forge`
and shipped as native Vue 3, React, Solid and Web Components behind a single bare
`@mission-platform/forms` entry point.

## Features

- **Data-Driven Schema Forms**: `ForgeSchemaForm` renders single-step forms or multi-step form wizards directly from JSON
  Schema definitions.
- **Visual Form Builder**: `ForgeFormBuilder` provides a visual palette, canvas editor, and inspector for creating and
  editing form schemas.
- **Ajv Validation Engine**: Powered by `@mission-platform/forms-core` for consistent client-side validation.
- **Cross-Framework Parity**: Authored once in neutral JSX, compiled to native Vue and React targets.

## Installation

```bash
pnpm add @mission-platform/forms @mission-platform/forms-core
```

## Usage

Choose the framework **once** — `resolve.conditions` via `defineFrameworkAppConfig` /
`frameworkResolveConditions` from `@mission-platform/vite-config`, and `customConditions` via the
`@mission-platform/typescript-config/framework-<name>` presets — and the `mp:<framework>` export condition
resolves the bare specifier to the matching native build.

### Vue 3 (`mp:vue`)

```vue
<script setup lang="ts">
  import { ForgeSchemaForm, ForgeFormBuilder } from '@mission-platform/forms';
  import { ref } from 'vue';

  const schema = {
    title: 'Contact Form',
    type: 'object',
    properties: {
      email: { type: 'string', title: 'Email Address' },
      message: { type: 'string', title: 'Message' },
    },
    required: ['email'],
  };

  const formData = ref({});

  function onChange(values: Record<string, unknown>) {
    formData.value = values;
  }
</script>

<template>
  <ForgeSchemaForm
    :schema="schema"
    @change="onChange"
  />
</template>
```

### React (`mp:react`)

```tsx
import { ForgeSchemaForm, ForgeFormBuilder } from '@mission-platform/forms';
import { useState } from 'react';

export function ContactForm() {
  const [formData, setFormData] = useState({});

  const schema = {
    title: 'Contact Form',
    type: 'object',
    properties: {
      email: { type: 'string', title: 'Email Address' },
      message: { type: 'string', title: 'Message' },
    },
    required: ['email'],
  };

  return (
    <ForgeSchemaForm
      schema={schema}
      onChange={setFormData}
    />
  );
}
```

## Exports

- `@mission-platform/forms`: the only component entry point (`ForgeSchemaForm`, `ForgeFormBuilder`).
  Resolves to the compiled Vue 3, React, Solid, or web-component build for the active
  `mp:<framework>` condition, and to the neutral components when none is set.
- `@mission-platform/forms/styles`: Shared accessibility stylesheet (`src/styles/a11y.scss`).

For details on schema structure and form builder layout, see [docs/index.md](docs/index.md).

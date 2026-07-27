# `@mission-platform/forms`

Write-once form orchestration components (`BaseSchemaForm`, `BaseFormBuilder`) authored with `@mission-platform/jsx` and shipped as native Vue 3 (`@mission-platform/forms/vue`) and React (`@mission-platform/forms/react`) components.

## Features

- **Data-Driven Schema Forms**: `BaseSchemaForm` renders single-step forms or multi-step form wizards directly from JSON Schema definitions.
- **Visual Form Builder**: `BaseFormBuilder` provides a visual palette, canvas editor, and inspector for creating and editing form schemas.
- **Ajv Validation Engine**: Powered by `@mission-platform/forms-core` for consistent client-side validation.
- **Cross-Framework Parity**: Authored once in neutral JSX, compiled to native Vue and React targets.

## Installation

```bash
pnpm add @mission-platform/forms @mission-platform/forms-core
```

## Usage

### Vue 3 (`@mission-platform/forms/vue`)

```vue
<script setup lang="ts">
  import { BaseSchemaForm, BaseFormBuilder } from '@mission-platform/forms/vue';
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
  <BaseSchemaForm
    :schema="schema"
    @change="onChange"
  />
</template>
```

### React (`@mission-platform/forms/react`)

```tsx
import { BaseSchemaForm, BaseFormBuilder } from '@mission-platform/forms/react';
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
    <BaseSchemaForm
      schema={schema}
      onChange={setFormData}
    />
  );
}
```

## Exports & Subpaths

- `@mission-platform/forms`: Neutral component exports (`BaseSchemaForm`, `BaseFormBuilder`).
- `@mission-platform/forms/vue`: Compiled Vue 3 components.
- `@mission-platform/forms/react`: Compiled React components.
- `@mission-platform/forms/styles`: Shared accessibility stylesheet (`src/styles/a11y.scss`).

For details on schema structure and form builder layout, see [docs/index.md](docs/index.md).

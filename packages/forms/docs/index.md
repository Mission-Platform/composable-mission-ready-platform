# @mission-platform/forms

`@mission-platform/forms` provides high-level form orchestration components that allow the Mission Platform to render
complex forms and wizards entirely from JSON Schema definitions.

Like other shared packages, it follows a "write once" approach, authoring components in neutral JSX and compiling them
into native Vue 3 and React components.

## Core Components

### `ForgeSchemaForm`

The primary component for rendering data-driven forms. It takes a JSON Schema definition and automatically generates the
corresponding UI widgets and validation logic.

#### Key Features:

- **Schema-Driven**: Entirely configured via JSON Schema. A single object renders a one-step form; an array of objects
  creates a multi-step wizard.
- **Consistent Validation**: Uses `@mission-platform/forms-core` (Ajv) to ensure that Vue and React apps validate the
  same data identically.
- **Conditional Visibility**: Supports `ui.visibleWhen` to show or hide fields dynamically based on other input values.
- **Nested Structures**: Handles nested field sets for complex data models.

#### Usage:

**Vue:**

```vue
<script setup lang="ts">
  import { SchemaForm } from '@mission-platform/forms/vue';
  const mySchema = {/* JSON Schema */};
</script>

<template>
  <SchemaForm
    :schema="mySchema"
    @change="onValuesChange"
  />
</template>
```

**React:**

```tsx
import { SchemaForm } from '@mission-platform/forms/react';

const MyComponent = () => (
  <SchemaForm
    schema={mySchema}
    onChange={(values) => console.log(values)}
  />
);
```

---

### `ForgeFormBuilder`

A visual authoring tool that allows non-developers to create form schemas without writing JSON manually.

#### Key Features:

- **Visual Canvas**: Drag-and-drop style editor for arranging fields and defining their properties.
- **Wizard Configuration**: A dedicated "Steps" tab for managing multi-step flow in wizards.
- **Live Preview**: Real-time rendering of the form as it is being built.
- **Schema Export**: Emits a `SchemaFormDefinition` that can be saved to a database or used directly by
  `ForgeSchemaForm`.

#### Layout:

The builder is structured as a three-column layout using `ForgeVerticalLayout`:

1. **Field Palette**: A list of available widgets (inputs, selects, dates, etc.) to add to the form.
2. **Editor Canvas**: The central area where fields are configured and organized.
3. **Inspector**: Detailed property editor for the currently selected field.

## Architecture & Dependencies

To avoid dependency cycles while maintaining framework parity:

- `@mission-platform/forms` depends on `@mission-platform/components` (for individual input widgets like `ForgeInput`,
  `ForgeCheckbox`) and `@mission-platform/layouts`.
- It delegates all heavy lifting—validation, schema parsing, and conditional logic—to the framework-agnostic
  `@mission-platform/forms-core`.

## Styles

The package provides shared accessibility helpers via:

```ts
import '@mission-platform/forms/styles';
```

Each component also utilizes its own co-located CSS Modules for specific styling.

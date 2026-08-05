# `@mission-platform/forms-core`

Framework-agnostic forms core shared across Vue and React implementations in Mission Platform. It provides JSON Schema
processing, Ajv-based validation, conditional field visibility evaluation, and form builder model conversions.

## Features

- **Framework Agnostic**: Zero dependencies on Vue or React. Pure TypeScript core logic.
- **Ajv Validation Engine**: High-performance JSON Schema validation with custom error formatting and hidden field
  exclusion.
- **Conditional Visibility**: Evaluates logical combinators (`allOf`, `anyOf`, `oneOf`) and field-level visibility
  (`visibleWhen`).
- **Form Builder Conversion**: Bi-directional conversions between visual field trees and JSON Schema definitions
  (`fieldsToSchema`, `schemaToFields`).

## Installation

```bash
pnpm add @mission-platform/forms-core
```

## Usage

### Validation & Defaults

```ts
import { createFormValidator, jsonSchemaDefaults, jsonSchemaToFields } from '@mission-platform/forms-core';

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 2 },
    age: { type: 'number', minimum: 18, default: 21 },
  },
  required: ['name'],
};

// Generate default initial values
const defaults = jsonSchemaDefaults(schema); // { age: 21, name: '' }

// Convert schema to renderable field descriptors
const fields = jsonSchemaToFields(schema);

// Validate form values using Ajv
const validator = createFormValidator(schema);
const errors = validator({ name: 'A', age: 15 });
// Returns error map keyed by field path
```

### Conditional Visibility Evaluation

```ts
import { evaluateCondition, isFieldVisible } from '@mission-platform/forms-core';

const values = { userType: 'business', taxId: '12345' };

const condition = {
  field: 'userType',
  operator: 'equals',
  value: 'business',
};

const isVisible = evaluateCondition(condition, values); // true
```

## Key Exports

- **Types**: `SchemaFormDefinition`, `FormFieldSchema`, `FieldUiOptions`, `FormValues`, `FormErrors`
- **Validation**: `createFormValidator`, `jsonSchemaDefaults`, `jsonSchemaToFields`
- **Conditions**: `evaluateCondition`, `isFieldVisible`
- **Builder**: `fieldsToSchema`, `schemaToFields`, `fieldsToWizardSchema`, `DEFAULT_FIELD_TYPES`

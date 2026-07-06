# @mission-platform/forms-core

`@mission-platform/forms-core` is a framework-agnostic core library providing the business logic, type definitions, and validation engine for forms across the Mission Platform. By centralizing this logic in a pure TypeScript package, both Vue and React implementations maintain perfect parity by construction.

## Overview

The package focuses on three main areas:
1. **JSON Schema Definition**: Types and structures for defining form schemas.
2. **Conditional Visibility**: Logic to determine if a field should be rendered based on other form values.
3. **Validation & Defaults**: Integration with Ajv for JSON Schema validation and automatic generation of default values.

## Key Modules

### 1. Form Definition & Types (`src/types.ts`)
Defines the structural contract for forms:
- `SchemaFormDefinition`: The root definition. A single object represents a one-step form, while an array of objects defines a multi-step wizard.
- `FormFieldSchema`: The resolved shape of a field ready for rendering.
- `FieldUiOptions`: Extensions to the JSON Schema to provide presentation hints (the `ui` namespace).
- `FormValues` & `FormErrors`: Type maps for current form data and their corresponding validation errors.

### 2. Conditional Visibility (`src/conditions.ts`)
Provides the engine to evaluate if a field should be visible based on current values:
- `evaluateCondition(condition, values)`: Evaluates a `FieldCondition` using JSON Schema-like combinators:
    - `allOf`: AND logic (all conditions must be true).
    - `anyOf`: OR logic (at least one condition must be true).
    - `oneOf`: XOR logic (exactly one condition must be true).
- `isFieldVisible(field, values)`: A helper to determine if a specific field's `visibleWhen` property is satisfied.

### 3. JSON Schema Integration (`src/json-schema.ts`)
Handles the translation between raw JSON Schemas and renderable form fields:
- `jsonSchemaToFields(schema)`: Recursively converts a JSON Schema into an ordered list of `FormFieldSchema`.
- `jsonSchemaDefaults(schema)`: Generates initial values based on the schema's `default` keywords or type-appropriate blanks.
- `createFormValidator(schema, translate?)`: Returns a `FormValidator` that uses Ajv to validate form values. It automatically excludes hidden fields from validation and supports custom error messages.

### 4. Form Builder Logic (`src/builder-types.ts`, `src/form-schema.ts`)
Supports the visual Form Builder tool:
- **Conversion**: Functions like `fieldsToSchema` and `schemaToFields` allow the builder to move between its working representation (a field tree) and the final `SchemaFormDefinition`.
- **Field Palette**: Provides `DEFAULT_FIELD_TYPES` which defines the available widgets in the builder's palette.

## Dependency Model

This package is intentionally lean and framework-agnostic:
- **No Frameworks**: No dependencies on Vue or React.
- **Key Dependencies**: 
    - `ajv` & `ajv-formats`: For high-performance JSON Schema validation.
    - `nanoid`: For generating unique field identifiers in the builder.

## Consumers
The primary consumer is `@mission-platform/forms`, which uses this core to power:
- **BaseSchemaForm**: Renders fields and validates data using these utilities.
- **BaseFormBuilder**: Uses the conversion logic to allow users to visually author schemas.

# @mission-platform/forms-core

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/forms-core/docs/index.md: [packages/forms-core/docs/index.md](../../index.md)
> Idioma: Español (es)

`@mission-platform/forms-core` es una biblioteca central independiente del marco que proporciona lógica empresarial, definiciones de tipos y
motor de validación para formularios en Mission Platform. Al centralizar esta lógica en un paquete TypeScript puro, ambos
Las implementaciones Vue y React mantienen una paridad perfecta por construcción.

## Descripción general

El paquete se centra en tres áreas principales:

1. **Definición de esquema JSON**: tipos y estructuras para definir esquemas de formulario.
2. **Visibilidad condicional**: Lógica para determinar si un campo debe representarse en función de otros valores del formulario.
3. **Validación y valores predeterminados**: Integración con Ajv para validación del esquema JSON y generación automática de valores predeterminados
   valores.

## Módulos clave

### 1. Definición y tipos de formulario (`src/types.ts`)

Define el contrato estructural para formas:

- `SchemaFormDefinition`: La definición de raíz. Un solo objeto representa un formulario de un solo paso, mientras que una serie de objetos
  define un asistente de varios pasos.
- `FormFieldSchema`: La forma resuelta de un campo listo para renderizar.
- `FieldUiOptions`: Extensiones del esquema JSON para proporcionar sugerencias de presentación (el espacio de nombres `ui`).
- `FormValues` y `FormErrors`: mapas de tipos para los datos del formulario actual y sus correspondientes errores de validación.

### 2. Visibilidad condicional (`src/conditions.ts`)

Proporciona el motor para evaluar si un campo debe ser visible según los valores actuales:

- `evaluateCondition(condition, values)`: Evalúa un `FieldCondition` usando combinadores tipo esquema JSON:
  - `allOf`: Lógica AND (todas las condiciones deben ser verdaderas).
  - `anyOf`: Lógica OR (al menos una condición debe ser verdadera).
  - `oneOf`: Lógica XOR (exactamente una condición debe ser verdadera).
- `isFieldVisible(field, values)`: una ayuda para determinar si se cumple la propiedad `visibleWhen` de un campo específico.

### 3. Integración del esquema JSON (`src/json-schema.ts`)

Maneja la traducción entre esquemas JSON sin formato y campos de formulario renderizables:

- `jsonSchemaToFields(schema)`: Convierte recursivamente un esquema JSON en una lista ordenada de `FormFieldSchema`.
- `jsonSchemaDefaults(schema)`: genera valores iniciales basados en las palabras clave `default` del esquema o según el tipo apropiado.
  espacios en blanco.
- `createFormValidator(schema, translate?)`: Devuelve un `FormValidator` que usa Ajv para validar los valores del formulario. eso
  excluye automáticamente los campos ocultos de la validación y admite mensajes de error personalizados.

### 4. Lógica del generador de formularios (`src/builder-types.ts`, `src/form-schema.ts`)

Admite la herramienta visual Form Builder:

- **Conversión**: Funciones como `fieldsToSchema` y `schemaToFields` permiten al constructor moverse entre sus funciones
  representación (un árbol de campos) y el `SchemaFormDefinition` final.
- **Paleta de campo**: proporciona `DEFAULT_FIELD_TYPES` que define los widgets disponibles en la paleta del constructor.

## Modelo de dependencia

Este paquete es intencionalmente sencillo e independiente del marco:

- **Sin marcos**: no hay dependencias de Vue o React.
- **Dependencias clave**:
  - `ajv` y `ajv-formats`: para validación de esquemas JSON de alto rendimiento.
  - `nanoid`: Para generar identificadores de campo únicos en el constructor.

## Consumidores

El consumidor principal es `@mission-platform/forms`, que utiliza este núcleo para alimentar:

- **ForgeSchemaForm**: procesa campos y valida datos utilizando estas utilidades.
- **ForgeFormBuilder**: utiliza la lógica de conversión para permitir a los usuarios crear esquemas visualmente.

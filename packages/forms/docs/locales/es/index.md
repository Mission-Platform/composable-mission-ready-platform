# @mission-platform/forms

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/forms/docs/index.md: [packages/forms/docs/index.md](../../index.md)
> Idioma: Español (es)

`@mission-platform/forms` proporciona componentes de orquestación de formularios de alto nivel que permiten que Mission Platform represente
formularios complejos y asistentes completamente a partir de definiciones de esquemas JSON.

Al igual que otros paquetes compartidos, sigue un enfoque de "escribir una vez", creando componentes en JSX neutral y compilándolos.
en componentes nativos Vue 3 y React.

Todas las importaciones utilizan el especificador `@mission-platform/forms` simple. El marco se selecciona una vez para toda la aplicación a través de
la condición de exportación `mp:<framework>` - `resolve.conditions` (ver `defineFrameworkAppConfig` /
`frameworkResolveConditions` de `@mission-platform/vite-config`) y `customConditions` (a través del
`@mission-platform/typescript-config/framework-<name>` preajustes).

## Componentes principales

### `ForgeSchemaForm`

El componente principal para representar formularios basados ​​en datos. Toma una definición de esquema JSON y genera automáticamente el
widgets de interfaz de usuario correspondientes y lógica de validación.

#### Características clave:

- **Controlado por esquema**: Completamente configurado mediante esquema JSON. Un solo objeto representa una forma de un solo paso; una serie de objetos
  crea un asistente de varios pasos.
- **Validación consistente**: utiliza `@mission-platform/forms-core` (Ajv) para garantizar que las aplicaciones Vue y React validen la
  mismos datos de forma idéntica.
- **Visibilidad condicional**: admite `ui.visibleWhen` para mostrar u ocultar campos dinámicamente en función de otros valores de entrada.
- **Estructuras anidadas**: maneja conjuntos de campos anidados para modelos de datos complejos.

#### Uso:

**Vue** (`mp:vue` activo):

```vue
<script setup lang="ts">
  import { SchemaForm } from '@mission-platform/forms';
  const mySchema = {/* JSON Schema */};
</script>

<template>
  <SchemaForm
    :schema="mySchema"
    @change="onValuesChange"
  />
</template>
```

**React** (`mp:react` activo; tenga en cuenta el especificador idéntico):

```tsx
import { SchemaForm } from '@mission-platform/forms';

const MyComponent = () => (
  <SchemaForm
    schema={mySchema}
    onChange={(values) => console.log(values)}
  />
);
```

---

### `ForgeFormBuilder`

Una herramienta de creación visual que permite a los no desarrolladores crear esquemas de formulario sin escribir JSON manualmente.

#### Características clave:

- **Visual Canvas**: editor de estilos de arrastrar y soltar para organizar campos y definir sus propiedades.
- **Configuración del asistente**: una pestaña dedicada a "Pasos" para administrar el flujo de varios pasos en los asistentes.
- **Vista previa en vivo**: representación en tiempo real del formulario a medida que se crea.
- **Exportación de esquema**: Emite un `SchemaFormDefinition` que puede guardarse en una base de datos o usarse directamente por
  `ForgeSchemaForm`.

#### Disposición:

El constructor está estructurado como un diseño de tres columnas utilizando `ForgeVerticalLayout`:

1. **Paleta de campos**: una lista de widgets disponibles (entradas, selecciones, fechas, etc.) para agregar al formulario.
2. **Editor Canvas**: El área central donde se configuran y organizan los campos.
3. **Inspector**: editor de propiedades detallado para el campo seleccionado actualmente.

## Arquitectura y dependencias

Para evitar ciclos de dependencia manteniendo la paridad del marco:

- `@mission-platform/forms` depende de `@mission-platform/components` (para widgets de entrada individuales como `ForgeInput`,
  `ForgeCheckbox`) y `@mission-platform/layouts`.
- Delega todo el trabajo pesado (validación, análisis de esquemas y lógica condicional) al marco independiente.
  `@mission-platform/forms-core`.

## Estilos

El paquete proporciona ayudas de accesibilidad compartida a través de:

```ts
import '@mission-platform/forms/styles';
```

Cada componente también utiliza sus propios módulos CSS ubicados conjuntamente para un estilo específico.

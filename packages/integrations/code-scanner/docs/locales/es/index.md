# @mission-platform/code-scanner

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/integrations/code-scanner/docs/index.md: [packages/integrations/code-scanner/docs/index.md](../../index.md)
> Idioma: Español (es)

Un **escáner de código de imagen/cámara** libre de dependencias compilado a partir de un enlace estático
Forge el gráfico de Web Script en WebAssembly. Localiza y decodifica códigos QR, Datos
Matrix, Aztec, códigos de barras 1D, PDF417, GS1 DataBar y MaxiCode a partir de archivos de imagen
o transmisiones de cámara en vivo. También está disponible un perfil de módulo fuente dinámico para
implementaciones que necesitan módulos decodificadores que se puedan almacenar en caché de forma independiente.

## Descripción general de la API

### Escáner central (`@mission-platform/code-scanner`)

```ts
import { scanFile, scanImageData, scanImageDataAll } from '@mission-platform/code-scanner';

// Scan ImageData directly
const result = scanImageData(imageData);

// Scan all codes in frame
const allResults = scanImageDataAll(imageData);

// Scan a File / Blob
const resultFromFile = await scanFile(file);
```

### Componente de interfaz de usuario (`ForgeCodeScanner`)

Componente de escritura única disponible para Vue 3, React, Solid y componentes web del mismo modelo básico.
Especificador `@mission-platform/code-scanner`: la condición de exportación `mp:<framework>` activa selecciona la compilación.
Configúrelo **una vez** a través de `resolve.conditions` (consulte `defineFrameworkAppConfig` / `frameworkResolveConditions`
de `@mission-platform/vite-config`) y `customConditions` (a través del
`@mission-platform/typescript-config/framework-<name>` preajustes).

**Vue 3** (`mp:vue` activo):

```vue
<script setup lang="ts">
  import { ForgeCodeScanner } from '@mission-platform/code-scanner';
</script>

<template>
  <ForgeCodeScanner @result="(res) => console.log(res.value)" />
</template>
```

**React** (`mp:react` activo):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.value)} />;
}
```

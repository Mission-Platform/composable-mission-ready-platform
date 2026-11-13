# @mission-platform/code-scanner

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/integrations/code-scanner/docs/index.md: [packages/integrations/code-scanner/docs/index.md](../../index.md)
> Idioma: Español (es)

Un **escáner de código de imagen/cámara** libre de dependencias compilado a partir de un enlace estático
Gráfico de Flint para WebAssembly. El artefacto vinculado actualmente decodifica datos.
Lectores Matrix, Aztec compacto, 1D/RSS, PDF417 y MaxiCode a partir de archivos de imagen o
transmisiones de cámara en vivo. El gráfico QR emite de forma independiente pero permanece fuera del
artefacto combinado mientras se investiga la limitación del emisor de Forge.

## Descripción general de la API

### Escáner central (`@mission-platform/code-scanner`)

```ts
import { scanFile, scanImageData, scanImageDataAll, type ScanOptions } from '@mission-platform/code-scanner';

// Scan ImageData directly
const options: ScanOptions = { formats: ['DATA_MATRIX'], tryHarder: true };
const result = scanImageData(imageData, options);

// Scan the package's all-results entry point. The current linked reduced graph
// returns at most its first validated result until multi-symbol detection lands.
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
  <ForgeCodeScanner @result="(res) => console.log(res.text, res.format)" />
</template>
```

**React** (`mp:react` activo):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.text, result.format)} />;
}
```

# @mission-platform/code-scanner

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/integrations/code-scanner/docs/index.md: [packages/integrations/code-scanner/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Ein abhängigkeitsfreier **Bild-/Kameracode-Scanner**, kompiliert aus einer statisch verknüpften Datei
Web-Script-Diagramm in WebAssembly umwandeln. Es lokalisiert und dekodiert QR-Codes und Daten
Matrix-, Aztec-, 1D-Barcodes, PDF417, GS1 DataBar und MaxiCode aus Bilddateien
oder Live-Kamerastreams. Für ist auch ein dynamisches Quellmodulprofil verfügbar
Bereitstellungen, die unabhängig zwischenspeicherbare Decodermodule benötigen.

## API-Übersicht

### Kernscanner (`@mission-platform/code-scanner`)

```ts
import { scanFile, scanImageData, scanImageDataAll } from '@mission-platform/code-scanner';

// Scan ImageData directly
const result = scanImageData(imageData);

// Scan all codes in frame
const allResults = scanImageDataAll(imageData);

// Scan a File / Blob
const resultFromFile = await scanFile(file);
```

### UI-Komponente (`ForgeCodeScanner`)

Einmal beschreibbare Komponente verfügbar für Vue 3, React, Solid und Webkomponenten derselben Bare
`@mission-platform/code-scanner`-Bezeichner – die aktive Exportbedingung `mp:<framework>` wählt den Build aus.
Stellen Sie es **einmal** über `resolve.conditions` ein (siehe `defineFrameworkAppConfig` / `frameworkResolveConditions`
von `@mission-platform/vite-config`) und `customConditions` (über die
`@mission-platform/typescript-config/framework-<name>`-Voreinstellungen).

**Vue 3** (`mp:vue` aktiv):

```vue
<script setup lang="ts">
  import { ForgeCodeScanner } from '@mission-platform/code-scanner';
</script>

<template>
  <ForgeCodeScanner @result="(res) => console.log(res.value)" />
</template>
```

**React** (`mp:react` aktiv):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.value)} />;
}
```

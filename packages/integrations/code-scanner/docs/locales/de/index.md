# @mission-platform/code-scanner

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/integrations/code-scanner/docs/index.md: [packages/integrations/code-scanner/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Ein abhängigkeitsfreier **Bild-/Kameracode-Scanner**, der aus einer statisch verknüpften Datei kompiliert wurde
Flint-Graph zu WebAssembly. Das verknüpfte Artefakt dekodiert derzeit Daten
Matrix, kompakter Aztec, 1D/RSS-Reader, PDF417 und MaxiCode aus Bilddateien oder
Live-Kamera-Streams. Der QR-Graph sendet unabhängig, bleibt jedoch außerhalb des
kombiniertes Artefakt, während die Emitterbeschränkung von Forge untersucht wird.

## API-Übersicht

### Kernscanner (`@mission-platform/code-scanner`)

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

### UI-Komponente (`ForgeCodeScanner`)

Einmal beschreibbare Komponente verfügbar für Vue 3, React, Solid und Webkomponenten derselben Bare
`@mission-platform/code-scanner`-Bezeichner – die aktive Exportbedingung `mp:<framework>` wählt den Build aus.
Legen Sie es **einmal** über `resolve.conditions` fest (siehe `defineFrameworkAppConfig` / `frameworkResolveConditions`).
von `@mission-platform/vite-config`) und `customConditions` (über die
`@mission-platform/typescript-config/framework-<name>`-Voreinstellungen).

**Vue 3** (`mp:vue` aktiv):

```vue
<script setup lang="ts">
  import { ForgeCodeScanner } from '@mission-platform/code-scanner';
</script>

<template>
  <ForgeCodeScanner @result="(res) => console.log(res.text, res.format)" />
</template>
```

**React** (`mp:react` aktiv):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.text, result.format)} />;
}
```

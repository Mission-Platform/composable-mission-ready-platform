# @mission-platform/code-scanner

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/integrations/code-scanner/docs/index.md: [packages/integrations/code-scanner/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Uno **scanner di codici di immagini/fotocamere** privo di dipendenze compilato da un collegamento statico
Grafico Flint in WebAssembly. L'artefatto collegato attualmente decodifica i dati
Matrix, Aztec compatto, lettori 1D/RSS, PDF417 e MaxiCode da file di immagine o
streaming delle telecamere in diretta. Il grafico QR emette in modo indipendente ma rimane al di fuori
artefatto combinato mentre viene indagata la limitazione dell'emettitore della Forgia.

## Panoramica dell'API

### Scanner principale (`@mission-platform/code-scanner`)

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

### Componente dell'interfaccia utente (`ForgeCodeScanner`)

Componente riscrivibile disponibile per Vue 3, React, Solid e componenti Web dallo stesso semplice
Identificatore `@mission-platform/code-scanner`: la condizione di esportazione `mp:<framework>` attiva seleziona la build.
Impostalo **una volta** tramite `resolve.conditions` (vedi `defineFrameworkAppConfig` / `frameworkResolveConditions`
da `@mission-platform/vite-config`) e `customConditions` (tramite il
preimpostazioni `@mission-platform/typescript-config/framework-<name>`).

**Vue 3** (`mp:vue` attivo):

```vue
<script setup lang="ts">
  import { ForgeCodeScanner } from '@mission-platform/code-scanner';
</script>

<template>
  <ForgeCodeScanner @result="(res) => console.log(res.text, res.format)" />
</template>
```

**React** (`mp:react` attivo):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.text, result.format)} />;
}
```

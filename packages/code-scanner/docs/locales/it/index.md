# @mission-platform/code-scanner

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/code-scanner/docs/index.md: [packages/code-scanner/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Uno **scanner di codici di immagini/fotocamere** privo di dipendenze compilato da un collegamento statico
Forgia il grafico dello script Web in WebAssembly. Individua e decodifica codici QR, dati
Matrix, Aztec, codici a barre 1D, PDF417, GS1 DataBar e MaxiCode da file immagine
o streaming live della telecamera. È disponibile anche un profilo dinamico del modulo sorgente
distribuzioni che necessitano di moduli decodificatori memorizzabili nella cache in modo indipendente.

## Panoramica dell'API

### Scanner principale (`@mission-platform/code-scanner`)

```ts
import { scanFile, scanImageData, scanImageDataAll } from '@mission-platform/code-scanner';

// Scan ImageData directly
const result = scanImageData(imageData);

// Scan all codes in frame
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
  <ForgeCodeScanner @result="(res) => console.log(res.value)" />
</template>
```

**React** (`mp:react` attivo):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.value)} />;
}
```

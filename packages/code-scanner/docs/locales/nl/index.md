# @mission-platform/code-scanner

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/code-scanner/docs/index.md: [packages/code-scanner/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Een afhankelijkheidsvrije **beeld-/cameracodescanner** samengesteld uit een statisch gekoppelde
Smeed een webscriptgrafiek naar WebAssembly. Het lokaliseert en decodeert QR-codes, gegevens
Matrix, Aztec, 1D-barcodes, PDF417, GS1 DataBar en MaxiCode uit afbeeldingsbestanden
of live camerastreams. Er is ook een dynamisch bronmoduleprofiel beschikbaar
implementaties waarvoor onafhankelijk cachebare decodermodules nodig zijn.

## API-overzicht

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

### UI-component (`ForgeCodeScanner`)

Eenmalig beschrijfbare component beschikbaar voor Vue 3, React, Solid en webcomponenten van dezelfde basis
`@mission-platform/code-scanner`-specificatie: de actieve `mp:<framework>`-exportvoorwaarde selecteert de build.
Stel dit **eenmalig** in via `resolve.conditions` (zie `defineFrameworkAppConfig` / `frameworkResolveConditions`
van `@mission-platform/vite-config`) en `customConditions` (via het
`@mission-platform/typescript-config/framework-<name>`-voorinstellingen).

**Vue 3** (`mp:vue` actief):

```vue
<script setup lang="ts">
  import { ForgeCodeScanner } from '@mission-platform/code-scanner';
</script>

<template>
  <ForgeCodeScanner @result="(res) => console.log(res.value)" />
</template>
```

**React** (`mp:react` actief):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.value)} />;
}
```

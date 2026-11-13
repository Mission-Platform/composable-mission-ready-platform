# @mission-platform/code-scanner

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/integrations/code-scanner/docs/index.md: [packages/integrations/code-scanner/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Een afhankelijkheidsvrije **beeld-/cameracodescanner** samengesteld uit een statisch gekoppelde
Flint-grafiek naar WebAssembly. Het gekoppelde artefact decodeert momenteel gegevens
Matrix, compacte Aztec, 1D/RSS-lezers, PDF417 en MaxiCode vanuit afbeeldingsbestanden of
live camerastreams. De QR-grafiek zendt onafhankelijk uit maar blijft buiten de
gecombineerd artefact terwijl de Forge-emitterbeperking wordt onderzocht.

## API-overzicht

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
  <ForgeCodeScanner @result="(res) => console.log(res.text, res.format)" />
</template>
```

**React** (`mp:react` actief):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.text, result.format)} />;
}
```

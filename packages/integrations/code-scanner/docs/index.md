# @mission-platform/code-scanner

A dependency-free **image / camera code scanner** compiled from a statically linked
Forge Web Script graph to WebAssembly. The linked artifact currently decodes Data
Matrix, compact Aztec, 1D/RSS readers, PDF417, and MaxiCode from image files or
live camera streams. The QR graph emits independently but remains outside the
combined artifact while the Forge emitter limitation is investigated.

## API Overview

### Core Scanner (`@mission-platform/code-scanner`)

```ts
import { scanFile, scanImageData, scanImageDataAll, type ScanOptions } from '@mission-platform/code-scanner';

// Scan ImageData directly
const options: ScanOptions = { formats: ['DATA_MATRIX'], tryHarder: true };
const result = scanImageData(imageData, options);

// Scan all codes in frame
const allResults = scanImageDataAll(imageData);

// Scan a File / Blob
const resultFromFile = await scanFile(file);
```

### UI Component (`ForgeCodeScanner`)

Write-once component available for Vue 3, React, Solid and Web Components from the same bare
`@mission-platform/code-scanner` specifier — the active `mp:<framework>` export condition selects the build.
Set it **once** through `resolve.conditions` (see `defineFrameworkAppConfig` / `frameworkResolveConditions`
from `@mission-platform/vite-config`) and `customConditions` (via the
`@mission-platform/typescript-config/framework-<name>` presets).

**Vue 3** (`mp:vue` active):

```vue
<script setup lang="ts">
  import { ForgeCodeScanner } from '@mission-platform/code-scanner';
</script>

<template>
  <ForgeCodeScanner @result="(res) => console.log(res.text, res.format)" />
</template>
```

**React** (`mp:react` active):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.text, result.format)} />;
}
```

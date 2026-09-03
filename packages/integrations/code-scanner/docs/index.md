# @mission-platform/code-scanner

A dependency-free **image / camera code scanner** compiled from a statically linked
Forge Web Script graph to WebAssembly. It locates and decodes QR codes, Data
Matrix, Aztec, 1D barcodes, PDF417, GS1 DataBar, and MaxiCode from image files
or live camera streams. A dynamic source-module profile is also available for
deployments that need independently cacheable decoder modules.

## API Overview

### Core Scanner (`@mission-platform/code-scanner`)

```ts
import { scanFile, scanImageData, scanImageDataAll } from '@mission-platform/code-scanner';

// Scan ImageData directly
const result = scanImageData(imageData);

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
  <ForgeCodeScanner @result="(res) => console.log(res.value)" />
</template>
```

**React** (`mp:react` active):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.value)} />;
}
```

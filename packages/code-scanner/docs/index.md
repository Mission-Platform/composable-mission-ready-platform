# @mission-platform/code-scanner

A dependency-free **image / camera code scanner** written in Rust and compiled to WebAssembly. It locates and decodes QR
codes, Data Matrix, Aztec, 1D barcodes, PDF417, GS1 DataBar, and MaxiCode from image files or live camera streams.

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

Write-once component available for Vue 3 and React via subpath exports.

**Vue 3:**

```vue
<script setup lang="ts">
  import { ForgeCodeScanner } from '@mission-platform/code-scanner/vue';
</script>

<template>
  <ForgeCodeScanner @result="(res) => console.log(res.value)" />
</template>
```

**React:**

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner/react';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.value)} />;
}
```

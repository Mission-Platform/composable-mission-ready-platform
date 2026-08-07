# @mission-platform/barcode

A dependency-free **1D (linear) barcode encoder and decoder** written in Rust and compiled to **WebAssembly**, exposed
through a small, fully typed ES module wrapper and a write-once `ForgeBarcode` UI component.

## Overview

`@mission-platform/barcode` provides high-performance encoding and decoding for 1D linear barcodes:

- **Encoder**: Renders symbology + payload into a flat run of module bits (`1` = bar, `0` = space).
- **Decoder**: Reads a clean module run of any supported symbology back into its payload.
- **UI Component (`ForgeBarcode`)**: Write-once component compiled for Vue 3, React, Solid and Web Components, all
  served from the bare `@mission-platform/barcode` specifier via the `mp:<framework>` export conditions.

## Supported Symbologies

| Symbology    | Notes                                                                  |
| ------------ | ---------------------------------------------------------------------- |
| `code128`    | High density. Code B for printable ASCII; Code C fast path for digits. |
| `gs1-128`    | Code 128 with leading FNC1 for GS1 Application Identifiers.            |
| `code39`     | Alphanumeric, self-checking; auto-framed with `*` start/stop.          |
| `code39ext`  | Full-ASCII Code 39 via shift characters.                               |
| `code93`     | Compact, self-checking (two check characters).                         |
| `code93ext`  | Full-ASCII Code 93 via shift characters.                               |
| `ean13`      | 12 digits (check appended) or 13 (check verified).                     |
| `ean8`       | 7 digits (check appended) or 8 (check verified).                       |
| `upca`       | 11 digits (check appended) or 12 (check verified).                     |
| `upce`       | Zero-suppressed UPC; 6 digits or 7/8 digit form.                       |
| `itf`        | Interleaved 2 of 5; even digit count required.                         |
| `itf14`      | Fixed 14-digit GTIN-14.                                                |
| `codabar`    | Digits plus `-$:/.+`; auto-framed with `A` start/stop.                 |
| `msi`        | MSI / Modified Plessey with mod-10 check.                              |
| `pharmacode` | Laetus pharmaceutical binary code (`3`–`131070`).                      |

## API & Usage

### Core Encoder & Decoder (`@mission-platform/barcode`)

```ts
import { decodeBarcode, encodeBarcode } from '@mission-platform/barcode';

// Encode a 1D barcode
const barcode = encodeBarcode('code128', 'MISSION-128');
// barcode.width -> number
// barcode.modules -> number[] (1 = bar, 0 = space)

// Decode back to string
const payload = decodeBarcode('code128', barcode.modules);
```

### Framework UI Components

There is no per-framework subpath: pick the framework **once** through `resolve.conditions` (see
`defineFrameworkAppConfig` / `frameworkResolveConditions` from `@mission-platform/vite-config`) and
`customConditions` (via the `@mission-platform/typescript-config/framework-<name>` presets), then import
`ForgeBarcode` from the package root.

**Vue 3** (`mp:vue` active):

```vue
<script setup lang="ts">
  import { ForgeBarcode } from '@mission-platform/barcode';
</script>

<template>
  <ForgeBarcode
    symbology="code128"
    value="MISSION-128"
    :height="60"
  />
</template>
```

**React** (`mp:react` active):

```tsx
import { ForgeBarcode } from '@mission-platform/barcode';

export function BarcodeViewer() {
  return (
    <ForgeBarcode
      symbology="code128"
      value="MISSION-128"
      height={60}
    />
  );
}
```

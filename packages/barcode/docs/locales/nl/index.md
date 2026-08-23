# @mission-platform/barcode

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/barcode/docs/index.md: [packages/barcode/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Een afhankelijkheidsvrije **1D (lineaire) barcode-encoder en -decoder** geschreven in Rust en gecompileerd naar **WebAssembly**, blootgesteld
via een kleine, volledig getypeerde ES-module-wrapper en een eenmalige `ForgeBarcode` UI-component.

## Overzicht

`@mission-platform/barcode` biedt hoogwaardige codering en decodering voor 1D lineaire barcodes:

- **Encoder**: Geeft symbologie + payload weer in een platte reeks modulebits (`1` = bar, `0` = spatie).
- **Decoder**: leest een schone modulerun van elke ondersteunde symbologie terug in de payload.
- **UI-component (`ForgeBarcode`)**: eenmalig te schrijven component samengesteld voor Vue 3, React, Solid en webcomponenten, allemaal
  geserveerd vanuit de kale `@mission-platform/barcode`-specificatie via de `mp:<framework>`-exportvoorwaarden.

## Ondersteunde symbologieën

| Symboliek | Opmerkingen |
| ------------ | ---------------------------------------------------------------------- |
| `code128` | Hoge dichtheid. Code B voor afdrukbare ASCII; Code C snel pad voor cijfers. |
| `gs1-128` | Code 128 met leidende FNC1 voor GS1 Application Identifiers.            |
| `code39` | Alfanumeriek, zelfcontrolerend; automatisch ingelijst met `*` start/stop.          |
| `code39ext` | Volledige ASCII-code 39 via shift-tekens.                               |
| `code93` | Compact, zelfcontrolerend (twee controletekens).                         |
| `code93ext` | Volledige ASCII-code 93 via shift-tekens.                               |
| `ean13` | 12 cijfers (cheque toegevoegd) of 13 (cheque geverifieerd).                     |
| `ean8` | 7 cijfers (cheque toegevoegd) of 8 (cheque geverifieerd).                       |
| `upca` | 11 cijfers (cheque toegevoegd) of 12 (cheque geverifieerd).                     |
| `upce` | Nul-onderdrukte UPC; 6-cijferig of 7/8-cijferig formulier.                       |
| `itf` | Interleaved 2 van 5; zelfs aantal cijfers vereist.                         |
| `itf14` | Vaste 14-cijferige GTIN-14.                                                |
| `codabar` | Cijfers plus `-$:/.+`; automatisch ingelijst met `A` start/stop.                 |
| `msi` | MSI / gemodificeerde Plessey met mod-10-controle.                              |
| `pharmacode` | Laetus farmaceutische binaire code (`3`–`131070`).                      |

## API en gebruik

### Kernencoder en -decoder (`@mission-platform/barcode`)

```ts
import { decodeBarcode, encodeBarcode } from '@mission-platform/barcode';

// Encode a 1D barcode
const barcode = encodeBarcode('code128', 'MISSION-128');
// barcode.width -> number
// barcode.modules -> number[] (1 = bar, 0 = space)

// Decode back to string
const payload = decodeBarcode('code128', barcode.modules);
```

### Framework-UI-componenten

Er is geen subpad per raamwerk: kies het raamwerk **eenmaal** via `resolve.conditions` (zie
`defineFrameworkAppConfig` / `frameworkResolveConditions` van `@mission-platform/vite-config`) en
`customConditions` (via de `@mission-platform/typescript-config/framework-<name>`-voorinstellingen) en importeer vervolgens
`ForgeBarcode` uit de pakketroot.

**Vue 3** (`mp:vue` actief):

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

**React** (`mp:react` actief):

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

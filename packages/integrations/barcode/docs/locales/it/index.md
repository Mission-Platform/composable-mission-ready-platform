# @mission-platform/barcode

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/integrations/barcode/docs/index.md: [packages/integrations/barcode/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Un **codificatore e decodificatore di codici a barre 1D (lineare)** privo di dipendenze scritto in Rust e compilato in **WebAssembly**, esposto
attraverso un piccolo wrapper del modulo ES completamente tipizzato e un componente dell'interfaccia utente `ForgeBarcode` riscrivibile una sola volta.

## Panoramica

`@mission-platform/barcode` fornisce codifica e decodifica ad alte prestazioni per codici a barre lineari 1D:

- **Codificatore**: rende la simbologia + il carico utile in una sequenza piatta di bit del modulo (`1` = barra, `0` = spazio).
- **Decoder**: rilegge un'esecuzione pulita del modulo di qualsiasi simbologia supportata nel suo payload.
- **Componente UI (`ForgeBarcode`)**: componente write-once compilato per Vue 3, React, Solid e componenti Web, tutti
  servito dal semplice identificatore `@mission-platform/barcode` tramite le condizioni di esportazione `mp:<framework>`.

## Simbologie supportate

| Simbologia   | Note                                                                                |
| ------------ | ----------------------------------------------------------------------------------- |
| `code128`    | Alta densità. Codice B per ASCII stampabile; Percorso rapido codice C per le cifre. |
| `gs1-128`    | Codice 128 con FNC1 iniziale per gli identificatori di applicazione GS1.            |
| `code39`     | Alfanumerico, autocontrollo; incorniciato automaticamente con `*` start/stop.       |
| `code39ext`  | Codice ASCII completo 39 tramite caratteri di spostamento.                          |
| `code93`     | Compatto, autocontrollo (due caratteri di controllo).                               |
| `code93ext`  | Codice ASCII completo 93 tramite caratteri di spostamento.                          |
| `ean13`      | 12 cifre (controllo aggiunto) o 13 (controllo verificato).                          |
| `ean8`       | 7 cifre (controllo aggiunto) o 8 (controllo verificato).                            |
| `upca`       | 11 cifre (controllo aggiunto) o 12 (controllo verificato).                          |
| `upce`       | UPC soppresso con zero; Modulo a 6 cifre o 7/8 cifre.                               |
| `itf`        | Interleaved 2 di 5; è richiesto anche il conteggio delle cifre.                     |
| `itf14`      | GTIN-14 fisso a 14 cifre.                                                           |
| `codabar`    | Cifre più `-$:/.+`; incorniciato automaticamente con `A` start/stop.                |
| `msi`        | MSI / Plessey modificato con controllo mod-10.                                      |
| `pharmacode` | Codice binario farmaceutico Laetus (`3`–`131070`).                                  |

## API e utilizzo

### Codificatore e decodificatore principale (`@mission-platform/barcode`)

```ts
import { decodeBarcode, encodeBarcode } from '@mission-platform/barcode';

// Encode a 1D barcode
const barcode = encodeBarcode('code128', 'MISSION-128');
// barcode.width -> number
// barcode.modules -> number[] (1 = bar, 0 = space)

// Decode back to string
const payload = decodeBarcode('code128', barcode.modules);
```

### Componenti dell'interfaccia utente della struttura

Non esiste un sottopercorso per framework: seleziona il framework **una volta** tramite `resolve.conditions` (vedi
`defineFrameworkAppConfig` / `frameworkResolveConditions` da `@mission-platform/vite-config`) e
`customConditions` (tramite le preimpostazioni `@mission-platform/typescript-config/framework-<name>`), quindi importare
`ForgeBarcode` dalla radice del pacchetto.

**Vue 3** (`mp:vue` attivo):

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

**React** (`mp:react` attivo):

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

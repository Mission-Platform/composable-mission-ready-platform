# @mission-platform/barcode

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/integrations/barcode/docs/index.md: [packages/integrations/barcode/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Ein abhängigkeitsfreier **1D (linearer) Barcode-Encoder**, geschrieben in Rust und kompiliert in **WebAssembly**, verfügbar gemacht
über einen kleinen, vollständig typisierten ES-Modul-Wrapper und eine einmal beschreibbare `ForgeBarcode`-UI-Komponente.

## Überblick

`@mission-platform/barcode` bietet eine leistungsstarke Kodierung für lineare 1D-Barcodes:

- **Encoder**: Rendert Symbologie + Nutzlast in eine flache Folge von Modulbits (`1` = Balken, `0` = Leerzeichen).
- **UI-Komponente (`ForgeBarcode`)**: Einmal beschreibbare Komponente, kompiliert für Vue 3, React, Solid und Webkomponenten, alle
  wird vom bloßen Spezifizierer `@mission-platform/barcode` über die Exportbedingungen `mp:<framework>` bereitgestellt.

## Unterstützte Symbologien

| Symbologie | Notizen |
| ------------ | ---------------------------------------------------------------------- |
| `code128` | Hohe Dichte. Code B für druckbares ASCII; Code C schneller Pfad für Ziffern. |
| `gs1-128` | Code 128 mit führendem FNC1 für GS1-Anwendungskennungen.            |
| `code39` | Alphanumerisch, selbstprüfend; Automatisch gerahmt mit `*` Start/Stopp.          |
| `code39ext` | Vollständiger ASCII-Code 39 über Umschaltzeichen.                               |
| `code93` | Kompakt, selbstprüfend (zwei Prüfzeichen).                         |
| `code93ext` | Vollständiger ASCII-Code 93 über Umschaltzeichen.                               |
| `ean13` | 12 Ziffern (Scheck beigefügt) oder 13 (Scheck bestätigt).                     |
| `ean8` | 7 Ziffern (Scheck beigefügt) oder 8 (Scheck bestätigt).                       |
| `upca` | 11 Ziffern (Scheck beigefügt) oder 12 (Scheck bestätigt).                     |
| `upce` | Null-unterdrückter UPC; 6-stellige oder 7/8-stellige Form.                       |
| `itf` | Interleaved 2 von 5; gleichmäßige Ziffernanzahl erforderlich.                         |
| `itf14` | Feste 14-stellige GTIN-14.                                                |
| `codabar` | Ziffern plus `-$:/.+`; Automatisch gerahmt mit `A` Start/Stopp.                 |
| `msi` | MSI / Modifiziertes Plessey mit Mod-10-Check.                              |
| `pharmacode` | Pharmazeutischer Binärcode von Laetus (`3`–`131070`).                      |

## API und Nutzung

### Kern-Encoder (`@mission-platform/barcode`)

```ts
import { encodeBarcode } from '@mission-platform/barcode';

// Encode a 1D barcode
const barcode = encodeBarcode('code128', 'MISSION-128');
// barcode.width -> number
// barcode.modules -> number[] (1 = bar, 0 = space)
```

Um erfasste Bilder oder Kamerabilder zu dekodieren, verwenden Sie die Scanner-APIs von
`@mission-platform/code-scanner`.

### Framework-UI-Komponenten

Es gibt keinen Unterpfad pro Framework: Wählen Sie das Framework **einmal** über `resolve.conditions` aus (siehe
`defineFrameworkAppConfig` / `frameworkResolveConditions` aus `@mission-platform/vite-config`) und
`customConditions` (über die `@mission-platform/typescript-config/framework-<name>`-Voreinstellungen), dann importieren
`ForgeBarcode` aus dem Paketstamm.

**Vue 3** (`mp:vue` aktiv):

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

**React** (`mp:react` aktiv):

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

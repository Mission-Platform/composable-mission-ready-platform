# @mission-platform/barcode

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/integrations/barcode/docs/index.md: [packages/integrations/barcode/docs/index.md](../../index.md)
> Langue: Français (fr)

Un encodeur et décodeur de codes-barres **1D (linéaire) sans dépendance écrit en Rust et compilé sur **WebAssembly**, exposé
via un petit wrapper de module ES entièrement typé et un composant d'interface utilisateur `ForgeBarcode` à écriture unique.

## Aperçu

`@mission-platform/barcode` offre un encodage et un décodage hautes performances pour les codes-barres linéaires 1D :

- **Encodeur** : restitue la symbologie + la charge utile dans une série plate de bits de module (`1` = barre, `0` = espace).
- **Décodeur** : lit une exécution propre du module de toute symbologie prise en charge dans sa charge utile.
- **Composant UI (`ForgeBarcode`)** : composant à écriture unique compilé pour Vue 3, React, Solid et composants Web, tous
  servi à partir du simple spécificateur `@mission-platform/barcode` via les conditions d'exportation `mp:<framework>`.

## Symbologies prises en charge

| Symbologie   | Remarques                                                                             |
| ------------ | ------------------------------------------------------------------------------------- |
| `code128`    | Haute densité. Code B pour ASCII imprimable ; Chemin rapide Code C pour les chiffres. |
| `gs1-128`    | Code 128 avec FNC1 en tête pour les identifiants d'application GS1.                   |
| `code39`     | Alphanumérique, autocontrôle ; encadré automatiquement avec `*` start/stop.           |
| `code39ext`  | Code 39 ASCII complet via des caractères de décalage.                                 |
| `code93`     | Compact, autovérifiant (deux caractères de contrôle).                                 |
| `code93ext`  | Code 93 ASCII complet via des caractères de décalage.                                 |
| `ean13`      | 12 chiffres (chèque annexé) ou 13 (chèque vérifié).                                   |
| `ean8`       | 7 chiffres (chèque annexé) ou 8 (chèque vérifié).                                     |
| `upca`       | 11 chiffres (chèque annexé) ou 12 (chèque vérifié).                                   |
| `upce`       | UPC supprimé par zéro ; Forme à 6 chiffres ou à 7/8 chiffres.                         |
| `itf`        | Entrelacé 2 sur 5 ; nombre pair de chiffres requis.                                   |
| `itf14`      | GTIN-14 à 14 chiffres corrigé.                                                        |
| `codabar`    | Chiffres plus `-$:/.+` ; encadré automatiquement avec le démarrage/arrêt `A`.         |
| `msi`        | MSI / Plessey modifié avec vérification mod-10.                                       |
| `pharmacode` | Code binaire pharmaceutique Laetus (`3` – `131070`).                                  |

## API et utilisation

### Encodeur et décodeur de base (`@mission-platform/barcode`)

```ts
import { decodeBarcode, encodeBarcode } from '@mission-platform/barcode';

// Encode a 1D barcode
const barcode = encodeBarcode('code128', 'MISSION-128');
// barcode.width -> number
// barcode.modules -> number[] (1 = bar, 0 = space)

// Decode back to string
const payload = decodeBarcode('code128', barcode.modules);
```

### Composants de l'interface utilisateur du cadre

Il n'y a pas de sous-chemin par framework : sélectionnez le framework **une fois** via `resolve.conditions` (voir
`defineFrameworkAppConfig` / `frameworkResolveConditions` de `@mission-platform/vite-config`) et
`customConditions` (via les presets `@mission-platform/typescript-config/framework-<name>`), puis importez
`ForgeBarcode` à partir de la racine du package.

**Vue 3** (`mp:vue` actif) :

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

**React** (`mp:react` actif) :

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

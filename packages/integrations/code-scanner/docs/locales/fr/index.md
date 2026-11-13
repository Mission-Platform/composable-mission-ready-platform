# @mission-platform/code-scanner

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/integrations/code-scanner/docs/index.md: [packages/integrations/code-scanner/docs/index.md](../../index.md)
> Langue: Français (fr)

Un **scanner d'image/code de caméra** sans dépendance compilé à partir d'un fichier lié statiquement
Graphique Flint vers WebAssembly. L'artefact lié décode actuellement les données
Lecteurs Matrix, Compact Aztec, 1D/RSS, PDF417 et MaxiCode à partir de fichiers images ou
flux de caméras en direct. Le graphique QR émet indépendamment mais reste en dehors du
artefact combiné pendant que la limitation de l'émetteur Forge est étudiée.

## Présentation de l'API

### Scanner de base (`@mission-platform/code-scanner`)

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

### Composant d'interface utilisateur (`ForgeCodeScanner`)

Composant à écriture unique disponible pour Vue 3, React, Solid et les composants Web à partir du même nu
Spécificateur `@mission-platform/code-scanner` : la condition d'exportation `mp:<framework>` active sélectionne la build.
Définissez-le **une fois** via `resolve.conditions` (voir `defineFrameworkAppConfig` / `frameworkResolveConditions`
depuis `@mission-platform/vite-config`) et `customConditions` (via le
`@mission-platform/typescript-config/framework-<name>` préréglages).

**Vue 3** (`mp:vue` actif) :

```vue
<script setup lang="ts">
  import { ForgeCodeScanner } from '@mission-platform/code-scanner';
</script>

<template>
  <ForgeCodeScanner @result="(res) => console.log(res.text, res.format)" />
</template>
```

**React** (`mp:react` actif) :

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.text, result.format)} />;
}
```

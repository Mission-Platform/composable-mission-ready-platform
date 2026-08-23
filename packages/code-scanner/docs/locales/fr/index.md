# @mission-platform/code-scanner

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/code-scanner/docs/index.md: [packages/code-scanner/docs/index.md](../../index.md)
> Langue: Français (fr)

Un **scanner d'image/code de caméra** sans dépendance compilé à partir d'un fichier lié statiquement
Forgez le graphique de script Web vers WebAssembly. Il localise et décode les codes QR, les données
Matrix, Aztec, codes-barres 1D, PDF417, GS1 DataBar et MaxiCode à partir de fichiers image
ou des flux de caméras en direct. Un profil de module source dynamique est également disponible pour
déploiements qui nécessitent des modules de décodeur pouvant être mis en cache indépendamment.

## Présentation de l'API

### Scanner de base (`@mission-platform/code-scanner`)

```ts
import { scanFile, scanImageData, scanImageDataAll } from '@mission-platform/code-scanner';

// Scan ImageData directly
const result = scanImageData(imageData);

// Scan all codes in frame
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
  <ForgeCodeScanner @result="(res) => console.log(res.value)" />
</template>
```

**React** (`mp:react` actif) :

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.value)} />;
}
```

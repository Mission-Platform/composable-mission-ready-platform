# @mission-platform/hunspell

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/hunspell/docs/index.md: [packages/hunspell/docs/index.md](../../index.md)
> Langue: Français (fr)

`@mission-platform/hunspell` fournit un moteur de vérification orthographique hautes performances basé sur Hunspell, compilé pour
**WebAssembly** via Emscripten. Il est présenté sous la forme d'un module ES qui s'exécute entièrement dans le navigateur ou dans Web Workers.

## Architecture

Le package utilise un pipeline de build spécialisé pour garantir aucune dépendance sur un runtime Node.js :

1. **Compilation WASM** : la bibliothèque `hunspell-1.7.2` est compilée de manière croisée à l'aide d'Emscripten.
2. **C++ Wrapper** : un léger wrapper C++ (`hunspell_wrapper.cpp`) expose les fonctions nécessaires via les liaisons Emscripten.
3. **Artéfact de fichier unique** : la sortie finale est un `hunspell.js` autonome dans lequel le binaire WASM est intégré en tant que
   base64, éliminant ainsi le besoin de chargement de fichier `.wasm` et de résolution d'URL séparés.

### Reconstruire l'artefact WASM

La reconstruction nécessite [Docker](https://www.docker.com/). Utilisez la commande suivante depuis la racine :

```bash
pnpm --filter @mission-platform/hunspell build:wasm
```

## Usage

### API de base

Vous pouvez utiliser le moteur Hunspell directement dans n'importe quel environnement JavaScript/TypeScript.

```ts
import { createHunspell } from '@mission-platform/hunspell';

// Initialize the WASM module
const module = await createHunspell();

// Create a checker instance by passing the text content of .aff and .dic files
const checker = new module.HunspellChecker(affFileContent, dicFileContent);

console.log(checker.spell('hello')); // true
console.log(checker.spell('wrold')); // false
console.log(checker.suggest('wrold')); // ['world', 'word', ...]

// Important: free WASM memory when done
checker.delete();
```

### Intégration de l'éditeur Monaco

Le package fournit une intégration transparente pour l'éditeur de Monaco, gérant la génération des travailleurs et la vérification orthographique anti-rebond.
automatiquement.

#### Vue 3 (API de composition)

Utilisez le composable `useHunspellMonaco` pour attacher de manière réactive la vérification orthographique.

```vue
<script setup lang="ts">
  import { ref } from 'vue';
  import { useHunspellMonaco } from '@mission-platform/hunspell';

  const editorRef = ref<monaco.editor.IStandaloneCodeEditor>();
  const enabled = ref(true);

  // Attach spell-checking logic
  useHunspellMonaco(editorRef, enabled, 'plaintext');
</script>
```

#### Indépendant du cadre / impératif

Pour les consommateurs non-Vue (par exemple, les composants dans `@mission-platform/components`), utilisez la fonction `attachHunspellMonaco` :

```ts
import { attachHunspellMonaco } from '@mission-platform/hunspell';

const handle = attachHunspellMonaco(editor, monacoRuntime, 'plaintext');

// Later, dispose of listeners and workers
handle.dispose();
```

## Fichiers de dictionnaire

Ce package **n'est pas livré avec des dictionnaires intégrés** afin de conserver une taille réduite. Vous devez fournir le vôtre
Paire `.aff` (affixe) et `.dic` (dictionnaire).

Source recommandée : [Dictionnaires LibreOffice](https://github.com/LibreOffice/dictionaries).

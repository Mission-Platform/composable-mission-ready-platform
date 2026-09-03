# @mission-platform/harper

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/harper/docs/index.md: [packages/harper/docs/index.md](../../index.md)
> Langue: Français (fr)

`@mission-platform/harper` fournit une intégration entre le [Harper](https://writewithharper.com) vérificateur de grammaire et
l'éditeur de Monaco. Harper est un vérificateur de grammaire anglaise rapide, hors ligne et axé sur la confidentialité, optimisé par WebAssembly et qui s'exécute
entièrement dans le navigateur.

## Caractéristiques

- **Vérification grammaticale en temps réel** : les problèmes sont détectés au fur et à mesure que vous tapez, avec des résultats rebondis de 300 ms pour maintenir l'éditeur
  performances.
- **Marqueurs visuels** : les problèmes de grammaire et de style sont mis en évidence directement dans l'éditeur Monaco à l'aide de marqueurs standards.
- **Corrections rapides** : l'intégration avec les actions de code "ampoule" de Monaco permet aux utilisateurs d'appliquer les corrections suggérées
  instantanément.
- **Privacy First** : tous les traitements s'effectuent localement dans un Web Worker ; aucun texte n'est jamais envoyé sur le réseau.
- **Niveaux de gravité** : prend en charge les niveaux de gravité LSP standard (Erreur, Avertissement, Informations et Astuce).

## Installation et configuration

Étant donné que Harper s'exécute dans un Web Worker, votre application doit configurer la fabrique de travailleurs avant d'initialiser un éditeur.
cas.

### Configuration de l'environnement global

Dans le point d'entrée principal de votre application (par exemple, `main.ts`), définissez le `HarperEnvironment` :

```ts
import HarperWorker from '@mission-platform/harper/worker?worker';

window.HarperEnvironment = {
  getWorker: () => new HarperWorker(),
};
```

## Usage

### Vue 3 (API de composition)

Le composable `useHarperMonaco` fournit un moyen simple d'attacher une vérification grammaticale à une instance de l'éditeur Monaco dans Vue.
composants.

#### Exemple

```vue
<script setup lang="ts">
  import { ref } from 'vue';
  import { useHarperMonaco } from '@mission-platform/harper';

  const containerRef = ref<HTMLElement>();
  const editorRef = ref<monaco.editor.IStandaloneCodeEditor>();
  const grammarCheckEnabled = ref(true);

  // Initialize Monaco editor
  onMounted(() => {
    editorRef.value = monaco.editor.create(containerRef.value!, {
      value: 'This is an exampl of a grammer error.',
      language: 'markdown',
    });
  });

  // Attach Harper grammar checking
  useHarperMonaco(editorRef, grammarCheckEnabled, 'markdown');
</script>

<template>
  <div
    ref="containerRef"
    style="height: 400px;"
  />
</template>
```

#### Référence API : `useHarperMonaco`

```ts
function useHarperMonaco(
  editorReference: MaybeRefOrGetter<monaco.editor.IStandaloneCodeEditor | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
  languageReference: MaybeRefOrGetter<string>,
): void;
```

- `editorReference` : Une référence ou un getter fournissant l'instance de l'éditeur Monaco.
- `enabled` : Un booléen réactif pour activer/désactiver la vérification grammaticale.
- `languageReference` : Le mode langage de l'éditeur, utilisé pour enregistrer les actions du code.

---

### Intégration indépendante du framework

Pour les consommateurs non-Vue (tels que les composants de `@mission-platform/components`), utilisez l'impératif `attachHarperMonaco`.
fonction.

#### Exemple

```ts
import { attachHarperMonaco } from '@mission-platform/harper';

// Attach Harper to an existing editor instance
const handle = attachHarperMonaco(editor, monacoRuntime, 'plaintext');

// Later, clean up listeners and workers
handle.dispose();
```

## Détails techniques

### L'interface `HarperIssue`

Lorsque le travailleur détecte un problème de grammaire, il renvoie un objet `HarperIssue` :

```ts
interface HarperIssue {
  offset: number; // Byte offset of the issue in the text
  length: number; // Length of the affected text
  message: string; // Human-readable explanation of the error
  ruleId: string; // The identifier of the specific Harper rule triggered
  suggestions: string[]; // Suggested alternative text corrections
  severity: 1 | 2 | 3 | 4; // LSP severity (1=Error, 2=Warning, 3=Info, 4=Hint)
}
```

### Flux de travail

1. **Worker Spawn** : le package utilise la fabrique fournie dans `window.HarperEnvironment` pour générer un Harper Web Worker.
2. **Vérification anti-rebond** : chaque modification apportée au modèle d'éditeur déclenche une demande anti-rebond adressée au travailleur.
3. **Mappage des marqueurs** : les problèmes renvoyés par Harper sont mappés aux marqueurs de Monaco pour une mise en évidence visuelle.
4. **Actions de code** : un fournisseur personnalisé est enregistré à Monaco pour présenter `HarperIssue.suggestions` comme solution rapide
   actions.

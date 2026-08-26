# `@mission-platform/layouts`

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/layout/docs/index.md: [packages/layout/docs/index.md](../../index.md)
> Langue: Français (fr)

Application neutre et mises en page de modèles pour Vue 3 et React, créées avec le dialecte Forge JSX et stylisées.
avec des jetons de conception Mission Platform.

## Aperçu

Le package `@mission-platform/layouts` contient des shells d'application, des conteneurs, des présentations verticales et quatre éléments réutilisables.
modèles de modèles réactifs. Ses composants sont exportés via la version de package conditionnée par le framework existante, donc
la même source fonctionne avec Vue 3, React, Solid, Svelte et les composants Web.

## Caractéristiques

- **Shell d'application** : `ForgeApplicationLayout`, `ForgeContainer` et `ForgeVerticalLayout`
- **Composition Bento** : Un héros dominant avec des fonctionnalités et des régions de support
- **Grille régulière** : cellules nommées ordonnées pour les collections de métriques et de cartes de statut
- **Composition du modèle F** : régions d'en-tête, d'introduction, d'article, secondaire et de pied de page de style documentation
- **Composition du motif Z** : alternance de régions de contenu supérieure, centrale et inférieure
- **Réactivité CSS uniquement** : redistribution axée sur le mobile sans `window`, `matchMedia` ou état client
- **Intégration des jetons de conception** : les espaces, le remplissage et les marges utilisent les jetons d'espacement de Mission Platform

## Installation

```bash
pnpm add @mission-platform/layouts
```

## Usage

### Vue 3

```vue
<script setup lang="ts">
  import { ForgeBentoLayout, ForgeFPatternLayout, ForgeGridLayout } from '@mission-platform/layouts';
</script>

<template>
  <ForgeBentoLayout gap="lg">
    <template #hero><h1>Mission Platform</h1></template>
    <template #feature><p>Composable building blocks</p></template>
    <template #supporting><a href="/docs">Read the docs</a></template>
  </ForgeBentoLayout>

  <ForgeFPatternLayout>
    <template #header><nav>Documentation navigation</nav></template>
    <template #primary><article>Guide content</article></template>
    <template #secondary><aside>On this page</aside></template>
  </ForgeFPatternLayout>

  <ForgeGridLayout
    :rows="2"
    :columns="2"
  >
    <template #cell1><article>Availability</article></template>
    <template #cell2><article>Latency</article></template>
  </ForgeGridLayout>
</template>
```

### React

```tsx
import { ForgeBentoLayout, ForgeZPatternLayout } from '@mission-platform/layouts';

export function LandingPage() {
  return (
    <>
      <ForgeBentoLayout
        hero={<h1>Mission Platform</h1>}
        feature={<p>Composable building blocks</p>}
        supporting={<a href="/docs">Read the docs</a>}
      />
      <ForgeZPatternLayout
        topStart={<h2>Build once</h2>}
        topEnd={
          <img
            src="hero.png"
            alt=""
          />
        }
        middle={<p>Use the same layout from Vue or React.</p>}
        bottomStart={<a href="/docs">Documentation</a>}
        bottomEnd={<button type="button">Get started</button>}
      />
    </>
  );
}
```

## Référence API

### Contrôles partagés

Les quatre modèles de modèles acceptent :

- `tag` : `div`, `section`, `article`, `main` ou `aside`
- `gap`, `margin` et `padding` : `2xs`, `xs`, `sm`, `md`, `lg`, `xl` ou `2xl`
- `breakpoint` : `xs`, `sm`, `md`, `lg` ou `xl`

Les composants commencent sous forme de dispositions à une colonne ou empilées. Au point d'arrêt sélectionné, ils appliquent leur modèle spécifique
zones de grille. Les wrappers de région ont des classes prévisibles de style BEM et sont émis uniquement lorsque leur emplacement nommé est présent.

### Contrats de région

| Composant             | Régions nommées                                            | Source des compositions                                                    |
| --------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| `ForgeBentoLayout`    | `hero`, `feature`, `supporting`                            | Sections héros et fonctionnalités du marketing de site Web                 |
| `ForgeGridLayout`     | `cell1` à `cell12`                                         | Cartes de tableau de bord du moniteur de service et résumés d'état         |
| `ForgeFPatternLayout` | `header`, `intro`, `primary`, `secondary`, `footer`        | Barre de navigation/contexte Docs, article, barre latérale et pied de page |
| `ForgeZPatternLayout` | `topStart`, `topEnd`, `middle`, `bottomStart`, `bottomEnd` | Alternance du contenu et des actions de la page de destination             |

`ForgeGridLayout` accepte `rows` et `columns`, se limite à un ou plus, limite la zone de rendu à 12 noms
cellules et utilise un repli sur une seule colonne en dessous de son point d'arrêt. Les cellules nommées s'affichent toujours dans l'ordre source.

## Conseils sur la composition du produit

Les modèles extraient la structure, pas le comportement de l'application. Cartes de package de sites Web et contenu de FAQ, navigation dans les documents et
le routage, les interrogations du moniteur de service, les formulaires et l'état des incidents restent la propriété de leurs applications. Ces demandes
peuvent transmettre leur contenu existant dans les régions nommées sans introduire d'importations de `apps/` vers `packages/layout`.

Pour des raisons d'accessibilité, conservez le contenu fourni dans l'ordre de lecture sémantique et traitez les zones de grille CSS comme un placement visuel uniquement.
Le contenu long est protégé par `min-width: 0` et `overflow-wrap: anywhere` ; SSR ne nécessite pas `window` ou
`matchMedia`.

## Licence

Clause BSD-4

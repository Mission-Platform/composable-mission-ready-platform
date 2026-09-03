# @mission-platform/forms

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/ui/forms/docs/index.md: [packages/ui/forms/docs/index.md](../../index.md)
> Langue: Français (fr)

`@mission-platform/forms` fournit des composants d'orchestration de formulaires de haut niveau qui permettent à Mission Platform de restituer
des formulaires et des assistants complexes entièrement à partir de définitions de schéma JSON.

Comme d'autres packages partagés, il suit une approche « écriture unique », en créant des composants en JSX neutre et en les compilant.
dans les composants natifs Vue 3 et React.

Toutes les importations utilisent le seul spécificateur `@mission-platform/forms`. Le framework est sélectionné une fois pour l'ensemble de l'application via
la condition d'export `mp:<framework>` — `resolve.conditions` (voir `defineFrameworkAppConfig` /
`frameworkResolveConditions` de `@mission-platform/vite-config`) et `customConditions` (via le
`@mission-platform/typescript-config/framework-<name>` préréglages).

## Composants de base

### `ForgeSchemaForm`

Le composant principal pour le rendu des formulaires basés sur les données. Il prend une définition de schéma JSON et génère automatiquement le
widgets d'interface utilisateur correspondants et logique de validation.

#### Principales caractéristiques :

- **Schema-Driven** : Entièrement configuré via le schéma JSON. Un seul objet restitue un formulaire en une seule étape ; un tableau d'objets
  crée un assistant en plusieurs étapes.
- **Validation cohérente** : utilise `@mission-platform/forms-core` (Ajv) pour garantir que les applications Vue et React valident le
  mêmes données de manière identique.
- **Visibilité conditionnelle** : prend en charge `ui.visibleWhen` pour afficher ou masquer les champs de manière dynamique en fonction d'autres valeurs d'entrée.
- **Structures imbriquées** : gère les ensembles de champs imbriqués pour les modèles de données complexes.

#### Usage:

**Vue** (`mp:vue` actif) :

```vue
<script setup lang="ts">
  import { SchemaForm } from '@mission-platform/forms';
  const mySchema = {/* JSON Schema */};
</script>

<template>
  <SchemaForm
    :schema="mySchema"
    @change="onValuesChange"
  />
</template>
```

**React** (`mp:react` actif — notez le spécificateur identique) :

```tsx
import { SchemaForm } from '@mission-platform/forms';

const MyComponent = () => (
  <SchemaForm
    schema={mySchema}
    onChange={(values) => console.log(values)}
  />
);
```

---

### `ForgeFormBuilder`

Un outil de création visuelle qui permet aux non-développeurs de créer des schémas de formulaire sans écrire manuellement du JSON.

#### Principales caractéristiques :

- **Visual Canvas** : éditeur de style glisser-déposer pour organiser les champs et définir leurs propriétés.
- **Configuration de l'assistant** : Un onglet "Étapes" dédié à la gestion du flux multi-étapes dans les assistants.
- **Live Preview** : rendu en temps réel du formulaire au fur et à mesure de sa construction.
- **Schema Export** : Émet un `SchemaFormDefinition` qui peut être enregistré dans une base de données ou utilisé directement par
  `ForgeSchemaForm`.

#### Mise en page:

Le générateur est structuré sous la forme d'une présentation à trois colonnes à l'aide de `ForgeVerticalLayout` :

1. **Palette de champs** : une liste de widgets disponibles (entrées, sélections, dates, etc.) à ajouter au formulaire.
2. **Editor Canvas** : La zone centrale où les champs sont configurés et organisés.
3. **Inspecteur** : éditeur de propriétés détaillé pour le champ actuellement sélectionné.

## Architecture et dépendances

Pour éviter les cycles de dépendance tout en maintenant la parité du framework :

- `@mission-platform/forms` dépend de `@mission-platform/components` (pour les widgets d'entrée individuels comme `ForgeInput`,
  `ForgeCheckbox`) et `@mission-platform/layouts`.
- Il délègue toutes les tâches lourdes (validation, analyse de schéma et logique conditionnelle) à l'utilisateur indépendant du framework.
  `@mission-platform/forms-core`.

## Styles

Le package fournit des assistants d’accessibilité partagés via :

```ts
import '@mission-platform/forms/styles';
```

Chaque composant utilise également ses propres modules CSS colocalisés pour un style spécifique.

# @mission-platform/forge-jsx

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/core/forge-jsx/docs/index.md: [packages/core/forge-jsx/docs/index.md](../../index.md)
> Langue: Français (fr)

Un petit runtime JSX indépendant du framework, sans dépendances, pour Mission Platform.
Les composants sont créés une fois dans JSX et rendus via le
Package `@mission-platform/forge-adapters`.

## Comment ça marche

```
author .tsx ──(classic jsx factory `h`)──▶ MpElement tree ──▶ framework adapter ──▶ target framework
```

1. Les composants sont écrits en JSX compilé par la transformation JSX **classique** (`jsxFactory: 'h'`,
   `jsxFragmentFactory: 'Fragment'`).
2. `h(...)` crée une arborescence `MpElement` sérialisable, neutre en termes de framework, au lieu d'un élément React/Vue.
3. Un adaptateur de structure parcourt cette arborescence et mappe chaque node sur la cible.
   primitives de rendu natives du framework.

## Caractéristiques

- **Framework-Neutral JSX Runtime** : un petit runtime sans dépendance qui crée des arborescences `MpElement` sérialisables.
- **Prise en charge des hooks** : hooks de style React indépendants du framework (`useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`)
  qui compilent vers leurs équivalents framework
- **Pas de codegen au moment de la construction** : contrairement à Mitosis ou à des outils similaires, cette approche utilise des adaptateurs d'exécution au lieu du moment de la construction.
  transformation
- **TypeScript First** : prise en charge complète de TypeScript avec inférence de type appropriée

## Installation

```bash
npm install @mission-platform/forge-jsx
# or
yarn add @mission-platform/forge-jsx
# or
pnpm add @mission-platform/forge-jsx
```

## Utilisation de base

### 1. Écrivez un composant neutre en termes de framework

```tsx
// MyComponent.tsx
import { h, Fragment } from '@mission-platform/forge-jsx';
import { useState } from '@mission-platform/forge-jsx';

export function MyComponent({ name }: { name: string }) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### 2. Utilisez-le dans Vue 3

```vue
<script setup lang="ts">
  import { toVueComponent } from '@mission-platform/forge-adapters/vue';
  import MyComponent from './MyComponent.tsx';

  const MyVueComponent = toVueComponent(MyComponent);
</script>

<template>
  <MyVueComponent name="World" />
</template>
```

### 3. Utilisez-le dans React

```tsx
import { toReactComponent } from '@mission-platform/forge-adapters/react';
import MyComponent from './MyComponent.tsx';

const MyReactComponent = toReactComponent(MyComponent);

function App() {
  return <MyReactComponent name="World" />;
}
```

## Référence API

### Fonctions principales

#### `h(type, props?, ...children)`

La fonction d'usine JSX indépendante du framework.

**Paramètres :**

- `type` : type d'élément React ou nom de balise de chaîne
- `props` : Objet de props/attributs
- `children` : Éléments enfants

**Renvoie :** `MpElement` - Une arborescence d'éléments indépendante du framework

#### `Fragment(props, ...children)`

Crée un fragment (aucun élément wrapper).

### Crochets

#### `useState(initialValue)`

Hook d’état indépendant du framework.

**Paramètres :**

- `initialValue` : Valeur de l'état initial

**Retours :** `[state, setState]` - Valeur d'état et fonction de définition

#### `useRef(initialValue)`

Crée un objet ref mutable.

**Paramètres :**

- `initialValue` (facultatif) : Valeur de référence initiale

**Renvoie :** `ref` - Objet de référence mutable avec la propriété `.current`

#### `useEffect(effect, dependencies?)`

Crochet à effet secondaire neutre pour le cadre.

**Paramètres :**

- `effect` : Fonction à exécuter lors du montage/mise à jour/démontage
- `dependencies` (facultatif) : Tableau de dépendances pour la mémorisation

#### `useMemo(value, dependencies)`

Mémorise une valeur calculée.

**Paramètres :**

- `value` : Valeur à mémoriser
- `dependencies` : Tableau de dépendances

**Renvoi :** Valeur mémorisée

#### `useCallback(fn, dependencies)`

Mémorise une fonction.

**Paramètres :**

- `fn` : Fonction de mémorisation
- `dependencies` : Tableau de dépendances

**Retours :** Fonction mémorisée

## TypeScript Prise en charge

Le package comprend des déclarations TypeScript complètes. Vous pouvez utiliser JSX avec une vérification de type appropriée :

```tsx
import { h } from '@mission-platform/forge-jsx';

type Props = {
  title: string;
  count?: number;
};

function MyComponent({ title, count = 0 }: Props) {
  return (
    <div>
      {title}: {count}
    </div>
  );
}
```

## Utilisation avancée

### Utilisation avec Vite

Configurez votre `vite.config.ts` pour utiliser la transformation JSX classique :

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [vue(), react()],
  optimizeDeps: {
    include: ['@mission-platform/forge-jsx'],
  },
});
```

### Configuration JSX globale

Pour les projets TypeScript, vous pouvez configurer les paramètres JSX globaux :

```ts
// jsx-globals.d.ts
import '@mission-platform/forge-jsx/jsx-globals';
```

Cela configure l'espace de noms global `JSX` pour utiliser `MpElement`.

## Migration à partir d'autres frameworks

Si vous migrez à partir des composants React ou Vue, la conversion est simple :

### À partir de React

```tsx
// Before (React)
function Button({ children }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{children}</button>;
}

// After (Framework-neutral)
import { h, Fragment, useState } from '@mission-platform/forge-jsx';

export function Button({ children }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{children}</button>;
}
```

### À partir de Vue

```vue
<!-- Before (Vue) -->
<script setup>
  import { ref } from 'vue';
  const count = ref(0);
</script>

<template>
  <button @click="count++">Count: {{ count }}</button>
</template>

// After (Framework-neutral) export function Button() { const [count, setCount] = useState(0) return (
<button onClick="{()" =""> setCount(count + 1)}>
      Count: {count}
    </button>
) }
```

## Considérations relatives aux performances

- La couche neutre en termes de framework ajoute une surcharge minimale (juste un parcours dans l'arbre au moment du rendu)
- Les hooks sont compilés avec des équivalents de framework natifs pour des performances optimales
- Aucune analyse d'exécution ni génération de code n'est effectuée
- L'empreinte mémoire est comparable à l'écriture de composants React et Vue séparés

## Licence

Clause BSD-4

# @mission-platform/forge-jsx

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/core/forge-jsx/docs/index.md: [packages/core/forge-jsx/docs/index.md](../../index.md)
> Langue: Français (fr)

Une petite couche « écrire une fois, exécutée sur Vue 3 et React » sans dépendance pour Mission Platform. Les composants sont créés une fois dans
JSX et rendu sur l'un ou l'autre framework via de petits adaptateurs - pas de codegen au moment de la construction, pas de compilateur externe (il s'agit d'un
alternative roulée à la main aux outils comme Mitosis).

## Comment ça marche

```
author .tsx ──(classic jsx factory `h`)──▶ MpElement tree ──▶ toReactComponent ──▶ React
                                                          └──▶ toVueComponent  ──▶ Vue 3
```

1. Les composants sont écrits en JSX compilé par la transformation JSX **classique** (`jsxFactory: 'h'`,
   `jsxFragmentFactory: 'Fragment'`).
2. `h(...)` crée une arborescence `MpElement` sérialisable, neutre en termes de framework, au lieu d'un élément React/Vue.
3. Les adaptateurs par framework parcourent cette arborescence et mappent chaque node sur `React.createElement` ou `h` de Vue au moment du rendu.

## Caractéristiques

- **Framework-Neutral JSX Runtime** : un petit runtime sans dépendance qui crée des arborescences `MpElement` sérialisables.
- **Adaptateur Vue 3** : convertit les composants neutres en SFC Vue 3 natifs avec une réactivité appropriée
- **Adaptateur React** : convertit les composants neutres en composants React natifs
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
- `children` : Éléments enfants

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

### Adaptateurs

#### `toVueComponent(component)`

Convertit un composant indépendant du framework en un composant Vue 3.

**Paramètres :**

- `component` : fonction de composant neutre en termes de framework

**Renvoie :** Définition du composant Vue

#### `toReactComponent(component)`

Convertit un composant indépendant du framework en un composant React.

**Paramètres :**

- `component` : fonction de composant neutre en termes de framework

**Renvoi :** Fonction du composant React

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

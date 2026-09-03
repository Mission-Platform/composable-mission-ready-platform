# @mission-platform/forge

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/compiler/forge/forge/docs/index.md: [packages/compiler/forge/forge/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

Een kleine, afhankelijkheidsvrije laag "eenmalig schrijven, uitvoeren op Vue 3 en React" voor Mission Platform. Componenten worden eenmaal in geschreven
JSX en weergegeven op beide frameworks via kleine adapters - geen build-time codegen, geen externe compiler (dit is een
handgewalst alternatief voor gereedschappen zoals Mitosis).

## Hoe het werkt

```
author .tsx ──(classic jsx factory `h`)──▶ MpElement tree ──▶ toReactComponent ──▶ React
                                                          └──▶ toVueComponent  ──▶ Vue 3
```

1. Componenten zijn geschreven in JSX, gecompileerd door de **klassieke** JSX-transformatie (`jsxFactory: 'h'`,
   `jsxFragmentFactory: 'Fragment'`).
2. `h(...)` bouwt een raamwerkneutrale, serialiseerbare `MpElement`-structuur in plaats van een React/Vue-element.
3. De per-framework-adapters lopen door die boom en wijzen elke node toe aan `React.createElement` of Vue's `h` tijdens het renderen.

## Functies

- **Framework-neutrale JSX Runtime**: een kleine, afhankelijkheidsvrije runtime die serialiseerbare `MpElement`-bomen bouwt
- **Vue 3-adapter**: converteert neutrale componenten naar native Vue 3 SFC's met de juiste reactiviteit
- **React-adapter**: converteert neutrale componenten naar oorspronkelijke React-componenten
- **Haakondersteuning**: raamwerkneutrale haken in React-stijl (`useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`)
  die compileren naar hun raamwerkequivalenten
- **Geen Build-Time Codegen**: in tegenstelling tot Mitosis of soortgelijke tools gebruikt deze aanpak runtime-adapters in plaats van build-time
  transformatie
- **TypeScript Eerste**: Volledige TypeScript-ondersteuning met de juiste type-inferentie

## Installatie

```bash
npm install @mission-platform/forge
# or
yarn add @mission-platform/forge
# or
pnpm add @mission-platform/forge
```

## Basisgebruik

### 1. Schrijf een raamwerkneutrale component

```tsx
// MyComponent.tsx
import { h, Fragment } from '@mission-platform/forge';
import { useState } from '@mission-platform/forge';

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

### 2. Gebruik het Vue 3

```vue
<script setup lang="ts">
  import { toVueComponent } from '@mission-platform/forge/vue';
  import MyComponent from './MyComponent.tsx';

  const MyVueComponent = toVueComponent(MyComponent);
</script>

<template>
  <MyVueComponent name="World" />
</template>
```

### 3. Gebruik het in React

```tsx
import { toReactComponent } from '@mission-platform/forge/react';
import MyComponent from './MyComponent.tsx';

const MyReactComponent = toReactComponent(MyComponent);

function App() {
  return <MyReactComponent name="World" />;
}
```

## API-referentie

### Kernfuncties

#### `h(type, props?, ...children)`

De raamwerkneutrale JSX-fabrieksfunctie.

**Parameters:**

- `type`: React elementtype of tekenreekstagnaam
- `props`: Object van rekwisieten/attributen
- `children`: Onderliggende elementen

**Retourneert:** `MpElement` - Een raamwerk-neutrale elementenboom

#### `Fragment(props, ...children)`

Creëert een fragment (geen wrapper-element).

### Haken

#### `useState(initialValue)`

Kaderneutrale staatshaak.

**Parameters:**

- `initialValue`: initiële statuswaarde

**Retourneert:** `[state, setState]` - Statuswaarde en setterfunctie

#### `useRef(initialValue)`

Creëert een veranderlijk ref-object.

**Parameters:**

- `initialValue` (optioneel): initiële ref-waarde

**Retourneert:** `ref` - Veranderlijk ref-object met de eigenschap `.current`

#### `useEffect(effect, dependencies?)`

Kaderneutrale neveneffecthaak.

**Parameters:**

- `effect`: Functie die moet worden uitgevoerd bij koppelen/bijwerken/ontkoppelen
- `dependencies` (optioneel): afhankelijkheidsarray voor memoisatie

#### `useMemo(value, dependencies)`

Onthoudt een berekende waarde.

**Parameters:**

- `value`: Waarde om te onthouden
- `dependencies`: afhankelijkheidsarray

**Retouren:** Gememoriseerde waarde

#### `useCallback(fn, dependencies)`

Onthoudt een functie.

**Parameters:**

- `fn`: Functie om te onthouden
- `dependencies`: afhankelijkheidsarray

**Retourneert:** Geheugenfunctie

### Adapters

#### `toVueComponent(component)`

Converteert een raamwerkneutrale component naar een Vue 3-component.

**Parameters:**

- `component`: raamwerkneutrale componentfunctie

**Retourneert:** Vue componentdefinitie

#### `toReactComponent(component)`

Converteert een raamwerkneutrale component naar een React-component.

**Parameters:**

- `component`: raamwerkneutrale componentfunctie

**Retourneert:** React componentfunctie

## TypeScript Ondersteuning

Het pakket bevat volledige TypeScript-declaraties. U kunt JSX gebruiken met de juiste typecontrole:

```tsx
import { h } from '@mission-platform/forge';

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

## Geavanceerd gebruik

### Gebruiken met Vite

Configureer uw `vite.config.ts` om de klassieke JSX-transformatie te gebruiken:

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [vue(), react()],
  optimizeDeps: {
    include: ['@mission-platform/forge'],
  },
});
```

### Globale JSX-configuratie

Voor TypeScript-projecten kunt u algemene JSX-instellingen configureren:

```ts
// jsx-globals.d.ts
import '@mission-platform/forge/jsx-globals';
```

Hiermee configureert u de globale `JSX`-naamruimte om `MpElement` te gebruiken.

## Migratie van andere frameworks

Als u migreert vanuit React- of Vue-componenten, is de conversie eenvoudig:

### Van React

```tsx
// Before (React)
function Button({ children }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{children}</button>;
}

// After (Framework-neutral)
import { h, Fragment, useState } from '@mission-platform/forge';

export function Button({ children }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{children}</button>;
}
```

### Van Vue

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

## Prestatieoverwegingen

- De raamwerk-neutrale laag voegt minimale overhead toe (slechts een boomwandeling tijdens het renderen)
- Hooks zijn gecompileerd naar native framework-equivalenten voor optimale prestaties
- Er wordt geen runtime-parsing of codegeneratie uitgevoerd
- Geheugenvoetafdruk is vergelijkbaar met het schrijven van afzonderlijke React- en Vue-componenten

## Licentie

BSD-4-clausule

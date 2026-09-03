# @mission-platform/forge

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/compiler/forge/forge/docs/index.md: [packages/compiler/forge/forge/docs/index.md](../../index.md)
> Lingua: Italiano (it)

Un piccolo livello "scrivi una volta, esegui su Vue 3 e React" senza dipendenze per Mission Platform. I componenti vengono creati una sola volta
JSX e reso su entrambi i framework tramite piccoli adattatori: nessun codegen in fase di compilazione, nessun compilatore esterno (questo è un
alternativa arrotolata a mano a strumenti come Mitosis).

## Come funziona

```
author .tsx ──(classic jsx factory `h`)──▶ MpElement tree ──▶ toReactComponent ──▶ React
                                                          └──▶ toVueComponent  ──▶ Vue 3
```

1. I componenti sono scritti in JSX compilato dalla trasformazione JSX **classica** (`jsxFactory: 'h'`,
   `jsxFragmentFactory: 'Fragment'`).
2. `h(...)` crea un albero `MpElement` serializzabile e indipendente dal framework invece di un elemento React/Vue.
3. Gli adattatori per framework percorrono quell'albero e mappano ogni node su `React.createElement` o `h` di Vue al momento del rendering.

## Caratteristiche

- **JSX Runtime neutro dal framework**: un runtime piccolo e privo di dipendenze che crea alberi `MpElement` serializzabili
- **Adattatore Vue 3**: Converte i componenti neutri in SFC Vue 3 nativi con reattività adeguata
- **Adattatore React**: converte i componenti neutri in componenti React nativi
- **Supporto hook**: hook stile React indipendenti dal framework (`useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`)
  che vengono compilati nei loro equivalenti framework
- **Nessun codegen Build-Time**: a differenza di Mitosis o strumenti simili, questo approccio utilizza adattatori runtime anziché build-time
  trasformazione
- **TypeScript Primo**: supporto completo TypeScript con inferenza del tipo corretta

## Installazione

```bash
npm install @mission-platform/forge
# or
yarn add @mission-platform/forge
# or
pnpm add @mission-platform/forge
```

## Utilizzo di base

### 1. Scrivere un componente neutrale rispetto al framework

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

### 2. Usalo in Vue 3

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

### 3. Utilizzarlo in React

```tsx
import { toReactComponent } from '@mission-platform/forge/react';
import MyComponent from './MyComponent.tsx';

const MyReactComponent = toReactComponent(MyComponent);

function App() {
  return <MyReactComponent name="World" />;
}
```

## Riferimento API

### Funzioni principali

#### `h(type, props?, ...children)`

La funzione factory JSX indipendente dal framework.

**Parametri:**

- `type`: tipo di elemento React o nome tag stringa
- `props`: Oggetto di oggetti di scena/attributi
- `children`: elementi figlio

**Restituisce:** `MpElement` - Un albero di elementi indipendente dal framework

#### `Fragment(props, ...children)`

Crea un frammento (nessun elemento wrapper).

### Ganci

#### `useState(initialValue)`

Hook di stato neutrale rispetto al quadro normativo.

**Parametri:**

- `initialValue`: valore dello stato iniziale

**Restituisce:** `[state, setState]` - Valore dello stato e funzione di impostazione

#### `useRef(initialValue)`

Crea un oggetto riferimento modificabile.

**Parametri:**

- `initialValue` (opzionale): valore di riferimento iniziale

**Restituisce:** `ref` - Oggetto riferimento modificabile con proprietà `.current`

#### `useEffect(effect, dependencies?)`

Gancio per effetti collaterali neutro dal quadro.

**Parametri:**

- `effect`: funzione da eseguire durante il montaggio/aggiornamento/smontaggio
- `dependencies` (facoltativo): array di dipendenze per la memorizzazione

#### `useMemo(value, dependencies)`

Memorizza un valore calcolato.

**Parametri:**

- `value`: Valore da memorizzare
- `dependencies`: array di dipendenze

**Restituisce:** Valore memorizzato

#### `useCallback(fn, dependencies)`

Memorizza una funzione.

**Parametri:**

- `fn`: Funzione per memorizzare
- `dependencies`: array di dipendenze

**Restituisce:** Funzione memorizzata

### Adattatori

#### `toVueComponent(component)`

Converte un componente indipendente dal framework in un componente Vue 3.

**Parametri:**

- `component`: funzione del componente indipendente dal contesto

**Restituisce:** Definizione del componente Vue

#### `toReactComponent(component)`

Converte un componente indipendente dal framework in un componente React.

**Parametri:**

- `component`: funzione del componente indipendente dal contesto

**Restituisce:** Funzione componente React

## Supporto TypeScript

Il pacchetto include le dichiarazioni TypeScript complete. È possibile utilizzare JSX con il controllo del tipo corretto:

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

## Utilizzo avanzato

### Utilizzo con Vite

Configura il tuo `vite.config.ts` per utilizzare la classica trasformazione JSX:

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

### Configurazione JSX globale

Per i progetti TypeScript, è possibile configurare le impostazioni JSX globali:

```ts
// jsx-globals.d.ts
import '@mission-platform/forge/jsx-globals';
```

Ciò configura lo spazio dei nomi `JSX` globale per utilizzare `MpElement`.

## Migrazione da altri framework

Se stai eseguendo la migrazione da componenti React o Vue, la conversione è semplice:

### Da React

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

### Da Vue

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

## Considerazioni sulle prestazioni

- Il livello neutro dal framework aggiunge un sovraccarico minimo (solo una camminata su un albero in fase di rendering)
- Gli hook sono compilati in equivalenti del framework nativo per prestazioni ottimali
- Non viene eseguita alcuna analisi di runtime o generazione di codice
- L'impronta di memoria è paragonabile alla scrittura di componenti React e Vue separati

## Licenza

Clausola BSD-4

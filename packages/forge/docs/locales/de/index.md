# @mission-platform/forge

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/forge/docs/index.md: [packages/forge/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

Eine winzige, abhängigkeitsfreie Ebene „Einmal schreiben, auf Vue 3 und React ausführen“ für Mission Platform. Komponenten werden einmal erstellt
JSX und wird auf beiden Frameworks über kleine Adapter gerendert – kein Build-Time-Codegen, kein externer Compiler (dies ist ein
handgerollte Alternative zu Werkzeugen wie Mitosis).

## Wie es funktioniert

```
author .tsx ──(classic jsx factory `h`)──▶ MpElement tree ──▶ toReactComponent ──▶ React
                                                          └──▶ toVueComponent  ──▶ Vue 3
```

1. Komponenten werden in JSX geschrieben und mit der **klassischen** JSX-Transformation kompiliert (`jsxFactory: 'h'`,
   `jsxFragmentFactory: 'Fragment'`).
2. `h(...)` erstellt einen Framework-neutralen, serialisierbaren `MpElement`-Baum anstelle eines React/Vue-Elements.
3. Die pro-Framework-Adapter durchlaufen diesen Baum und ordnen jedes node zum Zeitpunkt des Renderns dem `React.createElement` oder dem `h` von Vue zu.

## Merkmale

- **Framework-neutrale JSX-Laufzeit**: Eine kleine, abhängigkeitsfreie Laufzeit, die serialisierbare `MpElement`-Bäume erstellt
- **Vue 3 Adapter**: Konvertiert neutrale Komponenten in native Vue 3 SFCs mit der richtigen Reaktivität
- **React-Adapter**: Konvertiert neutrale Komponenten in native React-Komponenten
- **Hooks-Unterstützung**: Framework-neutrale Hooks im React-Stil (`useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`)
  die zu ihren Framework-Äquivalenten kompiliert werden
- **Kein Build-Time-Codegen**: Im Gegensatz zu Mitosis oder ähnlichen Tools verwendet dieser Ansatz Laufzeitadapter anstelle von Build-Time
  Transformation
- **TypeScript First**: Vollständige TypeScript-Unterstützung mit ordnungsgemäßer Typinferenz

## Installation

```bash
npm install @mission-platform/forge
# or
yarn add @mission-platform/forge
# or
pnpm add @mission-platform/forge
```

## Grundlegende Verwendung

### 1. Schreiben Sie eine Framework-neutrale Komponente

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

### 2. Verwenden Sie es in Vue 3

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

### 3. Verwenden Sie es in React

```tsx
import { toReactComponent } from '@mission-platform/forge/react';
import MyComponent from './MyComponent.tsx';

const MyReactComponent = toReactComponent(MyComponent);

function App() {
  return <MyReactComponent name="World" />;
}
```

## API-Referenz

### Kernfunktionen

#### `h(type, props?, ...children)`

Die Framework-neutrale JSX-Factory-Funktion.

**Parameter:**

- `type`: React Elementtyp oder String-Tag-Name
- `props`: Objekt von Requisiten/Attributen
- `children`: Untergeordnete Elemente

**Rückgabe:** `MpElement` – Ein Framework-neutraler Elementbaum

#### `Fragment(props, ...children)`

Erstellt ein Fragment (kein Wrapper-Element).

### Haken

#### `useState(initialValue)`

Framework-neutraler Zustands-Hook.

**Parameter:**

- `initialValue`: Anfangszustandswert

**Rückgabe:** `[state, setState]` – Statuswert und Setter-Funktion

#### `useRef(initialValue)`

Erstellt ein veränderbares Referenzobjekt.

**Parameter:**

- `initialValue` (optional): Anfangsreferenzwert

**Rückgabe:** `ref` – Veränderbares Referenzobjekt mit der Eigenschaft `.current`

#### `useEffect(effect, dependencies?)`

Framework-neutraler Nebeneffekt-Hook.

**Parameter:**

- `effect`: Funktion zur Ausführung beim Mounten/Aktualisieren/Unmounten
- `dependencies` (optional): Abhängigkeitsarray für die Memoisierung

#### `useMemo(value, dependencies)`

Merkt sich einen berechneten Wert.

**Parameter:**

- `value`: Zu merkender Wert
- `dependencies`: Abhängigkeitsarray

**Rückgabe:** Gemerkter Wert

#### `useCallback(fn, dependencies)`

Merkt sich eine Funktion.

**Parameter:**

- `fn`: Funktion zum Merken
- `dependencies`: Abhängigkeitsarray

**Rückgabe:** Auswendig gelernte Funktion

### Adapter

#### `toVueComponent(component)`

Konvertiert eine Framework-neutrale Komponente in eine Vue 3-Komponente.

**Parameter:**

- `component`: Framework-neutrale Komponentenfunktion

**Rückgabe:** Vue Komponentendefinition

#### `toReactComponent(component)`

Konvertiert eine Framework-neutrale Komponente in eine React-Komponente.

**Parameter:**

- `component`: Framework-neutrale Komponentenfunktion

**Rückgabe:** React Komponentenfunktion

## TypeScript-Unterstützung

Das Paket enthält vollständige TypeScript-Deklarationen. Sie können JSX mit der richtigen Typprüfung verwenden:

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

## Erweiterte Nutzung

### Verwendung mit Vite

Konfigurieren Sie Ihr `vite.config.ts` für die Verwendung der klassischen JSX-Transformation:

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

### Globale JSX-Konfiguration

Für TypeScript-Projekte können Sie globale JSX-Einstellungen konfigurieren:

```ts
// jsx-globals.d.ts
import '@mission-platform/forge/jsx-globals';
```

Dadurch wird der globale `JSX`-Namespace für die Verwendung von `MpElement` konfiguriert.

## Migration von anderen Frameworks

Wenn Sie von React- oder Vue-Komponenten migrieren, ist die Konvertierung unkompliziert:

### Von React

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

### Von Vue

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

## Leistungsüberlegungen

- Die Framework-neutrale Ebene verursacht nur minimalen Overhead (nur ein Tree Walk zur Renderzeit)
  – Hooks werden für eine optimale Leistung zu nativen Framework-Äquivalenten kompiliert
- Es wird keine Laufzeitanalyse oder Codegenerierung durchgeführt
  – Der Speicherbedarf ist vergleichbar mit dem Schreiben separater React- und Vue-Komponenten

## Lizenz

BSD-4-Klausel

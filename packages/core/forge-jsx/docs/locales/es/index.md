# @mission-platform/forge-jsx

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/core/forge-jsx/docs/index.md: [packages/core/forge-jsx/docs/index.md](../../index.md)
> Idioma: Español (es)

Una capa pequeña y libre de dependencias "escribir una vez, ejecutar en Vue 3 y React" para Mission Platform. Los componentes se crean una vez al
JSX y renderizado en cualquiera de los marcos a través de pequeños adaptadores: sin generación de código en tiempo de compilación, sin compilador externo (este es un
alternativa enrollada a mano a herramientas como Mitosis).

## como funciona

```
author .tsx ──(classic jsx factory `h`)──▶ MpElement tree ──▶ toReactComponent ──▶ React
                                                          └──▶ toVueComponent  ──▶ Vue 3
```

1. Los componentes están escritos en JSX compilado mediante la transformación JSX **clásica** (`jsxFactory: 'h'`,
   `jsxFragmentFactory: 'Fragment'`).
2. `h(...)` construye un árbol `MpElement` serializable y neutral en el marco de trabajo en lugar de un elemento React/Vue.
3. Los adaptadores por marco recorren ese árbol y asignan cada node a `React.createElement` o `h` de Vue en el momento del renderizado.

## Características

- **Framework-Neutral JSX Runtime**: un pequeño entorno de ejecución sin dependencias que crea árboles `MpElement` serializables
- **Adaptador Vue 3**: Convierte componentes neutros en Vue 3 SFC nativos con reactividad adecuada
- **Adaptador React**: Convierte componentes neutros en componentes nativos React
- **Soporte de ganchos**: ganchos estilo React neutrales en el marco (`useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`)
  que se compilan en sus equivalentes de marco
- **Sin Codegen en tiempo de compilación**: a diferencia de Mitosis o herramientas similares, este enfoque utiliza adaptadores de tiempo de ejecución en lugar de tiempo de compilación
  transformación
- **TypeScript Primero**: compatibilidad total con TypeScript con inferencia de tipos adecuada

## Instalación

```bash
npm install @mission-platform/forge-jsx
# or
yarn add @mission-platform/forge-jsx
# or
pnpm add @mission-platform/forge-jsx
```

## Uso básico

### 1. Escriba un componente neutral en el marco

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

### 2. Úselo en Vue 3

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

### 3. Úselo en React

```tsx
import { toReactComponent } from '@mission-platform/forge-adapters/react';
import MyComponent from './MyComponent.tsx';

const MyReactComponent = toReactComponent(MyComponent);

function App() {
  return <MyReactComponent name="World" />;
}
```

## Referencia de API

### Funciones principales

#### `h(type, props?, ...children)`

La función de fábrica JSX neutral en el marco.

**Parámetros:**

- `type`: React tipo de elemento o nombre de etiqueta de cadena
- `props`: Objeto de accesorios/atributos
- `children`: Elementos secundarios

**Devoluciones:** `MpElement`: un árbol de elementos neutral en el marco

#### `Fragment(props, ...children)`

Crea un fragmento (sin elemento contenedor).

### Manos

#### `useState(initialValue)`

Gancho de estado neutral en el marco.

**Parámetros:**

- `initialValue`: Valor del estado inicial

**Devoluciones:** `[state, setState]` - Valor de estado y función de establecimiento

#### `useRef(initialValue)`

Crea un objeto de referencia mutable.

**Parámetros:**

- `initialValue` (opcional): Valor de referencia inicial

**Devoluciones:** `ref`: objeto de referencia mutable con propiedad `.current`

#### `useEffect(effect, dependencies?)`

Gancho de efecto secundario neutral en el marco.

**Parámetros:**

- `effect`: Función para ejecutar al montar/actualizar/desmontar
- `dependencies` (opcional): Matriz de dependencia para memorización

#### `useMemo(value, dependencies)`

Memoriza un valor calculado.

**Parámetros:**

- `value`: Valor a memorizar
- `dependencies`: matriz de dependencia

**Devoluciones:** Valor memorizado

#### `useCallback(fn, dependencies)`

Memoriza una función.

**Parámetros:**

- `fn`: Función para memorizar
- `dependencies`: matriz de dependencia

**Devoluciones:** Función memorizada

### Adaptadores

#### `toVueComponent(component)`

Convierte un componente neutral del marco en un componente Vue 3.

**Parámetros:**

- `component`: Función de componente neutral en el marco

**Devoluciones:** Definición del componente Vue

#### `toReactComponent(component)`

Convierte un componente neutral del marco en un componente React.

**Parámetros:**

- `component`: Función de componente neutral en el marco

**Devoluciones:** Función del componente React

## TypeScript Soporte

El paquete incluye declaraciones TypeScript completas. Puede utilizar JSX con la verificación de tipos adecuada:

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

## Uso avanzado

### Usando con Vite

Configure su `vite.config.ts` para usar la transformación JSX clásica:

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

### Configuración JSX global

Para proyectos TypeScript, puede configurar ajustes JSX globales:

```ts
// jsx-globals.d.ts
import '@mission-platform/forge-jsx/jsx-globals';
```

Esto configura el espacio de nombres global `JSX` para usar `MpElement`.

## Migración desde otros marcos

Si está migrando desde componentes React o Vue, la conversión es sencilla:

### Desde React

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

### Desde Vue

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

## Consideraciones de rendimiento

- La capa neutral del marco agrega una sobrecarga mínima (solo un paseo por un árbol en el momento del renderizado)
- Los ganchos se compilan en equivalentes de marco nativo para un rendimiento óptimo
- No se realiza ningún análisis en tiempo de ejecución ni generación de código.
- El uso de memoria es comparable al de escribir componentes React y Vue por separado.

## Licencia

Cláusula BSD-4

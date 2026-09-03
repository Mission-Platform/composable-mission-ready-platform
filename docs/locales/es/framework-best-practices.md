# Mejores prácticas del marco

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/framework-best-practices.md: [docs/framework-best-practices.md](../../framework-best-practices.md)
> Idioma: Español (es)

Este documento proporciona orientación sobre patrones idiomáticos, modelos de reactividad y optimizaciones de rendimiento para los marcos admitidos por Mission Platform. Sirve como **Explicación** de nuestra estrategia de múltiples marcos y como referencia para el desarrollo de marcos específicos.

## Estrategia multimarco

La filosofía central de Mission Platform es construir una vez y renderizar en todas partes. Esto se logra a través de **@mission-platform/forge**, el marco principal de la plataforma: un entorno de ejecución JSX neutral en el marco en el que se crean todos los componentes compartidos (todo excepto las aplicaciones) y desde el cual se procesan sin problemas en Vue 3, React y otros entornos compatibles.

### El dialecto de la forja
Al crear paquetes compartidos, cree componentes utilizando las primitivas neutrales de Forge:
- **JSX Factory**: Utilice `h` y `Fragment` de `@mission-platform/forge`.
- **Ganchos neutros**: Utilice `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback` y `useId`.
- **Primitivas**: utilice `Slot`, `Teleport`, `Transition` y `Dynamic` para estructuras de interfaz de usuario complejas.

## Vue 3

Vue 3 es el marco con el que se crean las aplicaciones en `apps/` y el principal objetivo de renderizado nativo para los componentes de Forge. Los propios componentes compartidos se crean en Forge JSX en lugar de hacerlo directamente en Vue.

### Patrones idiomáticos
- **API de composición**: utilice `<script setup lang="ts">` para todos los componentes nuevos.
- **Integración de Forge**: Envuelva componentes neutros usando `toVueComponent` de `@mission-platform/forge/vue`.
- **Composables**: extrae lógica con estado en funciones `useXxx` para promover la reutilización.

### Optimizaciones de rendimiento
- **Reactividad superficial**: utilice `shallowRef` o `shallowReactive` para conjuntos de datos grandes y complejos para evitar la sobrecarga del proxy.
- **v-memo**: use `v-memo` en plantillas para omitir costosas actualizaciones de subárbol basadas en cambios de dependencia.
- **markRaw**: Wrap third-party library instances (e.g., Chart.js, Mapbox) in `markRaw` to prevent Vue from attempting to make them reactive.

## React

React es compatible a través del adaptador de tiempo de ejecución de Forge, principalmente para integraciones externas y herramientas internas específicas.

### Patrones idiomáticos
- **Componentes funcionales**: Utilice componentes funcionales con ganchos.
- **Integración de Forge**: Envuelva componentes neutros usando `toReactComponent` de `@mission-platform/forge/react`.
- **Disciplina de Hooks**: sigue estrictamente las "Reglas de Hooks" para garantizar un comportamiento predecible.

### Optimizaciones de rendimiento
- **Memoización**: utilice `React.memo`, `useMemo` y `useCallback` para mantener la identidad referencial y evitar re-renderizaciones innecesarias.
- **Funciones simultáneas**: aproveche `useTransition` o `useDeferredValue` para actualizaciones de UI no urgentes para mantener el hilo principal receptivo.

## Otros marcos

Mission Platform proporciona distintos niveles de soporte para otros marcos a través de adaptadores Forge:

- **SolidJS**: utiliza reactividad detallada a través de señales. Evite desestructurar los accesorios para mantener la reactividad.
- **Svelte 5**: Aprovecha las runas (`$state`, `$derived`, `$effect`) para una reactividad moderna.
- **Componentes web (iluminado)**: útil para crear componentes altamente portátiles que deben ejecutarse en entornos heredados o sin un marco.

## Modelos de rendimiento y reactividad

| Marco | Modelo de reactividad | Estrategia de actualización |
| :--- | :--- | :--- |
| **Vue 3** | Basado en proxy | DOM virtual con optimizaciones del compilador. |
| **React** | Estado inmutable | Conciliación DOM virtual. |
| **SolidJS** | Señales detalladas | Actualizaciones directas de DOM (sin VDOM). |
| **Svelte 5** | Runas / Señales | Actualizaciones directas de DOM a través del compilador. |
| **Iluminado** | Propiedades reactivas | Actualizaciones asincrónicas de Shadow DOM. |

## Recursos relacionados
- [Mejores prácticas](best-practices.md)
- [Guía de prueba](testing.md)
- [@mission-platform/forge LÉAME](../../../packages/compiler/forge/forge/README.md)

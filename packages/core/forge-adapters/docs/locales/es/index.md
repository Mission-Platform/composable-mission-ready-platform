# @mission-platform/forge-adapters

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/core/forge-adapters/docs/index.md: [packages/core/forge-adapters/docs/index.md](../../index.md)
> Idioma: Español (es)

Adaptadores de marco para el tiempo de ejecución neutral `@mission-platform/forge-jsx`.
Los componentes se crean una vez en Forge JSX y se procesan a través del adaptador.
para el marco objetivo.

## Exportaciones

| Entrada | Propósito |
| ------------------------------------------------- | -------------------------------------------- |
| `@mission-platform/forge-adapters/react` | `toReactComponent` y `renderToReact` |
| `@mission-platform/forge-adapters/vue` | `toVueComponent` y `renderToVue` |
| `@mission-platform/forge-adapters/solid` | Primitivas de estructura y marcador de SolidJS |
| `@mission-platform/forge-adapters/svelte` | Svelte ayudantes de renderizado |
| `@mission-platform/forge-adapters/web-components` | Elemento personalizado nativo y tiempo de ejecución DOM directo |

Los paquetes de marco son dependencias de pares opcionales. Instalar el marco utilizado.
por el adaptador seleccionado e importe solo su subruta.

```ts
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { MyComponent } from '@mission-platform/components';

const VueComponent = toVueComponent(MyComponent);
```

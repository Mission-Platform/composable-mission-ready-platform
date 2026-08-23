# @mission-platform/d3

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/d3/docs/index.md: [packages/d3/docs/index.md](../../index.md)
> Idioma: Español (es)

`@mission-platform/d3` proporciona integración neutral en el marco entre D3 y el componente de escritura única de Mission Platform
sistema.

## Arquitectura

Este paquete une la representación imperativa basada en selección D3 con árboles de UI declarativos reactivos:

- **Implementación neutral**: Construido sobre ganchos `@mission-platform/forge` (`useRef`, `useEffect`).
- **Objetivo de marco dual**: Transpilado por `@mission-platform/vite-plugin-forge` a React nativo (`./react`) y Vue 3
  (`./vue`) componibles.
- **Dependencia selectiva**: Importa `d3-selection` directamente para mantener mínimos los tamaños de los paquetes de clientes.

## API clave

### `useD3`

```ts
function useD3<E extends Element>(draw: D3Draw<E>, dependencies?: MpDependencyList): MpRef<E | null>;
```

Se adjunta a una referencia de elemento DOM/SVG y ejecuta la función `draw` pasando una selección D3 (`D3Selection<E>`) cuando
montado y cuando las dependencias cambian. `draw` puede devolver opcionalmente una función de limpieza de desmontaje.

### Utilidades de margen

#### `resolveMargin(input?: MarginInput): Margin`

Normaliza los objetos de margen parciales o faltantes en valores completos de píxeles `{ top, right, bottom, left }`.

#### `innerDimensions(outerWidth: number, outerHeight: number, marginInput?: MarginInput): InnerDimensions`

Calcula `innerWidth`, `innerHeight` y `margin` resuelto para cálculos de viewbox SVG.

```ts
interface InnerDimensions {
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
}
```

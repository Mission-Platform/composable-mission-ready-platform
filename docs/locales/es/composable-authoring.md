# Autoría componible

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> Fuente en inglés: [docs/composable-authoring.md](../../composable-authoring.md)
> Idioma: Español (es)

Los componibles son la forma principal de encapsular y reutilizar la lógica reactiva dentro de Mission Platform. Para asegurar estos
Las unidades de lógica son portátiles en todos los marcos de UI compatibles, se crean como módulos de **escritura única** utilizando el
ganchos neutrales proporcionados por `@mission-platform/forge`.

## Diseño del directorio

Cada elemento componible DEBE residir en su propio subdirectorio con nombre dentro `src/composables/`, acompañado de una prueba coubicada
Lima y barril local.

```text
src/composables/
├── use-focus-trap/
│   ├── use-focus-trap.ts        # Composable logic
│   ├── use-focus-trap.spec.ts   # Required unit tests
│   └── index.ts                 # Local barrel
└── index.ts                     # Package-level re-exports
```

## Reglas de creación

1. **Utilice Forge Hooks**: solo importe primitivas reactivas (p. ej., `useState`, `useEffect`, `useMemo`, `useRef`) de
   `@mission-platform/forge`. Nunca importe directamente desde `vue` o `react`.
2. **Convención de nomenclatura**: Los nombres componibles deben usar kebab-case y tener el prefijo `use-` (e.g., `use-media-query`).
3. **Seguridad SSR**: asegúrese de que la lógica sea segura para la representación del lado del servidor. Proteja cualquier acceso a API exclusivas del navegador como `window`,
   `document`, o `localStorage`.
4. **Sin componentes de interfaz de usuario**: los elementos componibles deben centrarse en la lógica. No devuelva ni manipule los componentes de la interfaz de usuario directamente; en cambio,
   estado de devolución, referencias o devoluciones de llamada.
5. **Pruebas obligatorias**: cada elemento componible debe tener una ubicación compartida `.spec.ts` archivo usando Vitest.

## Ejemplo básico

A continuación se muestra un elemento componible típico de escritura única que administra un detector de eventos.

```ts
import { type MpRef, useEffect } from '@mission-platform/forge';

export function useEventListener(
  target: MpRef<EventTarget | null>,
  type: string,
  listener: EventListener,
): void {
  useEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }

    element.addEventListener(type, listener);
    // Clean up on unmount or dependency change
    return () => {
      element.removeEventListener(type, listener);
    };
  }, [target, type, listener]);
}
```

## Andamio

La forma más rápida de crear un nuevo elemento componible es a través de la herramienta MCP de Mission Platform Developer:

```bash
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## Guías relacionadas

- [Desarrollo de paquetes](package-development.md)
- [Diseño de componentes atómicos](atomic-component-design.md)
- [Creación de tiendas](store-authoring.md)
- [Autoría de utilidades](util-authoring.md)

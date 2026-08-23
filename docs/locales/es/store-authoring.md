# Creación de tiendas

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/store-authoring.md: [docs/store-authoring.md](../../store-authoring.md)
> Idioma: Español (es)

Las tiendas se utilizan para gestionar el estado compartido entre componentes dentro de un paquete. A diferencia de las tiendas a nivel de aplicaciones (como Pinia o
Redux), las tiendas de paquetes en Mission Platform están diseñadas para ser **módulos observables neutrales en cuanto al marco**. Esto permite
componentes de escritura única para consumirlos a través de ganchos de Forge independientemente del marco del host.

## Diseño del directorio

Cada almacén DEBE residir en su propio subdirectorio con nombre dentro de `src/stores/`, acompañado de un archivo de prueba ubicado conjuntamente y un
barril local.

```text
src/stores/
├── theme-store/
│   ├── theme-store.ts        # Store logic (observable)
│   ├── theme-store.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## El patrón observable

Las tiendas de paquetes evitan dependencias específicas del marco. En cambio, siguen un patrón observable simple:

1. **Estado privado**: mantenga el estado dentro del alcance del módulo (valores TypeScript simples).
2. **Acceso a instantáneas**: proporcione una función `getSnapshot()` para recuperar el estado actual.
3. **Suscripción**: proporcione una función `subscribe(listener)` que agregue una devolución de llamada a una lista y devuelva una cancelación de suscripción.
   función.
4. **Mutadores**: proporcionan funciones para actualizar el estado, que DEBEN notificar a todos los oyentes después de la actualización.

## Reglas de creación

1. **Independiente del marco**: no importe desde los ganchos `vue`, `react` o `@mission-platform/forge` dentro del módulo de tienda.
   mismo.
2. **Tipos explícitos**: siempre defina y exporte una interfaz para el estado de la tienda.
3. **Seguridad SSR**: proteja el acceso a las API del navegador (por ejemplo, `localStorage`) para que la tienda se pueda inicializar en Node.js.
   ambiente.
4. **Prueba obligatoria**: Cada tienda debe tener un archivo `.spec.ts` ubicado en el mismo lugar.

## Tienda de ejemplo

```ts
export interface ThemeState {
  theme: 'light' | 'dark' | 'auto';
}

let state: ThemeState = { theme: 'auto' };
const listeners = new Set<() => void>();

export function getThemeSnapshot(): ThemeState {
  return state;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: ThemeState['theme']): void {
  state = { ...state, theme };
  listeners.forEach((listener) => listener());
}
```

## Consumir tiendas en componentes

Para usar una tienda dentro de un componente de escritura única, conéctela usando `useState` y `useEffect` desde `@mission-platform/forge`:

```tsx
const [snapshot, setSnapshot] = useState(getThemeSnapshot());

useEffect(() => {
  return subscribeTheme(() => setSnapshot(getThemeSnapshot()));
}, []);
```

## Andamio

Utilice la herramienta MCP de Mission Platform Developer para generar un nuevo esqueleto de tienda:

```bash
# Example: Creating a new 'auth-store' in the 'components' package
scaffold_store(name="auth-store", package="components", apply=true)
```

## Guías relacionadas

- [Desarrollo de paquetes](package-development.md)
- [Diseño de componentes atómicos](atomic-component-design.md)
- [Autoría componible](composable-authoring.md)
- [Autoría de utilidades](util-authoring.md)

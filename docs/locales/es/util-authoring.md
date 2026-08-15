# Autoría de utilidades

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> Fuente en inglés: [docs/util-authoring.md](../../util-authoring.md)
> Idioma: Español (es)

Las utilidades (utils) son funciones auxiliares puras e independientes del marco. Deben estar libres de importaciones de marcos de UI y, a menos que
requerido y documentado explícitamente, libre de API DOM. Esto garantiza que puedan utilizarse en cualquier contexto, incluido
Lógica y trabajadores del lado del servidor.

## Diseño del directorio

Cada utilidad DEBE residir en su propio subdirectorio con nombre dentro `src/utils/`, acompañado de un archivo de prueba ubicado en el mismo lugar y
un barril local.

```text
src/utils/
├── format-date/
│   ├── format-date.ts        # Pure logic
│   ├── format-date.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## Reglas de creación

1. **Pureza**: Prefiere funciones puras que no tengan efectos secundarios. Dada la misma entrada, siempre deben devolver el
   misma salida.
2. **Sin ganchos de interfaz de usuario**: nunca importar `vue`, `react`, o `@mission-platform/forge` ganchos en una utilidad. Lógica que requiere
   la reactividad pertenece a [Componibles](composable-authoring.md).
3. **Escritura explícita**: proporcione información completa TypeScript tipos para todos los argumentos y valores de retorno.
4. **Pruebas obligatorias**: Cada utilidad debe tener una ubicación compartida `.spec.ts` archivo.
5. **Responsabilidad única**: cada carpeta de utilidades debe centrarse en una tarea específica y específica.

## Ejemplo básico

```ts
/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

## Andamio

Utilice la herramienta MCP de Mission Platform Developer para generar un nuevo esqueleto de utilidad:

```bash
# Example: Creating a new 'string-utils' folder in the 'i18n' package
scaffold_util(name="string-utils", package="i18n", apply=true)
```

## Guías relacionadas

- [Desarrollo de paquetes](package-development.md)
- [Diseño de componentes atómicos](atomic-component-design.md)
- [Autoría componible](composable-authoring.md)
- [Creación de tiendas](store-authoring.md)

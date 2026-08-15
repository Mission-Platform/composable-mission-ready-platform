# Diseño de componentes atómicos

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> Fuente en inglés: [docs/atomic-component-design.md](../../atomic-component-design.md)
> Idioma: Español (es)

Mission Platform utiliza un sistema de **Diseño Atómico** para organizar los componentes en niveles jerárquicos de complejidad. cada
El componente es una unidad de "escritura única" creada en el dialecto neutral Forge JSX (`@mission-platform/forge`), asegurando
coherencia entre múltiples marcos.

## Niveles de diseño

Los componentes se clasifican en cinco niveles según su alcance y responsabilidad.

| Nivel | Carpeta | Descripción |
|:--------------|:----------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Átomos** | `src/components/atoms/`     | Las primitivas de interfaz de usuario más pequeñas (p. ej., `ForgeButton`, `ForgeInput`, `ForgeBadge`). Por lo general, son unidades funcionales que no pueden descomponerse más sin perder su propósito. |
| **Moléculas** | `src/components/molecules/` | Composiciones simples de átomos (por ejemplo, `ForgeSearchInput`, `ForgeFieldSet`). Funcionan juntos como una unidad.                                                                    |
| **Organismos** | `src/components/organisms/` | Secciones complejas de la interfaz de usuario compuestas de átomos, moléculas y otros organismos (p. ej., `ForgeNavbar`, `ForgeTable`, `ForgeModal`).                                                       |
| **Plantillas** | `src/components/templates/` | Diseños a nivel de página que definen la estructura del contenido (por ejemplo, `ForgeHero`, `ForgeAppLayout`). A menudo utilizan espacios para definir dónde se debe colocar el contenido.                     |
| **Páginas** | `src/components/pages/`     | Instancias específicas de plantillas llenas de contenido y datos concretos (p. ej., `AccountSettingsPage`).                                                                        |

## Diseño de carpeta de componentes

Cada componente reside en su propio subdirectorio con nombre en la carpeta del nivel apropiado. Este directorio contiene el
fuente de componentes, historias, pruebas y estilos opcionales.

```text
src/components/
├── atoms/
│   └── forge-button/
│       ├── forge-button.tsx          # Component source (Forge JSX)
│       ├── forge-button.stories.tsx  # Storybook stories
│       ├── forge-button.spec.ts      # Unit tests (Vitest)
│       ├── forge-button.module.scss  # Scoped styles (optional)
│       └── index.ts                 # Local barrel (exports component + types)
├── molecules/
├── organisms/
├── templates/
├── pages/
└── index.ts                         # Global barrel re-exporting all levels
```

## Convenciones de historias

Las historias de los libros de cuentos DEBEN ubicarse junto con sus componentes y seguir una estricta convención de títulos para mantener una apariencia limpia.
estructura de la barra lateral.

### Nombre del archivo

Las historias deben utilizar el `.stories.tsx` extensión.

### Convención de título

El `title` campo en el libro de cuentos `meta` El objeto debe seguir este patrón:

```text
<Level>/<Category>/<Component>
```

- **Nivel**: plural en mayúscula (p. ej., `Atoms`, `Molecules`).
- **Categoría**: agrupación funcional (p. ej., `Forms`, `Navigation`, `Display`, `Feedback`).
- **Componente**: nombre del componente PascalCase (por ejemplo, `ForgeButton`).

**Ejemplo (`forge-button.stories.tsx`):**

```tsx
const meta = {
  title: 'Atoms/Display/ForgeButton',
  component: Button,
  // ...
};
```

## Estándares de creación

1. **Neutralidad del marco**: nunca separe el autor Vue y React versiones. Usar `@mission-platform/forge`.
2. **Nombre**: Los componentes deben usar el `Base` prefijo (por ejemplo, `ForgeCard`) a menos que sean implementaciones específicas.
3. **Seguridad de tipos**: Exportar un `*Properties` interfaz para los accesorios del componente.
4. **Pruebas**: una ubicación compartida `.spec.ts` Se requiere para cada componente.
5. **Andamios**: Utilice el `scaffold_component` Herramienta MCP para garantizar la estructura de directorios y el texto estándar correctos.

```bash
# Example: Creating a new 'forge-chip' atom in the 'components' package
scaffold_component(name="forge-chip", level="atom", area="Display", package="components", apply=true)
```

## Guías relacionadas

- [Desarrollo de paquetes](package-development.md)
- [Autoría componible](composable-authoring.md)
- [Creación de tiendas](store-authoring.md)
- [Autoría de utilidades](util-authoring.md)

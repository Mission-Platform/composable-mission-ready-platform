# Desarrollo de paquetes

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> Fuente en inglés: [docs/package-development.md](../../package-development.md)
> Idioma: Español (es)

Esta guía describe cómo crear, desarrollar y publicar paquetes reutilizables dentro del monorepo de Mission Platform.
Los paquetes son los componentes básicos de la plataforma y residen en el `packages/` directorio y administrado a través de
pnpm espacios de trabajo y Turborepo.

## Creando un nuevo paquete

La forma recomendada de crear un paquete es utilizar la herramienta MCP Mission Platform Developer, que garantiza que todos
Las configuraciones, scripts y estructuras de carpetas siguen los estándares de la plataforma.

### 1. Andamio con MCP

Utilice el `scaffold_package` herramienta para generar el esqueleto.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

Esto genera una convención compatible `packages/date-utils/` directorio con:

- `package.json` con scripts listos para el espacio de trabajo y configuraciones compartidas.
- `tsconfig.json` ampliando los valores predeterminados de la plataforma.
- `vite.config.ts` para compilaciones optimizadas.
- `src/index.ts` lima de barril.
- `llms.txt` para documentación asistida por IA.

### 2. Configuración manual (opcional)

Si no está utilizando la herramienta MCP, asegúrese de que su `package.json` utiliza [pnpm catálogos](https://pnpm.io/catalogs) para
gestión de dependencias y sigue la convención de nomenclatura de ámbito:

```json
{
  "name": "@mission-platform/your-package-name",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "pnpm exec turbo run build --filter @mission-platform/your-package-name",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --check ."
  },
  "devDependencies": {
    "@mission-platform/eslint-config": "workspace:*",
    "@mission-platform/prettier-config": "workspace:*"
  }
}
```

## Estructura del paquete

Cada paquete sigue un estricto diseño interno. Las unidades de código (componentes, elementos componibles, tiendas o utilidades) DEBEN residir en
sus propios subdirectorios con nombre y pruebas ubicadas conjuntamente.

```text
packages/<name>/
├── src/
│   ├── components/                 # Atomic components (atoms, molecules, etc.)
│   │   ├── atoms/
│   │   │   └── forge-button/        # forge-button.tsx + .stories.tsx + .spec.ts
│   │   └── index.ts                # Component re-exports
│   ├── composables/
│   │   └── use-date-format/        # use-date-format.ts + .spec.ts
│   ├── stores/
│   │   └── date-store/             # date-store.ts + .spec.ts
│   ├── utils/
│   │   └── date-validator/         # date-validator.ts + .spec.ts
│   ├── locales/                    # i18n JSON files
│   └── index.ts                    # Package public API (barrel)
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Flujo de trabajo de desarrollo

### Reglas de creación

1. **TypeScript En todas partes**: todo el código fuente debe estar en `.ts` o `.tsx` (usando `@mission-platform/forge`).
2. **Neutralidad del marco**: favorecer la lógica independiente del marco. Los componentes deben crearse una vez en Forge JSX para apuntar
   múltiples marcos.
3. **Aislamiento**: los paquetes nunca deben importarse desde `apps/`.
4. **Pruebas**: Cada unidad (componible, tienda, utilidad, componente) DEBE tener una ubicación compartida `.spec.ts` archivo.

Para obtener instrucciones de creación detalladas, consulte:

- [Diseño de componentes atómicos](atomic-component-design.md)
- [Autoría componible](composable-authoring.md)
- [Creación de tiendas](store-authoring.md)
- [Autoría de utilidades](util-authoring.md)

### Edificio

Construya el paquete usando Turbo para garantizar que las dependencias se creen en el orden correcto:

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### Pruebas

Ejecutar pruebas usando Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

## Documentación (`llms.txt`)

Cada paquete incluye un `llms.txt` archivo en su raíz. Este archivo proporciona una descripción técnica concisa del
API, componentes y comportamiento del paquete, lo que permite a los asistentes de IA comprender y utilizar mejor el paquete.

- **Título**: utilice el nombre del paquete con ámbito.
- **Componentes/APIs**: Tabla o lista de símbolos disponibles con sus accesorios y responsabilidades.
- **Ejemplos**: fragmentos de código cortos para casos de uso comunes.

## Publicación

La Plataforma de la Misión utiliza [Conjuntos de cambios](https://github.com/changesets/changesets) para versionar y publicar.

1. **Agregar un conjunto de cambios**: Después de realizar cambios, ejecute:
```bash
   pnpm changeset
   ```
   Seleccione el paquete y el tipo de cambio (parche, menor, mayor).
2. **Confirmar el conjunto de cambios**: confirma el conjunto de cambios generado. `.changeset/*.md` archivo.
3. **Versión y publicación**: CI/CD maneja la publicación real, pero puedes obtener una vista previa de las versiones localmente con:
```bash
   pnpm changeset version
   ```

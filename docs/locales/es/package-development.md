# Desarrollo de paquetes

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/package-development.md: [docs/package-development.md](../../package-development.md)
> Idioma: Español (es)

Esta guía describe cómo crear, desarrollar y publicar paquetes reutilizables dentro del monorepo de Mission Platform.
Los paquetes son los componentes básicos de la plataforma, residen en el directorio `packages/` y se administran a través de
pnpm espacios de trabajo y Turborepo.

## Creando un nuevo paquete

La forma recomendada de crear un paquete es utilizar la herramienta MCP Mission Platform Developer, que garantiza que todos
Las configuraciones, scripts y estructuras de carpetas siguen los estándares de la plataforma.

### 1. Andamio con MCP

Utilice la herramienta `scaffold_package` para generar el esqueleto.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

Esto genera un directorio `packages/date-utils/` compatible con la convención con:

- `package.json` con scripts listos para el espacio de trabajo y configuraciones compartidas.
- `tsconfig.json` ampliando los valores predeterminados de la plataforma.
- `vite.config.ts` para compilaciones optimizadas.
- Lima de cañón `src/index.ts`.
- `llms.txt` para documentación asistida por IA.

### 2. Configuración manual (opcional)

Si no está utilizando la herramienta MCP, asegúrese de que su `package.json` utilice [pnpm catálogos](https://pnpm.io/catalogs) para
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

Cada paquete sigue un estricto diseño interno. Las unidades de código (componentes, elementos componibles, almacenes o utilidades) DEBEN residir en
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
├── docs/                           # Package-owned guides and generated API reference
│   └── reference/generated/        # Regenerated during prebuild
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Flujo de trabajo de desarrollo

### Reglas de creación

1. **TypeScript En todas partes**: Todo el código fuente debe estar en `.ts` o `.tsx` (usando `@mission-platform/forge`).
2. **Neutralidad del marco**: favorecer la lógica independiente del marco. Los componentes deben crearse una vez en Forge JSX para apuntar
   múltiples marcos.
3. **Aislamiento**: Los paquetes nunca deben importarse desde `apps/`.
4. **Prueba**: Cada unidad (composable, store, util, componente) DEBE tener un archivo `.spec.ts` ubicado en el mismo lugar.

Para obtener instrucciones de creación detalladas, consulte:

- [Diseño de componentes atómicos](atomic-component-design.md)
- [Autoría componible](composable-authoring.md)
- [Creación de tiendas](store-authoring.md)
- [Autoría de utilidades](util-authoring.md)

### Edificio

Compile el paquete utilizando Turbo para garantizar que las dependencias se creen en el orden correcto:

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### Pruebas

Ejecute pruebas usando Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### Paquetes de enrutador y destinos de componentes web

Utilice `@mission-platform/router` para destinos de ruta estructurados, asistentes de URL puros y marcadores de compilador neutrales. Compartido
Los paquetes no deben definir ni registrar rutas de aplicaciones. Las aplicaciones seleccionan un destino de enrutador Forge independientemente de
su objetivo de interfaz de usuario, conserva la propiedad de los registros de ruta nativos y las instancias de enrutador, y vincula cualquier tiempo de ejecución específico del objetivo
contexto durante el arranque. Los objetivos iniciales son `@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood` y `-web-components`; Las combinaciones de capacidades no admitidas deben seguir siendo diagnósticos del compilador.

Para un paquete o aplicación sin marco, seleccione la condición Forge Web Components en las configuraciones de compilación y TypeScript:

```ts
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default {
  resolve: { conditions: frameworkResolveConditions("web-component") },
};
```

Para aplicaciones de componentes web, importe el tiempo de ejecución desde `@mission-platform/forge-router-web-components/runtime`, llame
`registerRouterElements()` una vez, llame a `setForgeRouter(appRouter)` después de crear el enrutador propiedad de la aplicación, pase estructurado
Valores `to` como propiedades DOM y use `MpMemoryHistory` en prerenderizado/pruebas. Un paquete que agrega un enrutador reutilizable
elemento o cambios en el comportamiento de los componentes web deben agregar una historia neutral en `src/**/*.stories.ts` e incluir el destino en
el banco de trabajo Storybook de componentes web.

## Documentación (`llms.txt`)

Cada paquete incluye un archivo `llms.txt` en su raíz. Este archivo proporciona una descripción técnica concisa del
API, componentes y comportamiento del paquete, lo que permite a los asistentes de IA comprender y utilizar mejor el paquete.

- **Título**: utilice el nombre del paquete con ámbito.
- **Componentes/APIs**: Tabla o lista de símbolos disponibles con sus accesorios y responsabilidades.
- **Ejemplos**: fragmentos de código cortos para casos de uso comunes.

## Propiedad de la documentación del paquete

La instalación, el uso, las limitaciones, los flujos de trabajo de los contribuyentes y las páginas de referencia de API específicas del paquete pertenecen al
directorio `docs/` del paquete, no en el árbol `docs/` de todo el repositorio. El sitio de documentos ingiere estos archivos directamente y
los publica bajo un espacio de nombres de paquete estable como `/packages/barcode/index` o `/configs/eslint-config/index`.
Los conceptos de todo el proyecto, la arquitectura, los flujos de trabajo del espacio de trabajo y la solución de problemas entre paquetes permanecen en la raíz `docs/`.

Las páginas API generadas se encuentran en `docs/reference/generated/` y se actualizan mediante el gancho del paquete `prebuild`; no editar
esos archivos manualmente. Para obtener una vista previa de la documentación del paquete a través del sitio, ejecute la compilación de la aplicación de documentos o use el espacio de trabajo completo
extractor descrito en la aplicación de documentos README.

## Publicación

La Plataforma de la Misión utiliza [Conjuntos de cambios](https://github.com/changesets/changesets) para control de versiones y publicación.

1. **Agregar un conjunto de cambios**: Después de realizar cambios, ejecute:
```bash
   pnpm changeset
   ```
   Seleccione el paquete y el tipo de cambio (parche, menor, mayor).
2. **Confirmar el conjunto de cambios**: confirma el archivo `.changeset/*.md` generado.
3. **Versión y publicación**: CI/CD maneja la publicación real, pero puedes obtener una vista previa de las versiones localmente con:
```bash
   pnpm changeset version
   ```

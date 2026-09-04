# Configuración de desarrollo

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/development-setup.md: [docs/development-setup.md](../../development-setup.md)
> Idioma: Español (es)

Esta guía proporciona un tutorial paso a paso para configurar su entorno local para contribuir a Mission Platform.
Al final de esta guía, tendrá un monorepo funcional y podrá ejecutar las herramientas de desarrollo.

## Requisitos previos

Antes de clonar el repositorio, asegúrese de que su sistema cumpla con los siguientes requisitos.

### Requisitos del sistema

| Herramienta | Versión requerida | Propósito |
| :---------- | :--------------- | :---------------------------------------------- |
| **Node.js** | `24.19.0`        | Entorno de ejecución (LTS activo) |
| **pnpm**    | `11.21.0`        | Gestor de paquetes y orquestador del espacio de trabajo |
| **Git** | Último establo | Control de versiones |
| **Óxido** | Cadena de herramientas estable | Desarrollo de referencia de Rust independiente opcional |
| **Acoplador** | Último establo | Requerido sólo para la compilación Emscripten Hunspell |

### Gestión de versiones (recomendado)

Recomendamos usar **nvm** (Node Administrador de versiones) para asegurarse de que está utilizando la versión correcta. NodeVersión .js especificada en el
raíz `.nvmrc` archivo.

```bash
nvm install
nvm use
```

Permitir **pnpm** usando Corepack:

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

## Configuración inicial

Siga estos pasos para inicializar el monorepo en su máquina.

### 1. Clonar el repositorio

```bash
git clone git@github.com:Mission-Platform/composable-mission-ready-platform.git
cd composable-mission-ready-platform
```

### 2. Instalar dependencias

Instale todas las dependencias del espacio de trabajo y configure los ganchos de git:

```bash
pnpm install
```

Este comando desencadena el `prepare` script, que inicializa **Husky** para confirmar linting y garantiza que todos los internos
Los enlaces del paquete están establecidos correctamente.

### 3. Verificar la instalación

Ejecute una prueba de humo para garantizar que el sistema de compilación y el entorno estén configurados correctamente:

```bash
pnpm exec turbo run build --filter @mission-platform/forge-jsx...
```

El `...` También construye las dependencias de Forge requeridas por el paquete. el
el escáner de código neutral se compila a partir de su gráfico Forge Web Script; no lo hace
requieren un óxido o `wasm-pack` paso de construcción.

## Flujo de trabajo de desarrollo

Mission Platform utiliza **Turborepo** para organizar tareas entre aplicaciones y paquetes.

### Desarrollo de componentes (libro de cuentos)

Storybook es el banco de trabajo principal para construir y probar componentes de forma aislada. Puede apuntar a marcos específicos
usando variables de entorno:

```bash
# Start Vue 3 Storybook
pnpm storybook:vue

# Start React Storybook
pnpm storybook:react

# Start Svelte Storybook
pnpm storybook:svelte

# Start Solid Storybook
pnpm storybook:solid

# Start Web Components Storybook
pnpm storybook:web-component
```

Los cinco modos utilizan el mismo inventario de historia neutral. Para validar cada estática.
banco de trabajo construido en una sola pasada:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

Los paquetes respaldados por Forge publican coincidencias `mp:vue`, `mp:react`, `mp:svelte`,
`mp:solid`, y `mp:web-component` condiciones. La condición activa debe ser
configurado por el paquete consumidor; ver [la referencia del compilador](../../../packages/tooling/vite/forge/docs/locales/es/reference/compiler.md)
para el complemento de destino y la canalización de declaración.

### Desarrollo de aplicaciones

Para iniciar una aplicación específica en modo de desarrollo:

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

La aplicación normalmente estará disponible en `http://localhost:5173`.

### Comandos comunes

| Tarea | Comando | Descripción |
| :--------- | :------------ | :----------------------------- |
| **Construir** | `pnpm build`  | Cree todas las aplicaciones y paquetes |
| **Prueba** | `pnpm test`   | ejecutar todo Vitest suites |
| **Pelusa** | `pnpm lint`   | Correr ESLint a través del monorepo |
| **Formato** | `pnpm format` | Verifique el formato con Prettier |

## Solución de problemas

### Borrar cachés

Si encuentra errores de compilación inesperados, borre Turborepo y Node cachés:

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### Fallos de compilación de WASM

Si un artefacto de Forge Web Script no se puede compilar, inspeccione los diagnósticos del compilador
y verificar el perfil de enlace estático o dinámico seleccionado. El
`@mission-platform/hunspell` La compilación de Emscripten también requiere que Docker
estar corriendo.

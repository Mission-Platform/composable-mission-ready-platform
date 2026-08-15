# Paquetes de configuración

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> Fuente en inglés: [docs/configs/index.md](../../../configs/index.md)
> Idioma: Español (es)

La Mission Platform utiliza paquetes de configuración centralizados en el `configs/` directorio para garantizar la coherencia entre
el monorepo.

## Descripción general

La centralización de configuraciones permite una única fuente de verdad para las reglas de herramientas, los procesos de compilación y el estilo del código.
Los paquetes y aplicaciones consumen estas configuraciones extendiéndolas en sus archivos de configuración locales.

## Resumen del paquete

| Paquete | Propósito | Superficie de configuración primaria |
|:---|:---|:---|
| [`@mission-platform/eslint-config`](eslint-config.md) | Departamento ESLint reglas para JS/TS y Vue. | `eslint.config.js` |
| `@mission-platform/prettier-config` | Valores predeterminados de formato del repositorio. | `prettier.config.mjs` |
| `@mission-platform/typescript-config` | TypeScript ajustes preestablecidos del compilador. | `tsconfig.json` |
| `@mission-platform/stylelint-config` | Linting CSS y SCSS. | `stylelint.config.mjs` |
| `@mission-platform/vite-config` | Vite y Vitest ayudantes de configuración. | `vite.config.ts` |
| `@mission-platform/tsdown-config` | Ayudantes de agrupación de bibliotecas. | `tsdown.config.ts` |
| `@mission-platform/postcss-config` | Tubería PostCSS compartida. | `postcss.config.mjs` |
| `@mission-platform/i18n-config` | Configuración local y de extracción compartida. | `i18next.config.ts` |
| `@mission-platform/storybook-framework` | Marco preestablecido de Storybook seleccionado por el entorno. | `.storybook/main.ts` |
| [Configuración de trabajadores](workers-config.md) | Convenciones de trabajadores de Cloudflare. | `wrangler.jsonc` |

## Herramientas centrales

### ESLint (`@mission-platform/eslint-config`)

Estandariza las reglas de calidad del código en todos los espacios de trabajo. Utiliza el formato Flat Config e incluye soporte para
TypeScript, Vue 3, y accesibilidad.

### Prettier (`@mission-platform/prettier-config`)

Impone un estilo de código consistente (tabulaciones, comillas, punto y coma) en todo el monorepo.

### TypeScript (`@mission-platform/typescript-config`)

Proporciona base `tsconfig` ajustes preestablecidos para diferentes objetivos:

- `base`: Valores predeterminados generales.
- `vue`: Optimizado para Vue 3 SFC.
- `node`: Optimizado para Nodeentornos .js.
- `framework-<name>`: Agrega la coincidencia `mp:<framework>` condición de exportación para los consumidores externos.

## Sistema de construcción

### Vite (`@mission-platform/vite-config`)

Proporciona funciones de fábrica para crear Vite Configuraciones tanto para aplicaciones como para bibliotecas.

```ts
import { defineAppConfig, defineLibraryConfig } from '@mission-platform/vite-config';
```

- `defineAppConfig`: Para aplicaciones de primer nivel (SPA, trabajadores).
- `defineLibraryConfig`: Para paquetes compartidos con agrupación y sacudida de árboles óptima.

### PublicarCSS (`@mission-platform/postcss-config`)

Comparte la canalización del complemento PostCSS (incluido Autoprefixer) para garantizar que CSS se procese de manera consistente independientemente de dónde
está escrito.

## Patrón de uso

Para utilizar una configuración en un espacio de trabajo:

1. Agregue el paquete de configuración como `devDependency` en `package.json`.
2. Cree un archivo de configuración local (por ejemplo, `eslint.config.js`).
3. Importe y exporte/extienda la configuración base.

```js
// Example: eslint.config.js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // local overrides
];
```

## Elegir una configuración

Utilice el paquete propietario de la preocupación en lugar de copiar reglas en un espacio de trabajo. Archivos de compilación de aplicaciones y bibliotecas
puede agregar anulaciones locales, pero los valores predeterminados compartidos deben permanecer en `configs/`. Para un nuevo paquete, comience con el paquete
scaffold y luego ejecute las comprobaciones del espacio de trabajo:

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```

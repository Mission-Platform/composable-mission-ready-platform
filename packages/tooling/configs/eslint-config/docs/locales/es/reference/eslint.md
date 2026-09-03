# ESLint Configuración

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/tooling/configs/eslint-config/docs/reference/eslint.md: [packages/tooling/configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> Idioma: Español (es)

El `@mission-platform/eslint-config` El paquete proporciona un plano centralizado. ESLint configuración para todo el monorepo.

## Descripción general

La Plataforma de la Misión utiliza el ESLint Formato de configuración plana (`eslint.config.js`). La configuración compartida impone coherencia
calidad del código, accesibilidad y reglas arquitectónicas en todos los paquetes, aplicaciones y trabajadores.

## Características clave

- **TypeScript Soporte**: linting con reconocimiento de tipo impulsado por `typescript-eslint`.
- **Vue 3 SFC**: Hace cumplir `<script setup>` y mejores prácticas a través de `eslint-plugin-vue`.
- **Accesibilidad**: comprobaciones de accesibilidad integradas para Vue plantillas con `eslint-plugin-vuejs-accessibility`.
- **Organización de Importaciones**: Clasificación y validación automática de importaciones vía `eslint-plugin-import-x`.
- **Conciencia Monorepo**: Integración con `eslint-config-turbo` para garantizar que las variables de entorno se declaren correctamente.

## Complementos integrados

La configuración incluye los siguientes complementos y conjuntos de reglas:

| Complemento              | Propósito                                                           |
| :----------------------- | :------------------------------------------------------------------ |
| `typescript-eslint`      | Estándar TypeScript reglas y linting con reconocimiento de tipo.    |
| `eslint-plugin-vue`      | Vue 3 Linting SFC y validación de plantillas.                       |
| `eslint-plugin-sonarjs`  | Detección de olores de código y riesgos de errores.                 |
| `eslint-plugin-unicorn`  | Docenas de reglas comunitarias pequeñas y útiles.                   |
| `eslint-plugin-i18next`  | Garantiza que las claves de traducción se utilicen correctamente.   |
| `eslint-config-prettier` | Desactiva las reglas que entran en conflicto con Prettier formateo. |

## Uso

Para aplicar la configuración compartida a un espacio de trabajo, cree un `eslint.config.js` archivo en la raíz del espacio de trabajo:

```js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // Add workspace-specific overrides here
];
```

## Ejecutando el Linter

Utilice Turborepo para ejecutar linting en uno o más espacios de trabajo:

```bash
# Lint the entire monorepo
pnpm exec turbo run lint

# Lint a specific package
pnpm exec turbo run lint --filter <package-name>

# Automatically fix fixable issues
pnpm exec turbo run lint:fix
```

# Configuración ESLint

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/tooling/configs/eslint-config/docs/reference/eslint.md: [packages/tooling/configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> Idioma: Español (es)

El paquete `@mission-platform/eslint-config` proporciona una configuración ESLint plana y centralizada para todo el monorepo.

## Descripción general

Mission Platform utiliza el formato ESLint Flat Config (`eslint.config.js`). La configuración compartida impone coherencia
calidad del código, accesibilidad y reglas arquitectónicas en todos los paquetes, aplicaciones y trabajadores.

## Características clave

- **Soporte TypeScript**: Linting con reconocimiento de tipo impulsado por `typescript-eslint`.
- **Vue 3 SFC**: aplica `<script setup>` y las mejores prácticas a través de `eslint-plugin-vue`.
- **Accesibilidad**: comprobaciones de accesibilidad integradas para plantillas Vue con `eslint-plugin-vuejs-accessibility`.
- **Organización de Importaciones**: Clasificación y validación automática de importaciones vía `eslint-plugin-import-x`.
- **Conocimiento de Monorepo**: Integración con `eslint-config-turbo` para garantizar que las variables de entorno se declaren correctamente.

## Complementos integrados

La configuración incluye los siguientes complementos y conjuntos de reglas:

| Complemento | Propósito |
| :----------------------- | :----------------------------------------------------- |
| `typescript-eslint` | Reglas estándar TypeScript y linting con reconocimiento de tipo.      |
| `eslint-plugin-vue` | Vue 3 Linting SFC y validación de plantillas.             |
| `eslint-plugin-sonarjs` | Detección de olores de código y riesgos de errores.                |
| `eslint-plugin-unicorn` | Docenas de reglas comunitarias pequeñas y útiles.               |
| `eslint-plugin-i18next` | Garantiza que las claves de traducción se utilicen correctamente.           |
| `eslint-config-prettier` | Deshabilita las reglas que entran en conflicto con el formato Prettier. |

## Mecanografía estricta y cumple con las reglas

El `missionTypeScriptPlugin` personalizado proporciona comprobaciones rápidas de sintaxis AST que hacen cumplir los estrictos estándares de escritura de Mission Platform:

| Regla | Gravedad | Propósito |
| :--------------------------------------------- | :------------------------------ | :------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-explicit-any` | `error` (`warn` para `**/*.vue`) | Prohíbe la palabra clave `any` en el código TypeScript (`error`), y `warn` se aplica a las plantillas SFC Vue. |
| `@typescript-eslint/prefer-satisfies` | `warn` | Recomienda aserciones `satisfies` sobre `as` para preservar literales estrechos y prohíbe estrictamente `as any`.  |
| `@typescript-eslint/no-unconstrained-generics` | `warn` | Requiere que todos los parámetros de tipo genérico declaren una restricción `extends`.                                 |
| `@typescript-eslint/no-implicit-unknown` | `warn` | No permite la filtración de `unknown` no validado a través de los límites de API exportados.                                  |
| `@typescript-eslint/consistent-type-imports` | `error` | Exige declaraciones `import type` de nivel superior para importaciones de solo tipo.                                     |

## Uso

Para aplicar la configuración compartida a un espacio de trabajo, cree un archivo `eslint.config.js` en la raíz del espacio de trabajo:

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

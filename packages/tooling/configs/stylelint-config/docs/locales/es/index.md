# @mission-platform/stylelint-config

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> Idioma: Español (es)

Compartido Stylelint reglas para CSS y SCSS en Mission Platform.

## Instalar y usar

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

Los espacios de trabajo con estilos usan un archivo ESM local `stylelint.config.mjs`. Importa y distribuye la configuración compartida en lugar de duplicar sus entradas `extends`:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

La configuración compartida extiende `stylelint-config-standard-scss` y `stylelint-config-recommended-vue`. Usa `postcss-html` de forma predeterminada, `postcss-scss` para `**/*.scss` y `postcss-html` para bloques de estilo Vue. Añade las dependencias directas de soporte con versiones `catalog:stylelint` y el paquete de configuración compartida con `workspace:*` en `devDependencies`.

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

Extender el paquete desde el espacio de trabajo. `stylelint.config.mjs`. Mantener componente
estilos cercanos a su componente y usan anulaciones locales solo para un documento
restricción del espacio de trabajo.

## Contribuir

Correr `pnpm --filter @mission-platform/stylelint-config lint` y
`pnpm --filter @mission-platform/stylelint-config format`. Cambios en las reglas de prueba
contra el paquete SCSS y los estilos de aplicación.

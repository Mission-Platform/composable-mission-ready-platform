# @mission-platform/stylelint-config

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> Idioma: Español (es)

Reglas Stylelint compartidas para CSS y SCSS en Mission Platform.

## Instalar y usar

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

Los espacios de trabajo con estilo utilizan un `stylelint.config.mjs` local de espacio de trabajo en ESM
formato. Importe y difunda la configuración compartida en lugar de duplicarla.
`extends` entradas:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

La configuración compartida extiende `stylelint-config-standard-scss` y
`stylelint-config-recommended-vue`. Utiliza `postcss-html` por defecto, utiliza
`postcss-scss` para `**/*.scss` y utiliza `postcss-html` para Vue estilo SFC
bloques. Esto admite estilos CSS, SCSS y Vue sin espacios de trabajo específicos.
configuración de sintaxis.

Agregue las dependencias de soporte directo anteriores al espacio de trabajo
`devDependencies` usando las versiones `catalog:stylelint`, junto con el
paquete de configuración compartido usando `workspace:*`. Agregue guiones que cubran el
fuentes de estilo del espacio de trabajo, por ejemplo:

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

Mantenga los estilos de los componentes cerca de sus componentes y utilice anulaciones locales solo para
una limitación documentada del espacio de trabajo.

## Contribuir

Ejecute `pnpm --filter @mission-platform/stylelint-config lint` y
`pnpm --filter @mission-platform/stylelint-config format`. Cambios en las reglas de prueba
contra el paquete SCSS y los estilos de aplicación.

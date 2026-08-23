# @mission-platform/eslint-config

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> configs/eslint-config/docs/index.md: [configs/eslint-config/docs/index.md](../../index.md)
> Idioma: Español (es)

Piso compartido ESLint configuración para los espacios de trabajo de Mission Platform.

## Instalar y usar

Agregue el paquete a las dependencias de desarrollo de un espacio de trabajo y extienda el plano
configuración desde `eslint.config.js`:

```bash
pnpm add --save-dev @mission-platform/eslint-config
```

```js
import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig];
```

El paquete incluye TypeScript, Vue 3, accesibilidad, importación, Turbo, y
integraciones de formato. Agregue reglas específicas del espacio de trabajo solo para comportamientos que
no se puede compartir. Ver [el ESLint referencia](reference/eslint.md) para el
Incluye complementos y comandos.

## Contribuir

Correr `pnpm --filter @mission-platform/eslint-config lint` y
`pnpm --filter @mission-platform/eslint-config format` después de cambiar las reglas.
Mantenga el paquete consciente del marco pero independiente del espacio de trabajo; las aplicaciones deben
No importar reglas desde otro espacio de trabajo.

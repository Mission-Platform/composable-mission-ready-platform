# @mission-platform/typescript-config

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/tooling/configs/typescript-config/docs/index.md: [packages/tooling/configs/typescript-config/docs/index.md](../../index.md)
> Idioma: Español (es)

Ajustes preestablecidos de TypeScript compartidos para cada espacio de trabajo de Mission Platform.

## Instalar y usar

```bash
pnpm add --save-dev @mission-platform/typescript-config
```

Amplíe el ajuste preestablecido coincidente de `tsconfig.json`: use `app` para aplicaciones Vue,
`react` para aplicaciones React, `library` para declaraciones de paquetes, `node` para herramientas,
y `test` para las especificaciones Vitest. Los consumidores del marco también deberían utilizar la combinación
`framework-<name>` preajuste de condición personalizada. Consulte el paquete README para conocer
tabla preestablecida completa y ejemplos.

## Contribuir

Mantenga indicadores del compilador compartidos en los ajustes preestablecidos. correr
`pnpm --filter @mission-platform/typescript-config build:check` y formato
controles después de cambiar uno.

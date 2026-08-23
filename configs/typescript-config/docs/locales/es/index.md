# @mission-platform/typescript-config

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> configs/typescript-config/docs/index.md: [configs/typescript-config/docs/index.md](../../index.md)
> Idioma: Español (es)

Compartido TypeScript ajustes preestablecidos para cada espacio de trabajo de Mission Platform.

## Instalar y usar

```bash
pnpm add --save-dev @mission-platform/typescript-config
```

Ampliar el ajuste preestablecido coincidente desde `tsconfig.json`: usar `app` para Vue aplicaciones,
`react` para React aplicaciones, `library` para declaraciones de paquetes, `node` para herramientas,
y `test` para Vitest especificaciones. Los consumidores del marco también deberían utilizar la combinación
`framework-<name>` preajuste de condición personalizada. Consulte el paquete README para conocer
tabla preestablecida completa y ejemplos.

## Contribuir

Mantenga indicadores del compilador compartidos en los ajustes preestablecidos. Correr
`pnpm --filter @mission-platform/typescript-config build:check` y formato
controles después de cambiar uno.

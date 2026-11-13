# @mission-platform/vite-config

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/tooling/configs/vite-config/docs/index.md: [packages/tooling/configs/vite-config/docs/index.md](../../index.md)
> Idioma: Español (es)

Ayudantes de configuración Vite y Vitest compartidos para paquetes de Mission Platform y
aplicaciones.

## Instalar y usar

```bash
pnpm add --save-dev @mission-platform/vite-config
```

Utilice `defineLibraryConfig` para paquetes, `defineAppConfig` para aplicaciones y
`defineVitestConfig` de la subruta `/vitest`. Las aplicaciones marco deben
seleccione una condición `defineFrameworkAppConfig` y luego importe paquetes compartidos
a través de sus especificadores de paquetes básicos.

## Contribuir

Ejecute `pnpm --filter @mission-platform/vite-config lint` y verifique el formato. mantener
Los valores predeterminados del asistente son reutilizables y preservan el Vite, PostCSS y
Comportamiento de externalización descrito en el paquete README.

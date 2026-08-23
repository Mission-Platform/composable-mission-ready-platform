# @mission-platform/vite-config

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> configs/vite-config/docs/index.md: [configs/vite-config/docs/index.md](../../index.md)
> Idioma: Español (es)

Compartido Vite y Vitest asistentes de configuración para paquetes de Mission Platform y
aplicaciones.

## Instalar y usar

```bash
pnpm add --save-dev @mission-platform/vite-config
```

Usar `defineLibraryConfig` para paquetes, `defineAppConfig` para aplicaciones, y
`defineVitestConfig` desde `/vitest` subruta. Las aplicaciones marco deben
seleccione uno `defineFrameworkAppConfig` condición y luego importar paquetes compartidos
a través de sus especificadores de paquetes básicos.

## Contribuir

Correr `pnpm --filter @mission-platform/vite-config lint` y comprobaciones de formato. mantener
Los valores predeterminados del ayudante son reutilizables y preservan el compartido. Vite, PostCSS y
Comportamiento de externalización descrito en el paquete README.

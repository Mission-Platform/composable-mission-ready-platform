# @mission-platform/postcss-config

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/tooling/configs/postcss-config/docs/index.md: [packages/tooling/configs/postcss-config/docs/index.md](../../index.md)
> Idioma: Español (es)

Canalización PostCSS compartida utilizada por las hojas de estilo de Mission Platform.

## Instalar y usar

```bash
pnpm add --save-dev @mission-platform/postcss-config
```

Haga referencia al paquete desde el espacio de trabajo. `postcss.config.mjs` en lugar de
duplicar la canalización de complementos compartidos. Las anulaciones locales pertenecen a ese
configuración del espacio de trabajo.

## Contribuir

Correr `pnpm --filter @mission-platform/postcss-config lint` y
`pnpm --filter @mission-platform/postcss-config format`. Mantener navegador
Comportamiento de compatibilidad en este paquete y evitar complementos específicos de la aplicación.

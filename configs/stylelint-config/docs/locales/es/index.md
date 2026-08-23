# @mission-platform/stylelint-config

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> configs/stylelint-config/docs/index.md: [configs/stylelint-config/docs/index.md](../../index.md)
> Idioma: Español (es)

Compartido Stylelint reglas para CSS y SCSS en Mission Platform.

## Instalar y usar

```bash
pnpm add --save-dev @mission-platform/stylelint-config
```

Extender el paquete desde el espacio de trabajo. `stylelint.config.mjs`. Mantener componente
estilos cercanos a su componente y usan anulaciones locales solo para un documento
restricción del espacio de trabajo.

## Contribuir

Correr `pnpm --filter @mission-platform/stylelint-config lint` y
`pnpm --filter @mission-platform/stylelint-config format`. Cambios en las reglas de prueba
contra el paquete SCSS y los estilos de aplicación.

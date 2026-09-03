# @mission-platform/prettier-config

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/tooling/configs/prettier-config/docs/index.md: [packages/tooling/configs/prettier-config/docs/index.md](../../index.md)
> Idioma: Español (es)

Valores predeterminados de formato del repositorio compartidos por paquetes y aplicaciones.

## Instalar y usar

```bash
pnpm add --save-dev @mission-platform/prettier-config
```

Exporte la configuración compartida desde el espacio de trabajo. `prettier.config.js`.
Utilice anulaciones locales con moderación para que Markdown, TypeScript, Vuey configuración
Los archivos permanecen consistentes en todo el monorepo.

## Contribuir

Correr `pnpm --filter @mission-platform/prettier-config format` después de cambiar el
configuración. Los cambios deben aplicarse de manera consistente a cada espacio de trabajo que utilice
el paquete.

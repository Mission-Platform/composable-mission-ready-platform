# @mission-platform/tsdown-config

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> configs/tsdown-config/docs/index.md: [configs/tsdown-config/docs/index.md](../../index.md)
> Idioma: Español (es)

Ayudantes compartidos de creación de biblioteca tsdown para espacios de trabajo publicables.

## Instalar y usar

```bash
pnpm add --save-dev @mission-platform/tsdown-config
```

Usar el paquete desde un espacio de trabajo `tsdown.config.ts` y mantener puntos de entrada,
dependencias externas y restricciones de salida locales para el paquete que se está construyendo.
Las declaraciones y paquetes generados pertenecen al paquete de ese paquete. `dist/` directorio.

## Contribuir

Correr `pnpm --filter @mission-platform/tsdown-config lint` y su verificación de formato.
Preservar la salida determinista y no agregar ramas de destino específicas del marco
al ayudante de construcción neutral.

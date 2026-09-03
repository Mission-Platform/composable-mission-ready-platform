# @mission-platform/theme

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/ui/theme/docs/index.md: [packages/ui/theme/docs/index.md](../../index.md)
> Idioma: Español (es)

`@mission-platform/theme` posee la superficie del tema de escritura única extraída de `@mission-platform/components`.

## Superficie pública

- `ForgeThemeToggle` alterna las preferencias de luz, oscuridad y automática compartidas.
- `ForgeThemeProvider` configura la persistencia y expone el estado del tema a través de su accesorio de renderizado con alcance.
- `ForgeThemeComposer` controla las anulaciones de tokens `--mp-*` globales o de alcance.
- Los contratos de tiendas temáticas incluyen `getThemeSnapshot`, `subscribeTheme`, `setTheme`, `toggleTheme`, `cycleTheme` y
  `configureTheme`.
- Los contratos del compositor incluyen fusión de configuración, mutación de atributo/token, conversión de variable CSS y ayudantes de restablecimiento.

Todos los componentes y tiendas utilizan una implementación local de paquete, por lo que los consumidores de proveedor, alternador y compositor observan
los mismos contratos de tiempo de ejecución después de la compilación de Forge específica del marco.

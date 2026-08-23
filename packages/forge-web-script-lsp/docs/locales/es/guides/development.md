# Desarrollar el servidor de lenguaje Forge Web Script

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/forge-web-script-lsp/docs/guides/development.md: [packages/forge-web-script-lsp/docs/guides/development.md](../../../guides/development.md)
> Idioma: Español (es)

## Instalar y verificar

Ejecute las comprobaciones de paquetes enfocados desde la raíz del repositorio:

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp test
```

Construya con `pnpm --filter @mission-platform/forge-web-script-lsp build`. el
el resultado se emite a `dist/`; la salida local no es un artefacto fuente.

## Cambios de protocolo

Mantenga diagnósticos, rangos UTF-16, símbolos, finalización, desplazamiento y token semántico
comportamiento alineado con el paquete de servicios lingüísticos. Agregar una regresión de protocolo
accesorio para cada nueva solicitud o capacidad. El LSP actualmente no proporciona
ir a definición, referencias, renombrar, formatear, acciones de código, archivos cruzados
importaciones de idiomas o un transporte alojado en el navegador.

El servidor está basado en stdio y solo es Node. La integración del editor del navegador pertenece a
el adaptador local del paquete de servicios de idioma en lugar de este servidor.

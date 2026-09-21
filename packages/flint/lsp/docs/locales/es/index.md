# @mission-platform/flint-lsp

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/flint-lsp/docs/index.md: [packages/flint-lsp/docs/index.md](../../index.md)
> Idioma: Español (es)

El servidor stdio Language Server Protocol para Flint v1. el paquete
posee el comportamiento del espacio de trabajo y transporte de cara al editor; la semántica del lenguaje permanece
propiedad de `@mission-platform/flint`.

## Empieza aquí

- [Referencia de herramientas de lenguaje](reference/language-service.md) — diagnóstico,
  finalización, desplazamiento, tokens semánticos y límites admitidos.
- [Guía de construcción y prueba](guides/development.md) — comprobaciones del servidor local y
  accesorios de protocolo.
- [`llms.txt` en el paquete de idioma](../../../../flint/llms.txt) — núcleo
  Notas de API de idioma.

El servidor requiere Node.js `>=24.0.0` y expone `flint-lsp`
binario junto con las subrutas de los módulos `server` y `workspace`.

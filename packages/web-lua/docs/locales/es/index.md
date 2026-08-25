# @mission-platform/web-lua

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/web-lua/docs/index.md: [packages/web-lua/docs/index.md](../../index.md)
> Idioma: Español (es)

Base de tiempo de ejecución Lua de propiedad invitada compilada a partir de Forge Web Script. este paquete
posee el contrato de compatibilidad de tiempo de ejecución y su límite de capacidad de host.

## Empieza aquí

- [Referencia de compatibilidad de Lua 5.5.1](reference/compatibility.md) — probado,
  comportamiento regulado por capacidades y no resuelto.
- [Guía de construcción y prueba](guides/development.md) — dispositivos de ejecución y salida
  restricciones.
- El paquete README y la referencia generada proporcionan notas API concisas del paquete.

La entrada del navegador es `@mission-platform/web-lua`; Node los consumidores utilizan el
exportación `@mission-platform/web-lua/node` explícita. Los efectos del huésped son negados por
predeterminado y requiere una política de capacidad explícita.

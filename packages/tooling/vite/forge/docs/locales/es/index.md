# @mission-platform/vite-plugin-forge

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/tooling/vite/forge/docs/index.md: [packages/tooling/vite/forge/docs/index.md](../../index.md)
> Idioma: Español (es)

El controlador del compilador Forge, neutral en el marco de trabajo, para Vite y tsdown. este paquete
posee análisis, normalización, análisis semántico, optimización neutral, almacenamiento en caché,
despacho de objetivos y orquestación de compilación genérica; marco y salida CMS
Los paquetes poseen su reducción y generación específicas para el objetivo.

## Empieza aquí

- [Referencia de canalización del compilador](reference/compiler.md) — contratos por etapas,
  propiedad de destino, almacenamiento en caché, diagnóstico y artefactos generados.
- [Guía de construcción y prueba](guides/development.md) — desarrollo local y
  controles de integración.
- [`README.md`](../../../README.md) — configuración del consumidor y representante
  Vite/tsdown ejemplos.
- [`llms.txt`](../../../llms.txt): API de paquete conciso y notas de canalización.

El controlador requiere un `FrameworkOutputPlugin` explícito; nunca selecciona un
framework desde una cadena o importar cada paquete de destino. Los módulos generados son
artefactos intermedios y deben ser compilados por el nativo del objetivo seleccionado.
adaptador.

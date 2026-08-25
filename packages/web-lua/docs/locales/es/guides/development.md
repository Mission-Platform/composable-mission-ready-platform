# Desarrollar WebLua

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/web-lua/docs/guides/development.md: [packages/web-lua/docs/guides/development.md](../../../guides/development.md)
> Idioma: Español (es)

## Instalar y verificar

Ejecute las comprobaciones enfocadas desde la raíz del repositorio:

```bash
pnpm install
pnpm --filter @mission-platform/web-lua build:check
pnpm --filter @mission-platform/web-lua test
```

Construya con `pnpm --filter @mission-platform/web-lua build`. salida del navegador,
Salida Node y las declaraciones se emiten a `dist/` y `dist-node/`.

## Cambios de compatibilidad

Agregue evidencia determinista a nivel de invitado antes de cambiar una fila de compatibilidad.
Actualice `src/compatibility.ts`, sus pruebas y la tabla de referencia juntas.
Utilice `matched` sólo para comportamiento cubierto por un accesorio determinista;
`capability-gated` para requisitos explícitos de política de host; y `unresolved` para
comportamiento que no debe ser tratado como pasajero.

Mantenga el tiempo de ejecución como propiedad de los invitados y con capacidad denegada de forma predeterminada. Adaptadores solo Node
pertenecen detrás de la exportación `./node` y no deben filtrarse en la entrada del navegador.

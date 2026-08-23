# Desarrollar el paquete de tokens

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/tokens/docs/guides/development.md: [packages/tokens/docs/guides/development.md](../../../guides/development.md)
> Idioma: Español (es)

## Instalar y verificar

Ejecute las comprobaciones del paquete desde la raíz del repositorio:

```bash
pnpm install
pnpm --filter @mission-platform/tokens lint
pnpm --filter @mission-platform/tokens lint:style
pnpm --filter @mission-platform/tokens build
```

La compilación produce JavaScript y resultados de declaración en `dist/`. generado
Las fuentes SCSS y TypeScript bajo `src/generated/` son artefactos derivados y
debe seguir siendo determinista.

## Cambiar una ficha

Edite el JSON de origen en `tokens/` y mantenga estable su ruta DTCG a menos que
El cambio es intencional y está documentado. Los contratos de componentes se encuentran bajo
`tokens/component/<atomic-level>/`; las fuentes de los componentes no deben duplicarse
rutas de token compartidas. Utilice los scripts de generación de tokens existentes y revise ambos
Salida SCSS y TypeScript antes de publicar.

El paquete es neutral en cuanto al marco. El comportamiento del tema es seleccionado por el consumidor.
hoja de estilo a través de los puntos de entrada SCSS exportados; este paquete no es propietario
estado del tema de la aplicación o marcado del componente.

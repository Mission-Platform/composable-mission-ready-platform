# `@mission-platform/vcard`

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/integrations/vcard/docs/index.md: [packages/integrations/vcard/docs/index.md](../../index.md)
> Idioma: Español (es)

API de datos RFC 6350 vCard y RFC 5545 iCalendar compartidas para Mission Platform.

El paquete proporciona análisis y escritura de componentes/propiedades sin pérdidas.
`readICalendar`/`writeICalendar` y `readVCard`/`writeVCard`, además de Forge
renderizadores llamados `ForgeVCard` y `ForgeICalendar`. `ForgeICalendar` acepta la
resultado normalizado de `calendarEvents(readICalendar(source))` por lo que el generado
Los componentes del marco siguen siendo independientes de los módulos de ejecución del analizador.

Consulte `llms.txt` para conocer la API pública y ejemplos de uso.

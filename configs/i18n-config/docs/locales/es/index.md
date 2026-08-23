# @mission-platform/i18n-config

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> configs/i18n-config/docs/index.md: [configs/i18n-config/docs/index.md](../../index.md)
> Idioma: Español (es)

Configuración local y de extracción compartida para los espacios de trabajo de Mission Platform.

## Instalar y usar

Agregue este paquete como una dependencia de desarrollo al configurar i18next o
extracción de traducción:

```bash
pnpm add --save-dev @mission-platform/i18n-config
```

Mantenga las fuentes locales junto al espacio de trabajo al que pertenecen. Escritura de extracción
paquetes de espacios de nombres bajo el espacio de trabajo propietario `locales/<locale>/` directorio;
el comando a nivel de repositorio organiza todos los espacios de trabajo configurados.

## Contribuir

Ejecute las comprobaciones de formato y pelusa del paquete antes de publicar. No coloque el paquete o
contenido de traducción de la aplicación en este paquete de configuración.

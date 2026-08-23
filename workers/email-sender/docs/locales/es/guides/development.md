# Desarrollar el trabajador remitente de correo electrónico.

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> workers/email-sender/docs/guides/development.md: [workers/email-sender/docs/guides/development.md](../../../guides/development.md)
> Idioma: Español (es)

Ejecute las comprobaciones del paquete desde la raíz del repositorio:

```bash
pnpm --filter @mission-platform/email-sender build:check
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/email-sender build
```

Ejecute `pnpm --filter @mission-platform/email-sender types` después de cambiar
fijaciones. Agregue validación de endpoints, falla SMTP y pruebas de respuesta estable para
cambios de contrato. Mantenga el controlador de trabajadores compatible con Cloudflare y mantenga
Comportamiento exclusivo de MailPit detrás de la configuración de desarrollo local.

# @mission-platform/email-sender

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/edge/workers/email-sender/docs/index.md: [packages/edge/workers/email-sender/docs/index.md](../../index.md)
> Idioma: Español (es)

Un Cloudflare Worker solo local que acepta HTML completo y lo envía a
MailPit sobre SMTP. Este espacio de trabajo es propietario del contrato `/api/email/send` y su
Configuración de desarrollo de MailPit.

## Usar localmente

El punto final valida `{ to, recipientName, html }` y devuelve un JSON estable
resultado después del parto. Inicie MailPit, genere enlaces de trabajadores locales y luego ejecute
el trabajador:

```bash
docker run --rm --name mission-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
pnpm --filter @mission-platform/email-sender types
pnpm --filter @mission-platform/email-sender dev -- --port 8787
```

El punto final SMTP predeterminado es `127.0.0.1:1025`, con la interfaz de usuario de MailPit en
`http://localhost:8025`. Anule las variables locales Wrangler cuando utilice otra
anfitrión.

Este trabajador es un escaparate local y no es un servicio de correo de producción. nunca
coloque credenciales o secretos en la configuración Wrangler rastreada.

- [guía de desarrollo](guides/development.md)
- [`README.md`](../../../README.md)

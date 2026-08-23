# @mission-platform/email-sender

A local-only Cloudflare Worker that accepts completed HTML and sends it to
MailPit over SMTP. This workspace owns the `/api/email/send` contract and its
MailPit development configuration.

## Use locally

The endpoint validates `{ to, recipientName, html }` and returns a stable JSON
result after delivery. Start MailPit, generate local Worker bindings, then run
the Worker:

```bash
docker run --rm --name mission-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
pnpm --filter @mission-platform/email-sender types
pnpm --filter @mission-platform/email-sender dev -- --port 8787
```

The default SMTP endpoint is `127.0.0.1:1025`, with the MailPit UI at
`http://localhost:8025`. Override local Wrangler variables when using another
host.

This worker is a local showcase and is not a production mail service. Never
put credentials or secrets in tracked Wrangler configuration.

- [Development guide](guides/development.md)
- [`README.md`](../README.md)
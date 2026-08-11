# Email sender Worker

This local-only Worker accepts completed HTML from the external consumer and sends it to MailPit over SMTP. It exposes:

- `POST /api/email/send` — validates `{ to, recipientName, html }`, sends the HTML to MailPit, and returns a stable JSON result.

Start MailPit from the repository root:

```sh
docker run --rm --name mission-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
```

Then run the Worker from this package:

```sh
pnpm types
pnpm dev --port 8787
```

The default local variables are in `wrangler.jsonc`: MailPit SMTP uses `127.0.0.1:1025`, the sender address is
`showcase@mission.local`, and the MailPit UI is `http://localhost:8025`. Override these values with a local Wrangler
environment when MailPit is reachable at another host.

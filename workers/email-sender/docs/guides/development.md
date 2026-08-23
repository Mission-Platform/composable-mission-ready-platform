# Develop the email sender worker

Run the package checks from the repository root:

```bash
pnpm --filter @mission-platform/email-sender build:check
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/email-sender build
```

Run `pnpm --filter @mission-platform/email-sender types` after changing
bindings. Add endpoint validation, SMTP failure, and stable-response tests for
contract changes. Keep the Worker handler Cloudflare-compatible and keep
MailPit-only behavior behind local development configuration.
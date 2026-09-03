# External Consumer Example

This example is a local email showcase built with Mission Platform packages in a plain Vite + React project. Enter a
recipient, render and preview the canonical email in the example app, send its completed HTML through the email-sender
Worker, and inspect the delivered message in the MailPit UI.

## Local email workflow

The example owns the email component tree and calls `renderEmail`. Preview uses the resulting HTML directly, and send
passes that exact string with `{ "to": "...", "recipientName": "...", "html": "..." }` to the Worker. The Worker only
validates the completed output and sends it over SMTP, keeping SMTP configuration out of the browser.

### Start the services

From the repository root, start MailPit:

```bash
docker run --rm --name mission-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
```

In one terminal, start the Worker on `http://localhost:8787`:

```bash
pnpm --filter @mission-platform/email-sender types
pnpm --filter @mission-platform/email-sender dev --port 8787
```

In another terminal, start this example on the Vite port (normally `http://localhost:5173`):

```bash
pnpm --filter external-consumer-example dev
```

The Vite `/api` proxy forwards send requests to the Worker. MailPit receives SMTP on port `1025` and serves its inbox at
[`http://localhost:8025`](http://localhost:8025). The Worker variables are explicit in
`packages/edge/workers/email-sender/wrangler.jsonc`; set `VITE_MAILPIT_UI_URL` if the UI uses another address.

### Exercise the flow

1. Enter a recipient name and email address.
2. Select **Preview email** and confirm the contained preview updates.
3. Select **Send to MailPit** and wait for the success state.
4. Open the MailPit link and confirm the recipient, subject, and rendered HTML body.

If MailPit is unavailable, the Worker returns a `502` and the form displays an actionable error. If the Worker is not
running, the example reports the failed `/api` request; restart the Worker and try again.

## Key Configuration

### Framework Selection (Conditions)

1. **Vite (`vite.config.ts`):** We use `frameworkResolveConditions('react')` to tell Vite to pick the React-specific build from `@mission-platform/components` and proxy `/api` to the local Worker.
2. **TypeScript (`tsconfig.json`):** We extend `@mission-platform/typescript-config/framework-react` (which sets `customConditions: ["mp:react"]`) so the editor and compiler resolve to the correct types.

### Bare Imports

Because of the conditions above, we can import components using bare specifiers:

```ts
import { ForgeButton } from "@mission-platform/components";
```

### Per-Component Imports

To avoid pulling the entire barrel (and heavy optional components such as the Monaco editor and its web
workers) into the client bundle, import a single component from its per-component subpath. The subpath is
condition-aware just like the bare entry, so it resolves to just that component's compiled chunk for the
active `mp:react` condition, while types still flow from the barrel:

```ts
import { ForgeBadge } from "@mission-platform/components/atoms/forge-badge/forge-badge";
```

`src/main.tsx` demonstrates the Forge form, local email rendering, preview surface, send state, and MailPit link.

## How to Test (Local)

1. Build the packages in the monorepo root:
   ```bash
   pnpm build
   ```
2. In this directory, run typecheck and build:

   ```bash
   pnpm typecheck
   pnpm build
   ```

3. Run the scripted check:
   ```bash
   ./verify.sh
   ```

## Production Installation

To install in a real external project, you would use:

```bash
pnpm add @mission-platform/components @mission-platform/tokens
```

Or, if testing locally with tarballs:

1. `pnpm pack` in `packages/components` and `packages/tokens`.
2. `pnpm add ../../packages/ui/components/mission-platform-components-1.0.0.tgz` etc.

# @mission-platform/service-monitor

A service-monitoring application built with [RedwoodSDK](https://rwsdk.com) — a
React framework for Cloudflare. All monitoring runs **on the server**: a
Durable Object performs scheduled checks on the edge (using several probe types,
not just HTTP) and stores every result in an embedded SQLite database that acts
as a **time-series store**. The browser only renders a React dashboard whose
live updates are driven by **RxJS** streams and whose charts are drawn with
**D3**. Monitors are configured at runtime (on their own `/monitors` route) and
each keeps its own cadence. The UI is assembled entirely from the platform's
shared `@mission-platform/*` packages.

## Architecture

```
                 ┌────────────────────────────────────────────┐
  Browser        │            Cloudflare Worker                │
  ┌───────────┐  │  ┌───────────────┐   ┌────────────────────┐ │
  │  React +  │  │  │  worker.tsx   │   │ MonitorDurableObject│ │
  │   RxJS    │──┼─▶│  (RedwoodSDK) │──▶│  • alarm loop       │ │
  │ dashboard │  │  │  routes + RSC │   │  • fetch() probes   │ │
  └───────────┘  │  └───────────────┘   │  • SQLite time-series│ │
       ▲         │        │             └────────────────────┘ │
       │  poll   │        │ JSON                                │
       └─────────┼────────┘  /api/services, /api/metrics        │
                 └────────────────────────────────────────────┘
```

- **Server-side monitoring** — `MonitorDurableObject` runs a Durable Object
  alarm that fires whenever the next monitor is **due**, probes only the
  monitors whose interval has elapsed, classifies the result
  (`up` / `degraded` / `down`) and appends a sample to its SQLite `samples`
  table. Old samples are pruned beyond `MONITOR_RETENTION_HOURS`.
- **Per-monitor cadence** — every monitor may set its own `intervalSeconds`;
  the alarm always re-arms to the soonest-due monitor (or speed test), so a
  15-second check and a 2-minute check coexist without polling everything on a
  single global timer. Monitors without their own interval fall back to
  `MONITOR_INTERVAL_SECONDS`.
- **Runtime configuration** — monitor definitions live in a `monitors` SQLite
  table (seeded from `MONITOR_TARGETS`/defaults) and can be created, updated or
  removed at runtime through `POST` / `DELETE /api/monitors` and the dashboard's
  **Monitors** panel — no redeploy required.
- **Probe types** — HTTP is not the only metric. See [Monitor types](#monitor-types).
- **Time-series DB** — the Durable Object's embedded SQLite database. Each row
  is one `(service, ts, state, status, latency_ms, error)` data point.
- **RedwoodSDK server/client** — `src/worker.tsx` defines the app: JSON API
  routes plus a server-rendered dashboard document. The page is a React Server
  Component that seeds initial data straight from the Durable Object.
- **React + RxJS + D3 client** — `src/client/LiveDashboard.tsx` (`"use client"`)
  subscribes to RxJS streams (`servicesStream`, `metricsStream`, `speedStream`,
  `speedSeriesStream`) that poll the API. Stream values are bridged into React
  state with **`@mission-platform/rxjs`**'s `useObservable`, and
  `TimeSeriesChart` draws latency/throughput with **`@mission-platform/d3`**'s
  `useD3` hook (+ its margin helpers).
- **Two routes** — `/` is the read-only live dashboard; `/monitors`
  (`MonitorsView`) is a dedicated runtime monitor-management page. Both are
  server components that seed initial data from the Durable Object and wrap the
  interactive tree in `AppProviders` (the `@mission-platform/i18n` React
  provider).

## Design system

The app consumes the platform's shared packages instead of bespoke UI. Every one of them is imported with a
**bare specifier** — React is selected once, not per import: `tsconfig.app.json` / `tsconfig.node.json` set
`"customConditions": ["mp:react"]`, and `vite.config.ts` prepends `mp:react` to `resolve.conditions` in every
environment (client, ssr, worker), so each package's `mp:react` export condition wins.

| Package                                       | Used for                                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `@mission-platform/rxjs`                      | `useObservable` — RxJS streams → React state.                                                            |
| `@mission-platform/d3`                        | `useD3` + margin helpers powering `TimeSeriesChart`.                                                     |
| `@mission-platform/components`                | `Typography`, `Badge`, `Button`, `Spinner`, `Card` (re-typed for React children in `src/client/mp.tsx`). |
| `@mission-platform/icons`                     | Inline SVG icons (globe, clock, refresh, trash, plus, …).                                                |
| `@mission-platform/layouts`                   | `Container` page shell.                                                                                  |
| `@mission-platform/i18n`                      | All UI strings (`createAppI18n`, `useI18n`) under the `mp.service-monitor` namespace.                    |
| `@mission-platform/seo` (`/meta`, `/json-ld`) | Server `<head>` metadata + Schema.org JSON-LD in `Document.tsx`.                                         |
| `@mission-platform/tokens`                    | Chart accent colour from the design tokens.                                                              |
| `@mission-platform/breakpoints/core`          | Responsive chart width via `maxMediaQuery` (framework-neutral entry).                                    |

> The `rxjs`/`d3` React builds are generated from a single write-once source by
> `@mission-platform/vite-plugin-forge`'s hook-library compiler; the `mp:react`
> condition is what routes the bare import to them. `seo` keeps genuine
> feature subpaths (`/meta`, `/json-ld`) and `breakpoints/core` is its
> framework-neutral entry, so no Vue is pulled into this React worker.

## Monitor types

Each monitor has a `type` that selects how it is probed:

| Type          | What it checks                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `http`        | Plain request to `url`, classified by HTTP status code and latency.                                                                   |
| `json`        | Fetches a JSON endpoint (`/health`, `/live`, …) and optionally asserts that `jsonPath` equals `expect`.                               |
| `graphql`     | `POST`s a `query` to `url` and fails on transport errors or a populated `errors` array.                                               |
| `dns`         | Resolves `host` (record `recordType`, default `A`) over Cloudflare DNS-over-HTTPS.                                                    |
| `tcp`         | Opens a raw TCP connection to `host:port` (via `cloudflare:sockets`) and times the handshake.                                         |
| `mqtt`        | TCP reachability of an MQTT broker `host:port` (default port `1883`).                                                                 |
| `udp` / `ntp` | Present for configuration, but **not supported** on the Workers runtime (no outbound UDP); they degrade gracefully to a stored error. |

## Speed testing

In addition to health checks, the app runs **network speed tests on the server**
against three providers and stores each result in a second SQLite time series
(`speed_samples`):

| Provider   | How it is measured                                                                       |
| ---------- | ---------------------------------------------------------------------------------------- |
| Cloudflare | `speed.cloudflare.com` `__down` (download) and `__up` (upload) endpoints.                |
| Fast.com   | Scrapes the Netflix API token, requests a measurement target, downloads a bounded range. |
| Speedtest  | Ookla `speedtest.net` server list, then a sized download from the chosen server.         |

Speed tests run on their own cadence (`SPEED_TEST_INTERVAL_SECONDS`, heavier
than health checks) via the same Durable Object alarm, and can also be triggered
on demand from the dashboard's **Run test** button (`POST /api/speed/run`).
Each provider degrades gracefully: a failed test is stored as a result with an
`error` message rather than breaking the run.

The dashboard's speed section charts the selected provider's **download
throughput over time** (a D3 line/area chart fed by `GET /api/speed/series`);
click a provider card to switch the charted series.

## Configuration

Set in `wrangler.jsonc` under `vars` (or as environment variables):

| Variable                      | Default    | Description                                                                                                                                                      |
| ----------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONITOR_TARGETS`             | `""`       | JSON array of monitor configs (`{ id, name, type, url \| host, intervalSeconds, … }`), used to **seed** the runtime `monitors` table. Empty → built-in defaults. |
| `MONITOR_INTERVAL_SECONDS`    | `30`       | Default interval for monitors without their own `intervalSeconds`.                                                                                               |
| `MONITOR_RETENTION_HOURS`     | `24`       | How long individual samples are retained.                                                                                                                        |
| `SPEED_TEST_ENABLED`          | `true`     | Set to `"false"` to disable scheduled speed tests.                                                                                                               |
| `SPEED_TEST_INTERVAL_SECONDS` | `300`      | Interval between scheduled speed tests.                                                                                                                          |
| `SPEED_TEST_BYTES`            | `10000000` | Payload size for each download measurement.                                                                                                                      |

Administrative API operations require a bearer token. Provision the token as a
Worker secret (not a `vars` value):

```bash
pnpm --filter @mission-platform/service-monitor exec wrangler secret put MONITOR_API_TOKEN
```

Send it as `Authorization: Bearer <token>` when calling monitor CRUD, incident
or maintenance mutations, `POST /api/check`, or `POST /api/speed/run`. The
Worker fails closed with `401` when the secret is missing or the credential is
invalid. Read-only status and speed-report endpoints remain public for the
dashboard; monitor, incident, and maintenance APIs are administrative.

## Development & Workflows

```bash
# Local development (Vite + Cloudflare runtime)
pnpm exec turbo run dev --filter=@mission-platform/service-monitor
# or
pnpm --filter @mission-platform/service-monitor dev

# Type-check and build
pnpm exec turbo run build --filter=@mission-platform/service-monitor

# Preview local production build
pnpm --filter @mission-platform/service-monitor preview

# Regenerate Cloudflare binding types (writes worker-configuration.d.ts)
pnpm --filter @mission-platform/service-monitor types

# Deploy
pnpm --filter @mission-platform/service-monitor deploy            # production
pnpm --filter @mission-platform/service-monitor deploy:staging    # staging
```

## Available Scripts

| Command                                                    | Description                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `pnpm dev`                                                 | Starts local dev server with `@cloudflare/vite-plugin` runtime                        |
| `pnpm build`                                               | Compiles Worker bundle and static assets via Vite                                     |
| `pnpm preview`                                             | Previews production build output locally                                              |
| `pnpm types`                                               | Generates TypeScript definitions from Wrangler bindings (`worker-configuration.d.ts`) |
| `pnpm deploy`                                              | Deploys Worker to Cloudflare production environment                                   |
| `pnpm deploy:staging`                                      | Deploys Worker to Cloudflare staging environment                                      |
| `pnpm test`                                                | Runs tests using Vitest                                                               |
| `pnpm lint` / `pnpm lint:fix`                              | Lints codebase with ESLint                                                            |
| `pnpm lint:style` / `pnpm lint:style:fix`                  | Lints stylesheets with Stylelint                                                      |
| `pnpm format` / `pnpm format:write`                        | Validates or updates code formatting with Prettier                                    |
| `pnpm i18n:extract` / `pnpm i18n:types` / `pnpm i18n:lint` | i18n extraction, type generation, and validation                                      |

## HTTP API

| Route                                 | Description                                      |
| ------------------------------------- | ------------------------------------------------ |
| `GET /`                               | Server-rendered React dashboard.                 |
| `GET /monitors`                       | Server-rendered runtime monitor-management page. |
| `GET /api/services`                   | Rolled-up status for every monitored service.    |
| `GET /api/metrics?service=<id>`       | Raw time series for one service.                 |
| `GET /api/monitors`                   | Current runtime monitor configuration.           |
| `POST /api/monitors`                  | Create or update a monitor (JSON body).          |
| `DELETE /api/monitors?id=<id>`        | Remove a monitor and its stored samples.         |
| `POST /api/check`                     | Trigger an immediate server-side probe cycle.    |
| `GET /api/speed`                      | Rolled-up speed-test results per provider.       |
| `GET /api/speed/series?provider=<id>` | Raw speed time series for one provider.          |
| `POST /api/speed/run`                 | Trigger an immediate speed-test run.             |

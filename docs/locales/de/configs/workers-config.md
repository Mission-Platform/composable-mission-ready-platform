# Worker-Konfiguration und -Entwicklung

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> Englische Quelle: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> Sprache: Deutsch (de)

Dieses Dokument beschreibt die Cloudflare Workers im Mission Platform Monorepo, ihre TypeScript Einstiegspunkte und die
Konfigurationsdateien, mit denen sie ausgeführt oder bereitgestellt werden.

## Arbeiterinventar

Standalone-Worker-Pakete leben unter `workers/`:

| Arbeiter | Handler | Konfiguration | Zweck |
| :----- | :------ | :------------ | :------ |
| `api-proxy` | `workers/api-proxy/src/index.ts` | Keiner; als gebündeltes Paket verbraucht | Eingeschränkter schreibgeschützter API-Proxy |
| `email-sender` | `workers/email-sender/src/index.ts` | `workers/email-sender/wrangler.jsonc` | Von MailPit unterstützter E-Mail-Showcase-Worker |
| `forge-spa` | `workers/forge-spa/src/index.ts` | Keiner; als gebündeltes Paket verbraucht | `ASSETS`-binding SPA-Fallback-Handler |

Die bereitstellbaren Anwendungs-Worker sind:

| Bewerbung | Handler | Konfiguration |
| :---------- | :------ | :------------ |
| Website | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` |
| Meine Pflegenotizen | `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` |
| Servicemonitor | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` |

`api-proxy` Und `forge-spa` nicht eigenständig Wrangler Konfigurationsdateien: ihre `src/index.ts` Handler sind
gebündelt von `tsdown` und in der Anwendung referenziert Wrangler Konfigurationen oder eine aufwändige Bereitstellung.

## Build-System

Worker-Pakete verwenden `tsdown` zum Bündeln. Verwenden Sie die Paketaufgabe über Turborepo oder pnpm Dies gilt auch für Arbeitsbereichsabhängigkeiten
konsequent gelöst:

```bash
pnpm exec turbo run build --filter=@mission-platform/api-proxy
pnpm exec turbo run build --filter=@mission-platform/forge-spa
pnpm exec turbo run build --filter=@mission-platform/email-sender
```

Worker-Tests verwenden Vitest:

```bash
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/forge-spa test
```

Verwenden `@cloudflare/workers-types` für Handler- und Bindungstypen. Die vom E-Mail-Versender generierten verbindlichen Erklärungen sind
angeschrieben `workers/email-sender/src/worker-configuration.d.ts` durch seine `types` Skript.

## Konfiguration und lokale Entwicklung

Worker erhalten Laufzeitwerte über die `env` Objekt- und Cloudflare-Bindungen. Geben Sie keine Geheimnisse in die Nachverfolgung ein
`wrangler.jsonc` Dateien; verwenden `wrangler secret put` für sensible Werte.

Führen Sie für den eigenständigen E-Mail-Absender dessen Konfiguration aus Wrangler Entwicklungsserver aus dem Workspace-Paket:

```bash
pnpm --filter @mission-platform/email-sender dev
```

Für bereitstellbare Anwendungen verwenden Sie die Skripts in jedem App-Paket. Zum Beispiel die Website und My Care Notes Wrangler
Dateien bereitstellen `staging` Und `production` Umgebungen, während Service Monitor eine bereitstellt `staging` Umfeld:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev
```

## Einsatz

Bereitstellung aus dem Anwendungspaket, dessen `wrangler.jsonc` besitzt die Strecke und Umgebung:

```bash
pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

Die eigenständigen Worker-Pakete ohne Wrangler Konfiguration werden nicht direkt mit bereitgestellt `wrangler deploy`; bauen
ihre Handler und stellen sie über die verbrauchende Anwendungskonfiguration bereit.

## Best Practices

- Bündeln Sie Abhängigkeiten in der Worker-Ausgabe für eine vorhersehbare Edge-Ausführung.
- Benutzen Sie die `env` Objekt an übergeben `fetch` Handler statt globaler Prozessvariablen.
- Vermeiden Node.js-Integrationen, die von der Workers-Laufzeit nicht unterstützt werden, wie z `fs` Und `child_process`, in Worker-Handlern.
- Halten Sie die Worker-Bundles klein, um Kaltstarts zu minimieren und die Ressourcengrenzen von Cloudflare einzuhalten.

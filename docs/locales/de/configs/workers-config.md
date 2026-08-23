# Worker-Bereitstellungsverzeichnis

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/configs/workers-config.md: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> Sprache: Deutsch (de)

Die Dokumentation zur Worker-Implementierung gehört neben jeden veröffentlichbaren Worker:

- [`@mission-platform/api-proxy`](../../../../workers/api-proxy/docs/locales/de/index.md) – eingeschränkter schreibgeschützter API-Proxy.
- [`@mission-platform/email-sender`](../../../../workers/email-sender/docs/locales/de/index.md) – lokaler, von MailPit unterstützter Absender.
- [`@mission-platform/forge-spa`](../../../../workers/forge-spa/docs/locales/de/index.md) – geteilt `ASSETS` SPA-Fallback-Handler.

Auf dieser Projektseite wird nur die arbeitsbereichsübergreifende Bereitstellungskarte gespeichert. Arbeiter
Pakete besitzen ihre Handler-Verträge, Beispiele, Tests und Build-Anweisungen;
Anwendungspakete besitzen Routen, Domänen, Bindungen und Bereitstellung
Umgebungen.

## Anwendungsbereitstellungskarte

| Bewerbung | Handler | Konfiguration | Vermögenswerte |
| :---------- | :------ | :------------ | :----- |
| Website | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` | `apps/website/dist/`, gebunden als `ASSETS` |
| Meine Pflegenotizen | `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` | `apps/my-care-notes/dist/`, gebunden als `ASSETS` |
| Servicemonitor | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` | `apps/service-monitor/public/`, gebunden als `ASSETS` |
| Dokumente | Statische Vermögenswerte | `apps/docs/wrangler.jsonc` | `apps/docs/dist/` |

Website und My Care Notes verbrauchen den gemeinsamen Forge SPA-Worker. Servicemonitor
besitzt seinen Worker-Einstiegspunkt und die dauerhafte Objektbindung. Die Dokumentationsseite ist eine
statisch Vite Bereitstellung und hat keinen Worker-Einstiegspunkt; Storybook ist kein
Bereitstellungsziel.

Bereitstellung aus dem Anwendungspaket, dessen Wrangler Konfiguration besitzt die
Route und Umgebung. Halten Sie Geheimnisse aus der nachverfolgten Konfiguration und Nutzung fern
Geheimer Cloudflare-Speicher für sensible Werte. Siehe die anwendungsspezifischen
Bereitstellungsskripte und die paketlokalen Worker-Anleitungen für die Implementierung
Details.

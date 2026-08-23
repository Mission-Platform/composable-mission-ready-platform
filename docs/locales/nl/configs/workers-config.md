# Directory voor werknemersimplementatie

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/configs/workers-config.md: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> Taal: Nederlands (nl)

Documentatie over de implementatie van werknemers hoort bij elke publiceerbare werknemer:

- [`@mission-platform/api-proxy`](../../../../workers/api-proxy/docs/locales/nl/index.md) - beperkte alleen-lezen API-proxy.
- [`@mission-platform/email-sender`](../../../../workers/email-sender/docs/locales/nl/index.md) — lokale, door MailPit ondersteunde afzender.
- [`@mission-platform/forge-spa`](../../../../workers/forge-spa/docs/locales/nl/index.md) - gedeeld `ASSETS` SPA-fallback-handler.

Op deze projectpagina wordt alleen de implementatiekaart voor meerdere werkruimten bewaard. Werknemer
pakketten zijn eigenaar van hun afhandelingscontracten, voorbeelden, tests en bouwinstructies;
applicatiepakketten beschikken over eigen routes, domeinen, bindingen en implementatie
omgevingen.

## Applicatie-implementatiekaart

| Toepassing | Behandelaar | Configuratie | Activa |
| :---------- | :------ | :------------ | :----- |
| Website | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` | `apps/website/dist/`, gebonden als `ASSETS` |
| Mijn zorgnotities | `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` | `apps/my-care-notes/dist/`, gebonden als `ASSETS` |
| Servicemonitor | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` | `apps/service-monitor/public/`, gebonden als `ASSETS` |
| Documenten | Statische activa | `apps/docs/wrangler.jsonc` | `apps/docs/dist/` |

Website en My Care Notes verbruiken de gedeelde Forge SPA-werknemer. Servicemonitor
is eigenaar van het Worker-ingangspunt en de Sustainable Object-binding. De documentensite is een
statisch Vite implementatie en heeft geen Worker-ingangspunt; Verhalenboek is geen
inzetdoel.

Implementeren vanuit het toepassingspakket waarvan Wrangler configuratie is eigenaar van de
traject en omgeving. Houd geheimen buiten de bijgehouden configuratie en gebruik
Cloudflare geheime opslag voor gevoelige waarden. Zie toepassingsspecifiek
implementatiescripts en de pakket-lokale werkhandleidingen voor implementatie
details.

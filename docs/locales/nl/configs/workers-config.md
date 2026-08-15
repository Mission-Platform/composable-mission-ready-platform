# Configuratie en ontwikkeling van werknemers

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> Engelse bron: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> Taal: Nederlands (nl)

Dit document beschrijft de Cloudflare Workers in de Mission Platform monorepo, hun TypeScript toegangspunten, en de
configuratiebestanden die worden gebruikt om ze uit te voeren of te implementeren.

## Werknemersinventaris

Op zichzelf staande werkpakketten vallen onder `workers/`:

| Werknemer | Behandelaar | Configuratie | Doel |
| :----- | :------ | :------------ | :------ |
| `api-proxy` | `workers/api-proxy/src/index.ts` | Geen; geconsumeerd als gebundeld pakket | Beperkte alleen-lezen API-proxy |
| `email-sender` | `workers/email-sender/src/index.ts` | `workers/email-sender/wrangler.jsonc` | Door MailPit ondersteunde e-mailshowcasewerker |
| `forge-spa` | `workers/forge-spa/src/index.ts` | Geen; geconsumeerd als gebundeld pakket | `ASSETS`-bindende SPA fallback handler |

De inzetbare applicatiewerkers zijn:

| Toepassing | Behandelaar | Configuratie |
| :---------- | :------ | :------------ |
| Website | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` |
| Mijn zorgnotities | `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` |
| Servicemonitor | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` |

`api-proxy` En `forge-spa` heb geen standalone Wrangler configuratiebestanden: hun `src/index.ts` behandelaars zijn
gebundeld door `tsdown` en waarnaar wordt verwezen door de toepassing Wrangler configuraties of een veeleisende implementatie.

## Bouw systeem

Gebruikerpakketten gebruiken `tsdown` voor bundelen. Gebruik de pakkettaak via Turborepo of pnpm dus de afhankelijkheden van de werkruimte zijn dat wel
consistent opgelost:

```bash
pnpm exec turbo run build --filter=@mission-platform/api-proxy
pnpm exec turbo run build --filter=@mission-platform/forge-spa
pnpm exec turbo run build --filter=@mission-platform/email-sender
```

Werknemerstests gebruiken Vitest:

```bash
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/forge-spa test
```

Gebruik `@cloudflare/workers-types` voor handler- en bindingstypes. De gegenereerde bindende verklaringen van de afzender van de e-mail zijn
geschreven naar `workers/email-sender/src/worker-configuration.d.ts` door zijn `types` script.

## Configuratie en lokale ontwikkeling

Werknemers ontvangen runtimewaarden via de `env` object- en Cloudflare-bindingen. Plaats geen geheimen in bijgehouden
`wrangler.jsonc` bestanden; gebruik `wrangler secret put` voor gevoelige waarden.

Voor de zelfstandige e-mailafzender voert u het configuratieprogramma uit Wrangler ontwikkelingsserver uit het werkruimtepakket:

```bash
pnpm --filter @mission-platform/email-sender dev
```

Voor inzetbare toepassingen gebruikt u de scripts in elk app-pakket. Bijvoorbeeld de Website en Mijn Zorgnotities Wrangler
bestanden bieden `staging` En `production` omgevingen, terwijl Service Monitor een `staging` omgeving:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev
```

## Inzet

Implementeren vanuit het toepassingspakket waarvan `wrangler.jsonc` is eigenaar van de route en omgeving:

```bash
pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

De zelfstandige werkerpakketten zonder Wrangler configuratie worden niet rechtstreeks geïmplementeerd `wrangler deploy`; bouwen
hun handlers en implementeer ze via de verbruikende applicatieconfiguratie.

## Beste praktijken

- Bundel afhankelijkheden in de uitvoer van werknemers voor voorspelbare edge-uitvoering.
- Gebruik de `env` voorwerp doorgegeven aan de `fetch` handler in plaats van globale procesvariabelen.
- Voorkomen Node.js ingebouwde ins die niet worden ondersteund door de Workers-runtime, zoals `fs` En `child_process`, in arbeidershandlers.
- Houd de bundels van werknemers klein om koude starts te minimaliseren en binnen de limieten van Cloudflare-middelen te blijven.

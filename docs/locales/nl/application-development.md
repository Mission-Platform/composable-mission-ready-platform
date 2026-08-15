# Applicatieontwikkeling

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> Engelse bron: [docs/application-development.md](../../application-development.md)
> Taal: Nederlands (nl)

In deze handleiding wordt uitgelegd hoe u de applicaties kunt uitvoeren, testen en implementeren `apps/`. Applicaties zijn herbruikbaar
pakketten; gedeelde componenten, composables, hulpprogramma's en configuraties horen thuis in hun eigen werkruimte in plaats van daar te zijn
gekopieerd naar een app.

## Kies een applicatie

| Toepassing | Lokale ontwikkeling | Bouw | Implementatie |
|:---|:---|:---|:---|
| `@mission-platform/docs` | `pnpm --filter @mission-platform/docs dev` | `pnpm --filter @mission-platform/docs build` | Bekijk een voorbeeld of implementeer via de hostingwerker |
| `@mission-platform/website` | `pnpm --filter @mission-platform/website dev` | `pnpm --filter @mission-platform/website build` | `pnpm --filter @mission-platform/website deploy:staging` |
| `@mission-platform/my-care-notes` | `pnpm --filter @mission-platform/my-care-notes dev` | `pnpm --filter @mission-platform/my-care-notes build` | `pnpm --filter @mission-platform/my-care-notes deploy:staging` |
| `@mission-platform/service-monitor` | `pnpm --filter @mission-platform/service-monitor dev` | `pnpm --filter @mission-platform/service-monitor build` | `pnpm --filter @mission-platform/service-monitor deploy:staging` |
| `@mission-platform/storybook` | `pnpm --filter @mission-platform/storybook dev` | `pnpm --filter @mission-platform/storybook build` | Gebruik de geconfigureerde Storybook/Chromatic-workflow |

Het applicatiepakket is eigenaar van zijn Vite of Wrangler configuratie. Niet rennen `wrangler deploy` van een herbruikbare werknemer
pakket, tenzij dat pakket een eigen pakket heeft `wrangler.jsonc`.

## Ontwikkel een verandering

1. Start de doeltoepassing met het bijbehorende pakket `dev` script.
2. Breng herbruikbare wijzigingen aan `packages/` en app-specifieke compositiewijzigingen in `apps/<name>/`.
3. Bouw de gewijzigde applicatie en zijn afhankelijkheden:

```bash
   pnpm exec turbo run build --filter @mission-platform/<app>...
   ```

4. Voer tests, pluisjes, stijlcontroles en opmaak uit voor de getroffen werkruimte:

```bash
   pnpm exec turbo run test lint lint:style format --filter @mission-platform/<app>
   ```

Voor een gedeelde pakketwijziging vervangt u `<app>` met de pakketnaam en het gebruik `...` wanneer u afhankelijke werkruimten nodig heeft
opgenomen in de buildgrafiek.

## Statische documentatie en websitebouw

De documenten en websitetoepassingen gebruiken `vite-ssg`. Een productiebuild genereert statische routes vanuit de broninhoud en
lokale catalogi. Controleer de gegenereerde uitvoer met die van het pakket `preview` script:

```bash
pnpm --filter @mission-platform/docs build
pnpm --filter @mission-platform/docs preview

pnpm --filter @mission-platform/website build
pnpm --filter @mission-platform/website preview
```

Houd documentatie Markdown onder `docs/` en websiteberichten in de localecatalogus van de eigenaar. Voeg geen seconde toe
render-time kopie van beide bronnen.

## Ontwikkeling en implementatie van Cloudflare

Toepassingen met een `wrangler.jsonc` stel omgevingsbewuste opdrachten bloot:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev

pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

Gebruik `wrangler secret put` voor geheimen. Houd bindingen en niet-geheime standaardinstellingen binnen `wrangler.jsonc`en verifieer de
geselecteerde omgeving voordat u deze implementeert.

## Gerelateerde handleidingen

- [Ontwikkeling instellen](development-setup.md)
- [Structuur van de werkruimte](workspace-structure.md)
- [Bouw systeem](build-system.md)
- [Configuratie van werknemers](configs/workers-config.md)
- [Testen](testing.md)

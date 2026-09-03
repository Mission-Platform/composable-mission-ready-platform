# @mission-platform/theme

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/ui/theme/docs/index.md: [packages/ui/theme/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

`@mission-platform/theme` is eigenaar van het eenmalig beschrijfbare themaoppervlak dat is geëxtraheerd uit `@mission-platform/components`.

## Openbaar oppervlak

- `ForgeThemeToggle` schakelt de gedeelde licht-, donker- en automatische voorkeuren in.
- `ForgeThemeProvider` configureert de persistentie en geeft de themastatus weer via de scoped render prop.
- `ForgeThemeComposer` beheert scoped of globale `--mp-*`-tokenoverschrijvingen.
- Themawinkelcontracten omvatten `getThemeSnapshot`, `subscribeTheme`, `setTheme`, `toggleTheme`, `cycleTheme` en
  `configureTheme`.
- Composercontracten omvatten het samenvoegen van configuraties, attribuut-/tokenmutatie, conversie van CSS-variabelen en resethelpers.

Alle componenten en winkels gebruiken één pakket-lokale implementatie, zodat consumenten van providers, toggle en composer dit kunnen observeren
dezelfde runtimecontracten na raamwerkspecifieke Forge-compilatie.
